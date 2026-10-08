import { describe, expect, it } from 'vitest';
import { buildBoard } from '../src/board.js';
import { User } from '../src/models/User.js';
import { Walk } from '../src/models/Walk.js';
import { fixedNow, makeApp, signedIn } from './helpers.js';

const OLD = new Date('2026-09-01T00:00:00Z');

describe('buildBoard', () => {
  it("shows each member's week, today, and whether they kept last week's pact", () => {
    const members = [
      { _id: 'a', name: 'Asha', pactDaysPerWeek: 3, createdAt: OLD },
      { _id: 'r', name: 'Ravi', pactDaysPerWeek: 2, createdAt: OLD },
    ];
    const walks = [
      { userId: 'a', date: '2026-09-29' }, { userId: 'a', date: '2026-10-01' }, { userId: 'a', date: '2026-10-04' },
      { userId: 'a', date: '2026-10-08' },
      { userId: 'r', date: '2026-10-02' },
      { userId: 'r', date: '2026-10-05' }, { userId: 'r', date: '2026-10-07' },
    ];
    expect(buildBoard({ members, walks, today: '2026-10-08', meId: 'r' })).toEqual({
      week: { start: '2026-10-05', end: '2026-10-11' },
      members: [
        { id: 'a', name: 'Asha', isMe: false, pact: 3, thisWeek: ['2026-10-08'], walkedToday: true, lastWeek: { walks: 3, pact: 3, kept: true } },
        { id: 'r', name: 'Ravi', isMe: true, pact: 2, thisWeek: ['2026-10-05', '2026-10-07'], walkedToday: false, lastWeek: { walks: 1, pact: 2, kept: false } },
      ],
    });
  });

  it('says nothing about last week for someone who joined this week (IST)', () => {
    // 19:00 UTC on Sun 4 Oct is 12:30 AM IST on Mon 5 Oct: already this week.
    const members = [{ _id: 'n', name: 'Neha', pactDaysPerWeek: 4, createdAt: new Date('2026-10-04T19:00:00Z') }];
    expect(buildBoard({ members, walks: [], today: '2026-10-08', meId: 'n' }).members[0].lastWeek).toBeNull();
  });
});

describe('GET /api/groups/board', () => {
  it('builds the board from the database for the group you are in', async () => {
    const app = makeApp({ now: fixedNow('2026-10-08T12:00:00Z') });
    const asha = await signedIn(app);
    const ravi = await signedIn(app, { name: 'Ravi', email: 'ravi@example.com' });
    const { body } = await asha.agent.post('/api/groups').send({ name: 'Morning walkers' });
    await ravi.agent.post('/api/groups/join').send({ code: body.group.code });
    // Both signed up "weeks ago". createdAt is immutable through Mongoose, so set it on the raw collection.
    await User.collection.updateMany({}, { $set: { createdAt: OLD } });
    const add = (who, date) => Walk.create({ userId: who.user.id, date, quest: 'sky', checkedAt: new Date(`${date}T06:00:00Z`) });
    await Promise.all([
      add(asha, '2026-09-28'), add(asha, '2026-09-30'), add(asha, '2026-10-01'), add(asha, '2026-10-03'),
      add(asha, '2026-10-06'), add(asha, '2026-10-08'),
      add(ravi, '2026-10-02'), add(ravi, '2026-10-07'),
      add(ravi, '2026-09-20'), // two weeks back: not on the board
    ]);

    const res = await asha.agent.get('/api/groups/board');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      group: { name: 'Morning walkers', code: body.group.code },
      week: { start: '2026-10-05', end: '2026-10-11' },
      members: [
        { id: asha.user.id, name: 'Asha', isMe: true, pact: 4, thisWeek: ['2026-10-06', '2026-10-08'], walkedToday: true, lastWeek: { walks: 4, pact: 4, kept: true } },
        { id: ravi.user.id, name: 'Ravi', isMe: false, pact: 4, thisWeek: ['2026-10-07'], walkedToday: false, lastWeek: { walks: 1, pact: 4, kept: false } },
      ],
    });
  });

  it('answers 404 when you are not in a group', async () => {
    const { agent } = await signedIn(makeApp());
    const res = await agent.get('/api/groups/board');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'You are not in a group' });
  });
});
