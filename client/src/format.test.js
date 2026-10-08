import { describe, expect, it } from 'vitest';
import { historyWeeks, lastWeekLine } from './format.js';

describe('lastWeekLine', () => {
  it('uses the board wording', () => {
    expect(lastWeekLine({ walks: 4, pact: 4, kept: true })).toBe('Last week: kept the pact (4/4)');
    expect(lastWeekLine({ walks: 1, pact: 4, kept: false })).toBe('Last week: missed the pact (1/4)');
    expect(lastWeekLine(null)).toBe('New this week');
  });
});

describe('historyWeeks', () => {
  const walks = [
    { date: '2026-10-06', quest: 'water' },
    { date: '2026-10-08', quest: 'sky' },
    { date: '2026-09-29', quest: 'tree' },
    { date: '2026-08-10', quest: 'cat' }, // 9 weeks back: off the calendar
  ];
  const weeks = historyWeeks(walks, '2026-10-08', 2);

  it('gives 8 weeks, newest first, each Monday to Sunday', () => {
    expect(weeks).toHaveLength(8);
    expect(weeks[0].monday).toBe('2026-10-05');
    expect(weeks[7].monday).toBe('2026-08-17');
    expect(weeks[0].days.map((d) => d.date)).toEqual(['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11']);
  });

  it('marks walks, today and the future, and counts each week against the pact', () => {
    expect(weeks[0].days[1].walk).toEqual({ date: '2026-10-06', quest: 'water' });
    expect(weeks[0].days[3].isToday).toBe(true);
    expect(weeks[0].days[4].isFuture).toBe(true);
    expect(weeks[0]).toMatchObject({ walks: 2, kept: true });
    expect(weeks[1]).toMatchObject({ monday: '2026-09-28', walks: 1, kept: false });
    expect(weeks.reduce((n, w) => n + w.walks, 0)).toBe(3);
  });
});
