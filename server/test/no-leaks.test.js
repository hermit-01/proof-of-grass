import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { makeApp } from './helpers.js';

describe('passwordHash', () => {
  it('never appears in any response that carries a user', async () => {
    const app = makeApp();
    const bodies = [];
    const keep = (res) => {
      bodies.push(JSON.stringify(res.body));
      return res;
    };
    const asha = request.agent(app);
    keep(await asha.post('/api/auth/signup').send({ name: 'Asha', email: 'asha@example.com', password: 'walk-every-day' }));
    keep(await asha.post('/api/auth/login').send({ email: 'asha@example.com', password: 'walk-every-day' }));
    keep(await asha.get('/api/me'));
    keep(await asha.patch('/api/me').send({ pactDaysPerWeek: 3 }));
    const created = keep(await asha.post('/api/groups').send({ name: 'Walkers' }));
    const ravi = request.agent(app);
    keep(await ravi.post('/api/auth/signup').send({ name: 'Ravi', email: 'ravi@example.com', password: 'walk-every-day' }));
    keep(await ravi.post('/api/groups/join').send({ code: created.body.group.code }));
    keep(await asha.get('/api/groups/board'));

    expect(bodies).toHaveLength(8);
    for (const body of bodies) {
      expect(body).not.toContain('passwordHash');
      expect(body).not.toMatch(/\$2[aby]\$/);
    }
  });
});
