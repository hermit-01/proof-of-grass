// Runs the real photo check (CLIP vision, q8) and shared/decide.js on labelled photos, and tests the spec's bar:
//   0 wrong-quest passes · 0 passes on room/office/screen photos · 0 passes on selfies
//   · >= 90% of outdoor quest photos pass for their quest.
// Usage: npm run eval            -> table + verdict (exit 0 = bar met, 1 = not met, 2 = photos missing)
//        npm run eval -- --sweep -> also a grid of other thresholds, to read (never auto-applied)
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { AutoProcessor, CLIPVisionModelWithProjection, RawImage } from '@huggingface/transformers';
import { QUESTS } from '../shared/quests.js';
import { OUTDOOR_MIN, QUEST_MIN, decide, scoreImage } from '../shared/decide.js';

const MODEL = 'Xenova/clip-vit-base-patch32';
const GATED_INDOOR = ['room', 'office', 'screen'];
const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const truth = JSON.parse(fs.readFileSync(here('./truth.json'), 'utf8'));
const embeds = JSON.parse(fs.readFileSync(here('../client/public/embeds.json'), 'utf8'));

const missing = Object.keys(truth).filter((name) => !fs.existsSync(here(`./photos/${name}.jpg`)));
if (missing.length) {
  console.error(`Missing ${missing.length} photo(s) in eval/photos: ${missing.join(', ')}`);
  console.error('Fetch them with: powershell -ExecutionPolicy Bypass -File scripts/fetch-eval-photos.ps1');
  process.exit(2);
}

const processor = await AutoProcessor.from_pretrained(MODEL);
const vision = await CLIPVisionModelWithProjection.from_pretrained(MODEL, { dtype: 'q8' });
const rows = [];
for (const [name, label] of Object.entries(truth)) {
  const { image_embeds } = await vision(await processor(await RawImage.read(here(`./photos/${name}.jpg`))));
  const raw = Array.from(image_embeds.data);
  const n = Math.hypot(...raw);
  rows.push({ name, label, scores: scoreImage(raw.map((x) => x / n), embeds) });
}

const passesFor = (scores, thresholds) => QUESTS.filter((q) => decide(scores, [q], thresholds).pass);

function judge(thresholds = {}) {
  const wrong = [];
  const indoor = [];
  const knownLimit = [];
  const selfie = [];
  const mainMissed = [];
  let mainTotal = 0;
  for (const { name, label, scores } of rows) {
    const passes = passesFor(scores, thresholds);
    for (const q of passes) if (!label.visible.includes(q)) wrong.push(`${name}:${q}`);
    if (label.scene === 'in' && passes.length) {
      (GATED_INDOOR.includes(label.kind) ? indoor : knownLimit).push(`${name}:${passes.join('+')}`);
    }
    // A selfie never counts, even with grass or sky behind you: the photo has to be of the quest.
    if (label.kind === 'selfie' && passes.length) selfie.push(`${name}:${passes.join('+')}`);
    if (label.scene === 'out' && QUESTS.includes(label.main)) {
      mainTotal++;
      if (!passes.includes(label.main)) mainMissed.push(name);
    }
  }
  const mainPassed = mainTotal - mainMissed.length;
  const mainBar = Math.ceil(0.9 * mainTotal);
  const met = wrong.length === 0 && indoor.length === 0 && selfie.length === 0 && mainPassed >= mainBar;
  return { wrong, indoor, knownLimit, selfie, mainMissed, mainPassed, mainTotal, mainBar, met };
}

const pct = (x) => `${Math.round(x * 100)}%`;
console.log(`rule: outdoor >= ${OUTDOOR_MIN}; quest rank <= 2 and p >= ${QUEST_MIN}; 11 classes (8 quests + 3 decoys)\n`);
console.log(`${'photo'.padEnd(15)} ${'main'.padEnd(9)} ${'outdoor'.padStart(7)}  ${'top 3'.padEnd(38)} passes for`);
for (const { name, label, scores } of rows) {
  const top = scores.ranked.slice(0, 3).map((c) => `${c} ${pct(scores.probs[c])}`).join(', ');
  console.log(`${name.padEnd(15)} ${String(label.main ?? '-').padEnd(9)} ${pct(scores.pOut).padStart(7)}  ${top.padEnd(38)} ${passesFor(scores).join(' ') || '-'}`);
}
const r = judge();
console.log(`\nmain subject passed:        ${r.mainPassed}/${r.mainTotal} (bar ${r.mainBar})${r.mainMissed.length ? `   missed: ${r.mainMissed.join(' ')}` : ''}`);
console.log(`wrong-quest passes:         ${r.wrong.length} (bar 0) ${r.wrong.join(' ')}`);
console.log(`room/office/screen passes:  ${r.indoor.length} (bar 0) ${r.indoor.join(' ')}`);
console.log(`selfie passes:              ${r.selfie.length} (bar 0) ${r.selfie.join(' ')}`);
console.log(`known limit (indoor plant/dog passed): ${r.knownLimit.join(' ') || 'none'}`);
console.log(r.met ? '\nBAR MET' : '\nBAR NOT MET');

if (process.argv.includes('--sweep')) {
  console.log('\nsweep: rows = outdoorMin, columns = questMin; cell = main passed / wrong / indoor / selfie; * = bar met');
  for (const o of [0.25, 0.3, 0.35, 0.4, 0.45, 0.5]) {
    const cells = [0.1, 0.15, 0.2, 0.25, 0.3].map((q) => {
      const s = judge({ outdoorMin: o, questMin: q });
      return `${q.toFixed(2)}: ${String(s.mainPassed).padStart(2)}/${s.wrong.length}/${s.indoor.length}/${s.selfie.length}${s.met ? '*' : ' '}`;
    });
    console.log(`${o.toFixed(2)}   ${cells.join('   ')}`);
  }
}
process.exit(r.met ? 0 : 1);
