// Precomputes the text side of CLIP once, on the laptop, so the phone only needs the vision model.
// Writes client/public/embeds.json. Rerun after changing any prompt in shared/.
import fs from 'node:fs';
import { AutoTokenizer, CLIPTextModelWithProjection } from '@huggingface/transformers';
import { CLASSES, CLASS_PROMPTS } from '../shared/quests.js';
import { INDOOR_PROMPTS, OUTDOOR_PROMPTS } from '../shared/decide.js';

const MODEL = 'Xenova/clip-vit-base-patch32';
const DTYPE = 'q8';

const tokenizer = await AutoTokenizer.from_pretrained(MODEL);
const textModel = await CLIPTextModelWithProjection.from_pretrained(MODEL, { dtype: DTYPE });

async function embed(texts) {
  const { text_embeds } = await textModel(tokenizer(texts, { padding: true, truncation: true }));
  const dim = text_embeds.dims[1];
  return texts.map((_, i) => {
    const v = Array.from(text_embeds.data.slice(i * dim, (i + 1) * dim));
    const n = Math.hypot(...v);
    return v.map((x) => Number((x / n).toFixed(5)));
  });
}

const classVectors = await embed(CLASSES.map((c) => CLASS_PROMPTS[c]));
const out = {
  model: MODEL,
  dtype: DTYPE,
  prompts: { classes: CLASS_PROMPTS, outdoor: OUTDOOR_PROMPTS, indoor: INDOOR_PROMPTS },
  classes: Object.fromEntries(CLASSES.map((c, i) => [c, classVectors[i]])),
  outdoor: await embed(OUTDOOR_PROMPTS),
  indoor: await embed(INDOOR_PROMPTS),
};

const file = new URL('../client/public/embeds.json', import.meta.url);
fs.mkdirSync(new URL('.', file), { recursive: true });
fs.writeFileSync(file, JSON.stringify(out));
console.log(`wrote client/public/embeds.json (${fs.statSync(file).size} bytes)`);
