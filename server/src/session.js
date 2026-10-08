import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User } from './models/User.js';

export const COOKIE = 'pog_session';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const cookieOptions = (config) => ({ httpOnly: true, secure: config.secureCookies, sameSite: 'lax', path: '/' });

export function setSession(res, userId, config) {
  const token = jwt.sign({ sub: String(userId) }, config.jwtSecret, { expiresIn: '30d' });
  res.cookie(COOKIE, token, { ...cookieOptions(config), maxAge: THIRTY_DAYS_MS });
}

export function clearSession(res, config) {
  res.clearCookie(COOKIE, cookieOptions(config));
}

// Reads the session cookie and loads the user into req.user, or answers 401.
export function requireAuth(config) {
  return async (req, res, next) => {
    let userId;
    try {
      userId = jwt.verify(req.cookies?.[COOKIE] ?? '', config.jwtSecret, { algorithms: ['HS256'] }).sub;
    } catch {
      return res.status(401).json({ error: 'Please log in' });
    }
    const user = mongoose.isValidObjectId(userId) ? await User.findById(userId) : null;
    if (!user) return res.status(401).json({ error: 'Please log in' });
    req.user = user;
    next();
  };
}
