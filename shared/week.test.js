import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, isDateString, istDate, streakWeeks, walksInWeek, weekDates, weekStart } from './week.js';

describe('istDate', () => {
  it('turns over at midnight IST (18:30 UTC), not at UTC midnight', () => {
    expect(istDate(Date.UTC(2026, 9, 11, 18, 29, 59))).toBe('2026-10-11'); // Sun 11:59:59 PM IST
    expect(istDate(Date.UTC(2026, 9, 11, 18, 30, 0))).toBe('2026-10-12'); // Mon 12:00 AM IST
    expect(istDate(new Date('2026-10-08T12:00:00Z'))).toBe('2026-10-08');
  });
});

describe('weeks run Monday to Sunday', () => {
  it('finds the Monday of any day', () => {
    expect(weekStart('2026-10-11')).toBe('2026-10-05'); // Sunday belongs to the week before
    expect(weekStart('2026-10-12')).toBe('2026-10-12'); // Monday starts a new one
    expect(weekStart('2026-10-08')).toBe('2026-10-05');
  });

  it('lists the seven days', () => {
    expect(weekDates('2026-10-08')).toEqual(['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11']);
  });

  it('counts the walks inside one week only', () => {
    expect(walksInWeek(['2026-10-04', '2026-10-05', '2026-10-11', '2026-10-12'], '2026-10-08')).toBe(2);
  });
});

describe('date strings', () => {
  it('accepts only real dates written YYYY-MM-DD', () => {
    expect(isDateString('2026-10-08')).toBe(true);
    expect(isDateString('2026-02-30')).toBe(false);
    expect(isDateString('2026-13-01')).toBe(false);
    expect(isDateString('2026-1-8')).toBe(false);
    expect(isDateString(20261008)).toBe(false);
    expect(isDateString(undefined)).toBe(false);
  });

  it('adds days across month and year ends, and measures gaps', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(daysBetween('2026-10-06', '2026-10-08')).toBe(2);
    expect(daysBetween('2026-10-09', '2026-10-08')).toBe(-1);
  });
});

describe('streakWeeks', () => {
  // pact 2: week of 21 Sep has 2 walks, week of 28 Sep has 3, this week (5 Oct) has 1 so far.
  const walks = ['2026-09-22', '2026-09-24', '2026-09-28', '2026-09-30', '2026-10-02', '2026-10-06'];

  it('counts back through kept weeks; an unfinished week does not break the streak', () => {
    expect(streakWeeks(walks, 2, '2026-10-08')).toBe(2);
  });
  it('includes this week once it is kept', () => {
    expect(streakWeeks([...walks, '2026-10-07'], 2, '2026-10-08')).toBe(3);
  });
  it('stops at the first missed week', () => {
    expect(streakWeeks(walks, 3, '2026-10-08')).toBe(1);
    expect(streakWeeks(['2026-09-14', '2026-09-15', '2026-09-28', '2026-09-29'], 2, '2026-10-08')).toBe(1);
  });
  it('is 0 with no walks', () => {
    expect(streakWeeks([], 2, '2026-10-08')).toBe(0);
  });
});
