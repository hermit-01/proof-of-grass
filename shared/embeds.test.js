import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CLASSES, CLASS_PROMPTS } from './quests.js';
import { INDOOR_PROMPTS, OUTDOOR_PROMPTS } from './decide.js';

const file = new URL('../client/public/embeds.json', import.meta.url);

describe('client/public/embeds.json', () => {
  const embeds = JSON.parse(fs.readFileSync(file, 'utf8'));
  const norm = (v) => Math.hypot(...v);

  it('was made from the current prompts (rerun `npm run embeds` after changing one)', () => {
    expect(embeds.model).toBe('Xenova/clip-vit-base-patch32');
    expect(embeds.prompts).toEqual({ classes: CLASS_PROMPTS, outdoor: OUTDOOR_PROMPTS, indoor: INDOOR_PROMPTS });
  });

  it('has one unit-length 512-number vector per class and scene prompt', () => {
    expect(Object.keys(embeds.classes)).toEqual(CLASSES);
    const all = [...Object.values(embeds.classes), ...embeds.outdoor, ...embeds.indoor];
    expect(all).toHaveLength(11 + 7 + 9);
    for (const v of all) {
      expect(v).toHaveLength(512);
      expect(norm(v)).toBeCloseTo(1, 3);
    }
  });
});
