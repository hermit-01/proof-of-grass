import { Router } from 'express';
import { publicUser } from '../publicUser.js';
import { requireAuth } from '../session.js';
import { cleanName, validPact } from '../validate.js';

export function meRoutes(config) {
  const router = Router();
  router.use(requireAuth(config));

  router.get('/', async (req, res) => {
    res.json({ user: await publicUser(req.user) });
  });

  router.patch('/', async (req, res) => {
    const { name, pactDaysPerWeek } = req.body ?? {};
    if (name === undefined && pactDaysPerWeek === undefined) return res.status(400).json({ error: 'Nothing to update' });
    if (name !== undefined) {
      const clean = cleanName(name);
      if (!clean) return res.status(400).json({ error: 'Name must be 1 to 40 characters' });
      req.user.name = clean;
    }
    if (pactDaysPerWeek !== undefined) {
      if (!validPact(pactDaysPerWeek)) return res.status(400).json({ error: 'Pact must be a whole number of days from 1 to 7' });
      req.user.pactDaysPerWeek = pactDaysPerWeek;
    }
    await req.user.save();
    res.json({ user: await publicUser(req.user) });
  });

  return router;
}
