import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { makeApp, signedIn } from './helpers.js';

describe('PATCH /api/me', () => {
  it('updates the name and the pact, and keeps them', async () => {
    const { agent } = await signedIn(makeApp());
    const res = await agent.patch('/api/me').send({ name: ' Asha K ', pactDaysPerWeek: 5 });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ name: 'Asha K', pactDaysPerWeek: 5 });
    expect((await agent.get('/api/me')).body.user).toMatchObject({ name: 'Asha K', pactDaysPerWeek: 5 });
  });

  it.each([0, 8, '4', 3.5])('refuses the pact %j', async (pactDaysPerWeek) => {
    const { agent } = await signedIn(makeApp());
    const res = await agent.patch('/api/me').send({ pactDaysPerWeek });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Pact must be a whole number of days from 1 to 7' });
  });

  it('refuses a blank name and saves nothing from that request', async () => {
    const { agent } = await signedIn(makeApp());
    const res = await agent.patch('/api/me').send({ name: '  ', pactDaysPerWeek: 2 });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Name must be 1 to 40 characters' });
    expect((await agent.get('/api/me')).body.user.pactDaysPerWeek).toBe(4);
  });

  it('answers 400 when there is nothing to update', async () => {
    const { agent } = await signedIn(makeApp());
    const res = await agent.patch('/api/me').send({});
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Nothing to update' });
  });

  it('needs a login', async () => {
    expect((await request(makeApp()).patch('/api/me').send({ pactDaysPerWeek: 3 })).status).toBe(401);
  });
});
