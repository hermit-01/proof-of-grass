import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { Walk } from '../src/models/Walk.js';
import { fixedNow, makeApp, signedIn } from './helpers.js';

// "Now" is 12:00 UTC on Thu 8 Oct 2026 (5:30 PM IST). Quests by date:
// 5 Oct grass/sky/tree · 6 Oct sky/water/grass · 7 Oct grass/tree/flower · 8 Oct sky/grass/tree · 9 Oct tree/bird/dog
const NOW = '2026-10-08T12:00:00Z';
const walk = (date, quest, checkedAt = `${date}T06:00:00.000Z`) => ({ date, quest, checkedAt });
const asha = (now = NOW) => signedIn(makeApp({ now: fixedNow(now) }));

describe('POST /api/walks', () => {
  it("records a walk for one of today's quests", async () => {
    const { agent } = await asha();
    const res = await agent.post('/api/walks').send(walk('2026-10-08', 'sky', '2026-10-08T11:59:00.000Z'));
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ walk: { date: '2026-10-08', quest: 'sky', checkedAt: '2026-10-08T11:59:00.000Z' } });
  });

  it('answers 409 for a second walk on the same day (the client counts that as saved)', async () => {
    const { agent } = await asha();
    await agent.post('/api/walks').send(walk('2026-10-08', 'sky'));
    const res = await agent.post('/api/walks').send(walk('2026-10-08', 'tree'));
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'You already have a walk for that day' });
  });

  it.each(['dog', 'road'])("refuses %s, which was not one of that day's quests", async (quest) => {
    const { agent } = await asha();
    const res = await agent.post('/api/walks').send(walk('2026-10-08', quest));
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'That was not one of the quests for that day' });
  });

  it('refuses a date in the future', async () => {
    const { agent } = await asha();
    const res = await agent.post('/api/walks').send(walk('2026-10-09', 'tree'));
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'That date is in the future' });
  });

  it('accepts a walk up to 2 days late (the offline queue), not 3', async () => {
    const { agent } = await asha();
    expect((await agent.post('/api/walks').send(walk('2026-10-06', 'water'))).status).toBe(201);
    const late = await agent.post('/api/walks').send(walk('2026-10-05', 'grass'));
    expect(late.status).toBe(400);
    expect(late.body).toEqual({ error: 'Walks can only be recorded up to 2 days later' });
  });

  it.each(['2026-10-8', '2026-02-30', 20261008, undefined])('refuses the date %j', async (date) => {
    const { agent } = await asha();
    const res = await agent.post('/api/walks').send({ date, quest: 'sky', checkedAt: '2026-10-08T06:00:00.000Z' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'date must be a real date written YYYY-MM-DD' });
  });

  it.each(['yesterday', undefined, 12345])('refuses checkedAt %j', async (checkedAt) => {
    const { agent } = await asha();
    const res = await agent.post('/api/walks').send({ date: '2026-10-08', quest: 'sky', checkedAt });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'checkedAt must be a date and time' });
  });

  it('uses the IST date: at 12:15 AM IST on 9 Oct, "today" is already 9 Oct', async () => {
    const { agent } = await asha('2026-10-08T18:45:00Z');
    expect((await agent.post('/api/walks').send(walk('2026-10-09', 'bird'))).status).toBe(201);
    expect((await agent.post('/api/walks').send(walk('2026-10-07', 'flower'))).status).toBe(201);
    expect((await agent.post('/api/walks').send(walk('2026-10-06', 'water'))).status).toBe(400);
  });

  it('needs a login', async () => {
    const res = await request(makeApp({ now: fixedNow(NOW) })).post('/api/walks').send(walk('2026-10-08', 'sky'));
    expect(res.status).toBe(401);
  });
});

describe('GET /api/walks', () => {
  it('returns only your own walks, oldest first, from 8 weeks back by default', async () => {
    const app = makeApp({ now: fixedNow(NOW) });
    const a = await signedIn(app);
    const r = await signedIn(app, { name: 'Ravi', email: 'ravi@example.com' });
    await a.agent.post('/api/walks').send(walk('2026-10-08', 'sky'));
    await a.agent.post('/api/walks').send(walk('2026-10-06', 'water'));
    await r.agent.post('/api/walks').send(walk('2026-10-08', 'tree'));
    const res = await a.agent.get('/api/walks');
    expect(res.status).toBe(200);
    expect(res.body.walks.map((w) => w.date)).toEqual(['2026-10-06', '2026-10-08']);
    expect(res.body.walks[0]).toEqual({ date: '2026-10-06', quest: 'water', checkedAt: '2026-10-06T06:00:00.000Z' });
    expect(res.body.from).toBe('2026-08-17'); // this Monday (5 Oct) and the 7 Mondays before it
  });

  it('?weeks=1 returns this week only', async () => {
    const { agent, user } = await asha();
    await Walk.create([
      { userId: user.id, date: '2026-10-01', quest: 'sky', checkedAt: new Date('2026-10-01T06:00:00Z') },
      { userId: user.id, date: '2026-10-06', quest: 'water', checkedAt: new Date('2026-10-06T06:00:00Z') },
    ]);
    const res = await agent.get('/api/walks?weeks=1');
    expect(res.body.walks.map((w) => w.date)).toEqual(['2026-10-06']);
    expect(res.body.from).toBe('2026-10-05');
  });

  it.each(['0', '53', 'abc', '2.5'])('refuses weeks=%s', async (weeks) => {
    const { agent } = await asha();
    const res = await agent.get(`/api/walks?weeks=${weeks}`);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'weeks must be a whole number from 1 to 52' });
  });
});
