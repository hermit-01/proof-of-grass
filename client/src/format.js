import { addDays, weekDates, weekStart } from '../../shared/week.js';

// "Last week: kept the pact (4/4)", "Last week: missed the pact (1/4)", or "New this week".
export function lastWeekLine(lastWeek) {
  if (!lastWeek) return 'New this week';
  return `Last week: ${lastWeek.kept ? 'kept the pact' : 'missed the pact'} (${lastWeek.walks}/${lastWeek.pact})`;
}

// The history calendar: the last `count` weeks, newest first, each Monday to Sunday with its walk count.
export function historyWeeks(walks, today, pact, count = 8) {
  const byDate = new Map(walks.map((w) => [w.date, w]));
  return Array.from({ length: count }, (_, i) => {
    const monday = addDays(weekStart(today), -7 * i);
    const days = weekDates(monday).map((date) => ({
      date,
      walk: byDate.get(date) ?? null,
      isToday: date === today,
      isFuture: date > today,
    }));
    const walked = days.filter((d) => d.walk).length;
    return { monday, days, walks: walked, kept: walked >= pact };
  });
}
