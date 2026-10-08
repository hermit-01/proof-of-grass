// IST calendar math. India has no daylight saving, so IST is always UTC+5:30.
// Dates are 'YYYY-MM-DD' strings, so they compare and sort as plain text.

const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const toMs = (date) => Date.parse(`${date}T00:00:00Z`);
const fromMs = (ms) => new Date(ms).toISOString().slice(0, 10);

// The IST calendar date of an instant.
export function istDate(instant = Date.now()) {
  return fromMs(new Date(instant).getTime() + IST_OFFSET_MS);
}

// True only for a real date written 'YYYY-MM-DD' ('2026-02-30' is false).
export function isDateString(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const ms = toMs(value);
  return !Number.isNaN(ms) && fromMs(ms) === value;
}

export function addDays(date, n) {
  return fromMs(toMs(date) + n * DAY_MS);
}

// to − from, in days.
export function daysBetween(from, to) {
  return Math.round((toMs(to) - toMs(from)) / DAY_MS);
}

// The Monday of the week that contains date.
export function weekStart(date) {
  const dayOfWeek = new Date(toMs(date)).getUTCDay(); // 0 = Sunday
  return addDays(date, -((dayOfWeek + 6) % 7));
}

// Monday to Sunday of the week that contains date.
export function weekDates(date) {
  const monday = weekStart(date);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function walksInWeek(walkDates, date) {
  const days = new Set(weekDates(date));
  return walkDates.filter((d) => days.has(d)).length;
}

// Weeks in a row the pact was kept, counting back from this week.
// This week only adds to the streak once it is kept; while it is still running it never breaks it.
export function streakWeeks(walkDates, pact, today) {
  if (walkDates.length === 0) return 0;
  const earliest = weekStart(walkDates.reduce((a, b) => (a < b ? a : b)));
  let monday = weekStart(today);
  let streak = walksInWeek(walkDates, monday) >= pact ? 1 : 0;
  for (monday = addDays(monday, -7); monday >= earliest && walksInWeek(walkDates, monday) >= pact; monday = addDays(monday, -7)) {
    streak++;
  }
  return streak;
}
