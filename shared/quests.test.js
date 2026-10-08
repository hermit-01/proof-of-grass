import { describe, expect, it } from 'vitest';
import { ANYWHERE, CLASSES, CLASS_LABELS, CLASS_PROMPTS, DECOYS, QUESTS, fnv1a, mulberry32, questsFor } from './quests.js';

describe('fnv1a', () => {
  it('matches the published 32-bit FNV-1a test vectors', () => {
    expect(fnv1a('')).toBe(2166136261);
    expect(fnv1a('a')).toBe(3826002220);
    expect(fnv1a('foobar')).toBe(3214735720);
  });
});

describe('mulberry32', () => {
  it('is deterministic for a seed and stays in [0, 1)', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 1000; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});

describe('questsFor', () => {
  it('gives everyone the same three quests on a date (pinned so a change is noticed)', () => {
    expect(questsFor('2026-10-08')).toEqual(['sky', 'grass', 'tree']);
    expect(questsFor('2026-10-09')).toEqual(['tree', 'bird', 'dog']);
    expect(questsFor('2026-10-10')).toEqual(['sky', 'flower', 'water']);
    expect(questsFor('2026-10-08')).toEqual(questsFor('2026-10-08'));
  });

  it('always picks 3 distinct quests, the first from the anywhere set, never a decoy', () => {
    const seen = new Set();
    const start = Date.parse('2026-01-01T00:00:00Z');
    for (let i = 0; i < 400; i++) {
      const date = new Date(start + i * 86_400_000).toISOString().slice(0, 10);
      const quests = questsFor(date);
      expect(new Set(quests).size).toBe(3);
      expect(ANYWHERE).toContain(quests[0]);
      for (const q of quests) {
        expect(QUESTS).toContain(q);
        expect(DECOYS).not.toContain(q);
        seen.add(q);
      }
    }
    expect([...seen].sort()).toEqual([...QUESTS].sort());
  });
});

describe('classes', () => {
  it('scores 8 quests then 3 decoys, each with a prompt and a label', () => {
    expect(CLASSES).toEqual([...QUESTS, 'road', 'building', 'person']);
    for (const c of CLASSES) {
      expect(CLASS_PROMPTS[c]).toMatch(/^a photo of /);
      expect(CLASS_LABELS[c]).toBeTruthy();
    }
    expect(CLASS_PROMPTS.water).toBe('a photo of a lake or river');
  });
});
