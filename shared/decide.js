// The photo check's rule, as plain code. The phone turns the photo into 512 numbers; this decides pass or fail.
// The thresholds live only here, and change only on `npm run eval` evidence.

import { CLASSES, CLASS_LABELS, questsFor } from './quests.js';
import { istDate } from './week.js';

export const OUTDOOR_MIN = 0.35;
export const QUEST_MIN = 0.2;
// CLIP's own logit scale: cosine similarities are multiplied by 100 before the softmax.
export const LOGIT_SCALE = 100;
// Fallback for browsers that ignore capture="environment" and let people pick an old photo.
export const MAX_PHOTO_AGE_MS = 10 * 60 * 1000;

export const OUTDOOR_PROMPTS = [
  'a photo taken outdoors',
  'an outdoor scene',
  'a photo of nature',
  'a street outside',
  'a photo of a park',
  'a landscape photo',
  'a photo taken outside in daylight',
];
export const INDOOR_PROMPTS = [
  'a photo taken indoors',
  'an indoor scene',
  'a photo of a room',
  'a photo of a computer screen',
  'a photo of a desk',
  'a photo of furniture',
  'a photo of a bedroom',
  'a photo of an office',
  'a photo of a wall',
];

function dot(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

export function softmax(xs) {
  const max = Math.max(...xs);
  const exps = xs.map((x) => Math.exp(x - max));
  const total = exps.reduce((a, b) => a + b, 0);
  return exps.map((x) => x / total);
}

// v: the image embedding, L2-normalised. embeds: client/public/embeds.json.
export function scoreImage(v, embeds) {
  const p = softmax(CLASSES.map((c) => LOGIT_SCALE * dot(v, embeds.classes[c])));
  const probs = Object.fromEntries(CLASSES.map((c, i) => [c, p[i]]));
  const ranked = [...CLASSES].sort((a, b) => probs[b] - probs[a]);
  const scene = softmax([...embeds.outdoor, ...embeds.indoor].map((e) => LOGIT_SCALE * dot(v, e)));
  const pOut = scene.slice(0, embeds.outdoor.length).reduce((a, b) => a + b, 0);
  return { probs, ranked, pOut };
}

// PASS if the photo looks outdoors AND one of today's quests is in the top 2 with p >= questMin.
export function decide({ probs, ranked, pOut }, today, { outdoorMin = OUTDOOR_MIN, questMin = QUEST_MIN } = {}) {
  if (pOut < outdoorMin) return { pass: false, reason: 'indoor' };
  const passing = today.filter((q) => ranked.indexOf(q) < 2 && probs[q] >= questMin);
  if (passing.length === 0) return { pass: false, reason: 'quest', top: ranked[0] };
  return { pass: true, quest: passing.reduce((best, q) => (probs[q] > probs[best] ? q : best)) };
}

export function messageFor(result, today, time) {
  if (result.pass) return `✓ Walk counted${time ? `, ${time}` : ''}, found: ${CLASS_LABELS[result.quest]}`;
  if (result.reason === 'indoor') return 'This looks indoors. Step outside!';
  const [a, b, c] = today.map((q) => CLASS_LABELS[q]);
  const lead = today.includes(result.top)
    ? `Not sure that's ${CLASS_LABELS[result.top]}`
    : `Looks more like ${CLASS_LABELS[result.top]}`;
  return `${lead}: get closer to ${a}, ${b} or ${c}.`;
}

// The whole judgement for a photo taken at checkedAt: its IST date decides which quests count.
export function judgePhoto(v, embeds, checkedAt) {
  const date = istDate(checkedAt);
  const today = questsFor(date);
  const scores = scoreImage(v, embeds);
  return { date, today, scores, result: decide(scores, today) };
}

export function isFreshPhoto(lastModified, now) {
  return now - lastModified <= MAX_PHOTO_AGE_MS;
}
