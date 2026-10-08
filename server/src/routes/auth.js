import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { User } from '../models/User.js';
import { publicUser } from '../publicUser.js';
import { clearSession, setSession } from '../session.js';
import { cleanEmail, cleanName, validPassword } from '../validate.js';

const TAKEN = 'That email already has an account';
const WRONG = 'Wrong email or password';

export function authRoutes(config) {
  const router = Router();
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.loginLimit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many login attempts. Try again in 15 minutes.' },
  });

  router.post('/signup', async (req, res) => {
    const name = cleanName(req.body?.name);
    const email = cleanEmail(req.body?.email);
    const password = req.body?.password;
    if (!name) return res.status(400).json({ error: 'Name must be 1 to 40 characters' });
    if (!email) return res.status(400).json({ error: 'Enter a valid email' });
    if (!validPassword(password)) return res.status(400).json({ error: 'Password must be 8 to 72 characters' });
    if (await User.exists({ email })) return res.status(409).json({ error: TAKEN });

    let user;
    try {
      user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, config.bcryptCost) });
    } catch (err) {
      if (err.code === 11000) return res.status(409).json({ error: TAKEN }); // two sign-ups raced
      throw err;
    }
    setSession(res, user._id, config);
    res.status(201).json({ user: await publicUser(user) });
  });

  router.post('/login', loginLimiter, async (req, res) => {
    const email = cleanEmail(req.body?.email);
    const password = req.body?.password;
    const user = email && typeof password === 'string' ? await User.findOne({ email }) : null;
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ error: WRONG });
    setSession(res, user._id, config);
    res.json({ user: await publicUser(user) });
  });

  router.post('/logout', (req, res) => {
    clearSession(res, config);
    res.json({ ok: true });
  });

  return router;
}
