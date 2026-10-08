import { Router } from 'express';
import { publicUser } from '../publicUser.js';
import { requireAuth } from '../session.js';

export function meRoutes(config) {
  const router = Router();
  router.use(requireAuth(config));

  router.get('/', async (req, res) => {
    res.json({ user: await publicUser(req.user) });
  });

  return router;
}
