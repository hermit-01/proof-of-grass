import { addDays, istDate, weekDates, weekStart } from '../../shared/week.js';

// The group board: each member's walks this week, whether they walked today, and how last week went.
// members: [{ _id, name, pactDaysPerWeek, createdAt }]; walks: [{ userId, date }] covering last week and this week.
export function buildBoard({ members, walks, today, meId }) {
  const thisWeek = weekDates(today);
  const lastWeek = weekDates(addDays(weekStart(today), -7));
  return {
    week: { start: thisWeek[0], end: thisWeek[6] },
    members: members.map((member) => {
      const id = String(member._id);
      const dates = new Set(walks.filter((w) => String(w.userId) === id).map((w) => w.date));
      const lastWeekWalks = lastWeek.filter((d) => dates.has(d)).length;
      // Someone who signed up this week had no pact last week, so "missed" would be unfair.
      const joinedThisWeek = istDate(member.createdAt) >= thisWeek[0];
      return {
        id,
        name: member.name,
        isMe: id === String(meId),
        pact: member.pactDaysPerWeek,
        thisWeek: thisWeek.filter((d) => dates.has(d)),
        walkedToday: dates.has(today),
        lastWeek: joinedThisWeek
          ? null
          : { walks: lastWeekWalks, pact: member.pactDaysPerWeek, kept: lastWeekWalks >= member.pactDaysPerWeek },
      };
    }),
  };
}
