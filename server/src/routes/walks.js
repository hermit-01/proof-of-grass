import { Router } from 'express';
import { Walk } from '../models/Walk.js';
import { requireAuth } from '../session.js';
import { questsFor } from '../../../shared/quests.js';
import { addDays, daysBetween, isDateString, istDate, weekStart } from '../../../shared/week.js';

// The offline queue can deliver a walk this many days after the IST date it was taken on.
export const MAX_DAYS_LATE = 2;
const walkJSON = (walk) => ({ date: walk.date, quest: walk.quest, checkedAt: walk.checkedAt.toISOString() });

export function walkRoutes(config) {
  const router = Router();
  router.use(requireAuth(config));

  router.post('/', async (req, res) => {
    const { date, quest, checkedAt } = req.body ?? {};
    if (!isDateString(date)) return res.status(400).json({ error: 'date must be a real date written YYYY-MM-DD' });
    const late = daysBetween(date, istDate(config.now()));
    if (late < 0) return res.status(400).json({ error: 'That date is in the future' });
    if (late > MAX_DAYS_LATE) return res.status(400).json({ error: 'Walks can only be recorded up to 2 days later' });
    if (!questsFor(date).includes(quest)) return res.status(400).json({ error: 'That was not one of the quests for that day' });
    const at = typeof checkedAt === 'string' ? new Date(checkedAt) : null;
    if (!at || Number.isNaN(at.getTime())) return res.status(400).json({ error: 'checkedAt must be a date and time' });

    try {
      const walk = await Walk.create({ userId: req.user._id, date, quest, checkedAt: at });
      res.status(201).json({ walk: walkJSON(walk) });
    } catch (err) {
      if (err.code === 11000) return res.status(409).json({ error: 'You already have a walk for that day' });
      throw err;
    }
  });

  router.get('/', async (req, res) => {
    const weeks = req.query.weeks === undefined ? 8 : Number(req.query.weeks);
    if (!Number.isInteger(weeks) || weeks < 1 || weeks > 52) {
      return res.status(400).json({ error: 'weeks must be a whole number from 1 to 52' });
    }
    const from = addDays(weekStart(istDate(config.now())), -7 * (weeks - 1));
    const walks = await Walk.find({ userId: req.user._id, date: { $gte: from } }).sort({ date: 1 });
    res.json({ walks: walks.map(walkJSON), from });
  });

  return router;
}
