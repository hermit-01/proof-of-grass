import { describe, expect, it } from 'vitest';
import { CLASSES } from './quests.js';
import {
  INDOOR_PROMPTS, MAX_PHOTO_AGE_MS, OUTDOOR_MIN, OUTDOOR_PROMPTS, QUEST_MIN,
  decide, isFreshPhoto, judgePhoto, messageFor, scoreImage,
} from './decide.js';

// Fixed score vectors: the named classes get these probabilities, the rest share what's left.
function scores(top, pOut) {
  const others = CLASSES.filter((c) => !(c in top));
  const rest = (1 - Object.values(top).reduce((a, b) => a + b, 0)) / others.length;
  const probs = Object.fromEntries(CLASSES.map((c) => [c, top[c] ?? rest]));
  const ranked = [...CLASSES].sort((a, b) => probs[b] - probs[a]);
  return { probs, ranked, pOut };
}
const TODAY = ['tree', 'bird', 'dog'];

describe('decide', () => {
  it('passes the main subject', () => {
    expect(decide(scores({ tree: 0.8 }, 0.7), TODAY)).toEqual({ pass: true, quest: 'tree' });
  });

  it('passes a quest in second place with at least QUEST_MIN (his real phone photo: building 46%, tree 29%)', () => {
    expect(decide(scores({ building: 0.46, tree: 0.29 }, 0.6), TODAY)).toEqual({ pass: true, quest: 'tree' });
  });

  it('fails a quest in third place, however high its score', () => {
    expect(decide(scores({ building: 0.4, person: 0.35, tree: 0.21 }, 0.6), TODAY)).toEqual({ pass: false, reason: 'quest', top: 'building' });
  });

  it('fails a second-place quest under QUEST_MIN and passes one exactly at it', () => {
    expect(decide(scores({ building: 0.7, tree: QUEST_MIN - 0.01 }, 0.6), TODAY).pass).toBe(false);
    expect(decide(scores({ building: 0.5, tree: QUEST_MIN }, 0.6), TODAY)).toEqual({ pass: true, quest: 'tree' });
  });

  it('fails an indoor photo before looking at quests, and passes exactly at OUTDOOR_MIN', () => {
    expect(decide(scores({ tree: 0.9 }, OUTDOOR_MIN - 0.01), TODAY)).toEqual({ pass: false, reason: 'indoor' });
    expect(decide(scores({ tree: 0.9 }, OUTDOOR_MIN), TODAY)).toEqual({ pass: true, quest: 'tree' });
  });

  it('reports the best of several passing quests', () => {
    expect(decide(scores({ sky: 0.45, tree: 0.35 }, 0.9), ['tree', 'sky', 'grass'])).toEqual({ pass: true, quest: 'sky' });
  });

  it('never passes a decoy, even when it is the top class', () => {
    expect(decide(scores({ person: 0.9 }, 0.6), TODAY)).toEqual({ pass: false, reason: 'quest', top: 'person' });
    expect(decide(scores({ road: 0.5, building: 0.4 }, 0.8), TODAY)).toEqual({ pass: false, reason: 'quest', top: 'road' });
  });

  it('accepts other thresholds (for the eval sweep)', () => {
    expect(decide(scores({ tree: 0.9 }, 0.3), TODAY, { outdoorMin: 0.25 }).pass).toBe(true);
    expect(decide(scores({ building: 0.7, tree: 0.15 }, 0.6), TODAY, { questMin: 0.1 }).pass).toBe(true);
  });
});

describe('messageFor', () => {
  it('uses the spec wording', () => {
    expect(messageFor({ pass: true, quest: 'tree' }, TODAY, '6:42 pm')).toBe('✓ Walk counted, 6:42 pm, found: a tree');
    expect(messageFor({ pass: true, quest: 'sky' }, ['sky', 'grass', 'tree'])).toBe('✓ Walk counted, found: the sky');
    expect(messageFor({ pass: false, reason: 'indoor' }, TODAY)).toBe('This looks indoors. Step outside!');
    expect(messageFor({ pass: false, reason: 'quest', top: 'person' }, TODAY)).toBe('Looks more like a person: get closer to a tree, a bird or a dog.');
  });

  it('does not say "looks more like a tree" when a tree was a quest but scored too low', () => {
    expect(messageFor({ pass: false, reason: 'quest', top: 'tree' }, TODAY)).toBe("Not sure that's a tree: get closer to a tree, a bird or a dog.");
  });
});

// Synthetic embeddings: each class and scene prompt is its own axis.
const DIM = 32;
const axis = (i) => Array.from({ length: DIM }, (_, j) => (j === i ? 1 : 0));
const EMBEDS = {
  classes: Object.fromEntries(CLASSES.map((c, i) => [c, axis(i)])),
  outdoor: OUTDOOR_PROMPTS.map((_, i) => axis(11 + i)),
  indoor: INDOOR_PROMPTS.map((_, i) => axis(18 + i)),
};
const birdOutdoors = axis(CLASSES.indexOf('bird')).map((x, j) => (j === 11 ? 1 : x) / Math.SQRT2);

describe('scoreImage', () => {
  it('softmaxes cosines x100 over the 11 classes and sums the outdoor share of the 16 scene prompts', () => {
    const s = scoreImage(birdOutdoors, EMBEDS);
    expect(s.ranked[0]).toBe('bird');
    expect(s.probs.bird).toBeGreaterThan(0.99);
    expect(s.pOut).toBeGreaterThan(0.99);
    expect(Object.values(s.probs).reduce((a, b) => a + b)).toBeCloseTo(1, 10);
  });
  it('has 7 outdoor and 9 indoor scene prompts', () => {
    expect(OUTDOOR_PROMPTS).toHaveLength(7);
    expect(INDOOR_PROMPTS).toHaveLength(9);
  });
});

describe('judgePhoto', () => {
  it("judges a photo by the quests of the IST date it was taken on, even just after midnight", () => {
    // 18:31 UTC on 8 Oct is 12:01 AM IST on 9 Oct, when the quests are tree, bird, dog.
    const after = judgePhoto(birdOutdoors, EMBEDS, Date.parse('2026-10-08T18:31:00Z'));
    expect(after.date).toBe('2026-10-09');
    expect(after.today).toEqual(['tree', 'bird', 'dog']);
    expect(after.result).toEqual({ pass: true, quest: 'bird' });
    // Two minutes earlier it is still 8 Oct (sky, grass, tree), and a bird is not a quest.
    const before = judgePhoto(birdOutdoors, EMBEDS, Date.parse('2026-10-08T18:29:00Z'));
    expect(before.date).toBe('2026-10-08');
    expect(before.result).toEqual({ pass: false, reason: 'quest', top: 'bird' });
  });
});

describe('isFreshPhoto', () => {
  it('accepts photos up to 10 minutes old, and clock skew into the future', () => {
    expect(isFreshPhoto(0, MAX_PHOTO_AGE_MS)).toBe(true);
    expect(isFreshPhoto(0, MAX_PHOTO_AGE_MS + 1)).toBe(false);
    expect(isFreshPhoto(5_000, 0)).toBe(true);
  });
});
