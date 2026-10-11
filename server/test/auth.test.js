import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';
import { SECRET, makeApp, signedIn } from './helpers.js';

const ASHA = { name: 'Asha', email: 'asha@example.com', password: 'walk-every-day' };
const sessionCookie = (res) => (res.headers['set-cookie'] ?? []).find((c) => c.startsWith('pog_session=')) ?? '';

describe('POST /api/auth/signup', () => {
  it('creates the user, tidies the name and email, and sets the session cookie', async () => {
    const res = await request(makeApp()).post('/api/auth/signup').send({ name: '  Asha ', email: ' Asha@Example.COM ', password: 'walk-every-day' });
    expect(res.status).toBe(201);
    expect(res.body.user).toEqual({ id: expect.any(String), name: 'Asha', email: 'asha@example.com', pactDaysPerWeek: 4, group: null });
    const cookie = sessionCookie(res);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
    expect(cookie).toMatch(/Path=\//);
    expect(cookie).toMatch(/Max-Age=2592000/);
    expect(cookie).not.toMatch(/Secure/);
  });

  it('marks the cookie Secure in production', async () => {
    const res = await request(makeApp({ secureCookies: true })).post('/api/auth/signup').send(ASHA);
    expect(sessionCookie(res)).toMatch(/Secure/);
  });

  it('stores a bcrypt hash, never the password', async () => {
    await request(makeApp()).post('/api/auth/signup').send(ASHA);
    const user = await User.findOne({ email: ASHA.email });
    expect(user.passwordHash).toMatch(/^\$2[aby]\$04\$/);
    expect(user.passwordHash).not.toContain(ASHA.password);
  });

  it('hashes at cost 12 by default', async () => {
    await request(createApp({ jwtSecret: SECRET })).post('/api/auth/signup').send(ASHA);
    expect((await User.findOne({ email: ASHA.email })).passwordHash).toMatch(/^\$2[aby]\$12\$/);
  });

  it('answers 409 when the email is taken, in any case', async () => {
    const app = makeApp();
    await request(app).post('/api/auth/signup').send(ASHA);
    const res = await request(app).post('/api/auth/signup').send({ ...ASHA, email: 'ASHA@example.com' });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'That email already has an account' });
  });

  it.each([
    [{ ...ASHA, name: '   ' }, 'Name must be 1 to 40 characters'],
    [{ ...ASHA, name: 'x'.repeat(41) }, 'Name must be 1 to 40 characters'],
    [{ ...ASHA, email: 'not-an-email' }, 'Enter a valid email'],
    [{ ...ASHA, password: 'short12' }, 'Password must be 8 to 72 characters'],
    [{ ...ASHA, password: 'é'.repeat(37) }, 'Password must be 8 to 72 characters'], // 37 chars but 74 bytes
  ])('rejects %j with 400', async (body, error) => {
    const res = await request(makeApp()).post('/api/auth/signup').send(body);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error });
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with the right password, whatever the email case', async () => {
    const app = makeApp();
    await request(app).post('/api/auth/signup').send(ASHA);
    const res = await request(app).post('/api/auth/login').send({ email: 'ASHA@example.com', password: ASHA.password });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('asha@example.com');
    expect(sessionCookie(res)).toMatch(/^pog_session=[^;]+;/);
  });

  it('gives the same 401 for a wrong password and an unknown email', async () => {
    const app = makeApp();
    await request(app).post('/api/auth/signup').send(ASHA);
    const wrong = await request(app).post('/api/auth/login').send({ email: ASHA.email, password: 'not-my-password' });
    const unknown = await request(app).post('/api/auth/login').send({ email: 'nobody@example.com', password: 'not-my-password' });
    expect([wrong.status, unknown.status]).toEqual([401, 401]);
    expect(wrong.body).toEqual({ error: 'Wrong email or password' });
    expect(unknown.body).toEqual(wrong.body);
  });

  // The chain Render really sends (measured on the live app, 11 Oct): "visitor, Cloudflare, Render's balancer".
  const viaRender = (visitor) => `${visitor}, 172.69.122.175, 10.31.197.151`;

  it("limits attempts per visitor IP, not for everyone behind Render's proxies", async () => {
    const app = makeApp({ loginLimit: 3 });
    const attempt = (xff) => request(app).post('/api/auth/login').set('X-Forwarded-For', xff).send({ email: 'nobody@example.com', password: 'not-my-password' });
    for (let i = 0; i < 3; i++) expect((await attempt(viaRender('203.0.113.7'))).status).toBe(401);
    const blocked = await attempt(viaRender('203.0.113.7'));
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ error: 'Too many login attempts. Try again in 15 minutes.' });
    expect((await attempt(viaRender('198.51.100.4'))).status).toBe(401);
  });

  it('does not let a visitor dodge the limit with a made-up X-Forwarded-For entry', async () => {
    const app = makeApp({ loginLimit: 3 });
    const attempt = (xff) => request(app).post('/api/auth/login').set('X-Forwarded-For', xff).send({ email: 'nobody@example.com', password: 'not-my-password' });
    for (let i = 0; i < 3; i++) expect((await attempt(viaRender('203.0.113.7'))).status).toBe(401);
    expect((await attempt(viaRender('9.9.9.9, 203.0.113.7'))).status).toBe(429);
  });

  it('allows 10 attempts per 15 minutes by default', async () => {
    const app = createApp({ jwtSecret: SECRET });
    const attempt = () => request(app).post('/api/auth/login').send({ email: 'nobody@example.com', password: 'not-my-password' });
    for (let i = 0; i < 10; i++) expect((await attempt()).status).toBe(401);
    expect((await attempt()).status).toBe(429);
  });
});

describe('sessions', () => {
  it('GET /api/me returns the logged-in user', async () => {
    const { agent, user } = await signedIn(makeApp());
    const res = await agent.get('/api/me');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ user });
  });

  it('logout clears the cookie, and the next request is 401', async () => {
    const { agent } = await signedIn(makeApp());
    const res = await agent.post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(sessionCookie(res)).toMatch(/Expires=Thu, 01 Jan 1970/);
    expect((await agent.get('/api/me')).status).toBe(401);
  });

  it('answers 401 with no cookie, a forged token, or a deleted user', async () => {
    const app = makeApp();
    const { user } = await signedIn(app);
    expect((await request(app).get('/api/me')).status).toBe(401);
    const forged = jwt.sign({ sub: user.id }, 'some-other-secret-that-is-32-chars-long');
    expect((await request(app).get('/api/me').set('Cookie', `pog_session=${forged}`)).status).toBe(401);
    const real = jwt.sign({ sub: user.id }, SECRET);
    expect((await request(app).get('/api/me').set('Cookie', `pog_session=${real}`)).status).toBe(200);
    await User.deleteOne({ _id: user.id });
    const gone = await request(app).get('/api/me').set('Cookie', `pog_session=${real}`);
    expect(gone.status).toBe(401);
    expect(gone.body).toEqual({ error: 'Please log in' });
  });
});
