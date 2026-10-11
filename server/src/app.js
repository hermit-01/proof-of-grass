import fs from 'node:fs';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import express from 'express';
import { authRoutes } from './routes/auth.js';
import { groupRoutes } from './routes/groups.js';
import { meRoutes } from './routes/me.js';
import { walkRoutes } from './routes/walks.js';

// options: { jwtSecret, secureCookies, bcryptCost, loginLimit, now, clientDist }. Routers receive it as `config`.
export function createApp(options = {}) {
  const config = { secureCookies: false, bcryptCost: 12, loginLimit: 10, now: () => new Date(), clientDist: null, ...options };
  if (!config.jwtSecret) throw new Error('createApp needs a jwtSecret');

  const app = express();
  app.disable('x-powered-by');
  // Requests reach the app through Cloudflare and Render's balancer, which send "visitor, Cloudflare, balancer"
  // (measured on the live app, 11 Oct). Trusting those 3 hops makes req.ip the visitor's own address,
  // which the login limit needs; anything a visitor adds to the header sits further left and is ignored.
  app.set('trust proxy', 3);
  app.use(express.json({ limit: '10kb' }));
  app.use(cookieParser());

  app.get('/api/health', (req, res) => res.json({ ok: true }));
  // TEMPORARY deploy check: is req.ip the visitor's own address behind Render's proxies? Removed after the check.
  app.get('/api/ip', (req, res) => res.json({ ip: req.ip, ips: req.ips, xff: req.get('x-forwarded-for') || null }));
  app.use('/api/auth', authRoutes(config));
  app.use('/api/me', meRoutes(config));
  app.use('/api/groups', groupRoutes(config));
  app.use('/api/walks', walkRoutes(config));
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

  const indexHtml = config.clientDist && path.join(config.clientDist, 'index.html');
  if (indexHtml && fs.existsSync(indexHtml)) {
    app.use(express.static(config.clientDist));
    // Every other GET is a page of the app: send the shell and let React Router pick the screen.
    app.get('/{*path}', (req, res) => res.sendFile(indexHtml));
  }

  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request too large' });
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  });

  return app;
}
