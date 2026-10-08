import { randomInt } from 'node:crypto';
import { Router } from 'express';
import { Group } from '../models/Group.js';
import { User } from '../models/User.js';
import { Walk } from '../models/Walk.js';
import { buildBoard } from '../board.js';
import { requireAuth } from '../session.js';
import { cleanName } from '../validate.js';
import { addDays, istDate, weekStart } from '../../../shared/week.js';

export const MAX_MEMBERS = 20;
// A-Z without I and O, so a code read aloud or copied from a screenshot can't be mistaken for 1 or 0.
export const CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

export function makeCode() {
  return Array.from({ length: 6 }, () => CODE_LETTERS[randomInt(CODE_LETTERS.length)]).join('');
}

const ALREADY_IN = 'You are already in a group. Leave it first.';
const groupJSON = (group) => ({ name: group.name, code: group.code });

export function groupRoutes(config) {
  const router = Router();
  router.use(requireAuth(config));

  router.post('/', async (req, res) => {
    if (req.user.groupId) return res.status(409).json({ error: ALREADY_IN });
    const name = cleanName(req.body?.name);
    if (!name) return res.status(400).json({ error: 'Group name must be 1 to 40 characters' });
    let group = null;
    for (let attempt = 0; attempt < 5 && !group; attempt++) {
      try {
        group = await Group.create({ name, code: makeCode(), createdBy: req.user._id });
      } catch (err) {
        if (err.code !== 11000) throw err; // a code clash: try another code
      }
    }
    if (!group) throw new Error('Could not find a free group code');
    req.user.groupId = group._id;
    await req.user.save();
    res.status(201).json({ group: groupJSON(group) });
  });

  router.post('/join', async (req, res) => {
    if (req.user.groupId) return res.status(409).json({ error: ALREADY_IN });
    const code = String(req.body?.code ?? '').replace(/\s+/g, '').toUpperCase();
    const group = await Group.findOne({ code });
    if (!group) return res.status(404).json({ error: 'No group has that code' });
    if ((await User.countDocuments({ groupId: group._id })) >= MAX_MEMBERS) {
      return res.status(409).json({ error: `That group is full (${MAX_MEMBERS} people)` });
    }
    req.user.groupId = group._id;
    await req.user.save();
    res.json({ group: groupJSON(group) });
  });

  router.post('/leave', async (req, res) => {
    const groupId = req.user.groupId;
    if (groupId) {
      req.user.groupId = null;
      await req.user.save();
      if ((await User.countDocuments({ groupId })) === 0) await Group.deleteOne({ _id: groupId });
    }
    res.json({ ok: true });
  });

  router.get('/board', async (req, res) => {
    const group = req.user.groupId ? await Group.findById(req.user.groupId) : null;
    if (!group) return res.status(404).json({ error: 'You are not in a group' });
    const members = await User.find({ groupId: group._id }).sort({ createdAt: 1, _id: 1 });
    const today = istDate(config.now());
    const monday = weekStart(today);
    const walks = await Walk.find({
      userId: { $in: members.map((m) => m._id) },
      date: { $gte: addDays(monday, -7), $lte: addDays(monday, 6) },
    });
    res.json({ group: groupJSON(group), ...buildBoard({ members, walks, today, meId: req.user._id }) });
  });

  return router;
}
