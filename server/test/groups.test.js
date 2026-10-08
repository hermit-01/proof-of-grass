import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { Group } from '../src/models/Group.js';
import { User } from '../src/models/User.js';
import { makeCode } from '../src/routes/groups.js';
import { makeApp, signedIn } from './helpers.js';

const CODE_RE = /^[A-HJ-NP-Z]{6}$/;
const ravi = { name: 'Ravi', email: 'ravi@example.com' };

describe('makeCode', () => {
  it('makes 6 letters from A-Z without I and O', () => {
    for (let i = 0; i < 500; i++) expect(makeCode()).toMatch(CODE_RE);
  });
});

describe('POST /api/groups', () => {
  it('creates a group, joins it, and shows it on /api/me', async () => {
    const { agent } = await signedIn(makeApp());
    const res = await agent.post('/api/groups').send({ name: ' Morning walkers ' });
    expect(res.status).toBe(201);
    expect(res.body.group).toEqual({ name: 'Morning walkers', code: expect.stringMatching(CODE_RE) });
    expect((await agent.get('/api/me')).body.user.group).toEqual(res.body.group);
  });

  it('answers 409 if you are already in a group', async () => {
    const { agent } = await signedIn(makeApp());
    await agent.post('/api/groups').send({ name: 'One' });
    const res = await agent.post('/api/groups').send({ name: 'Two' });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'You are already in a group. Leave it first.' });
  });

  it('refuses a blank name', async () => {
    const { agent } = await signedIn(makeApp());
    const res = await agent.post('/api/groups').send({ name: '' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Group name must be 1 to 40 characters' });
  });

  it('needs a login', async () => {
    expect((await request(makeApp()).post('/api/groups').send({ name: 'X' })).status).toBe(401);
  });
});

describe('POST /api/groups/join', () => {
  async function groupAndFriend() {
    const app = makeApp();
    const owner = await signedIn(app);
    const { body } = await owner.agent.post('/api/groups').send({ name: 'Morning walkers' });
    const friend = await signedIn(app, ravi);
    return { app, owner, friend, code: body.group.code };
  }

  it('joins by code', async () => {
    const { friend, code } = await groupAndFriend();
    const res = await friend.agent.post('/api/groups/join').send({ code });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ group: { name: 'Morning walkers', code } });
    expect((await friend.agent.get('/api/me')).body.user.group.code).toBe(code);
  });

  it('accepts the code typed in lower case with spaces', async () => {
    const { friend, code } = await groupAndFriend();
    const typed = ` ${code.slice(0, 3).toLowerCase()} ${code.slice(3).toLowerCase()} `;
    expect((await friend.agent.post('/api/groups/join').send({ code: typed })).status).toBe(200);
  });

  it('answers 404 for an unknown code', async () => {
    const { friend } = await groupAndFriend();
    const res = await friend.agent.post('/api/groups/join').send({ code: 'ZZZZZZ' });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'No group has that code' });
  });

  it('answers 409 if you are already in a group', async () => {
    const { owner, code } = await groupAndFriend();
    expect((await owner.agent.post('/api/groups/join').send({ code })).status).toBe(409);
  });

  it('answers 409 when the group already has 20 members', async () => {
    const { friend, code } = await groupAndFriend();
    const group = await Group.findOne({ code });
    await User.insertMany(Array.from({ length: 19 }, (_, i) => ({ name: `Walker ${i}`, email: `w${i}@example.com`, passwordHash: 'x', groupId: group._id })));
    const res = await friend.agent.post('/api/groups/join').send({ code });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'That group is full (20 people)' });
  });
});

describe('POST /api/groups/leave', () => {
  it('leaves the group and keeps it while others are in it', async () => {
    const app = makeApp();
    const owner = await signedIn(app);
    const { body } = await owner.agent.post('/api/groups').send({ name: 'Morning walkers' });
    const friend = await signedIn(app, ravi);
    await friend.agent.post('/api/groups/join').send({ code: body.group.code });
    const res = await owner.agent.post('/api/groups/leave');
    expect(res.status).toBe(200);
    expect((await owner.agent.get('/api/me')).body.user.group).toBeNull();
    expect(await Group.countDocuments()).toBe(1);
  });

  it('deletes the group when the last member leaves', async () => {
    const { agent } = await signedIn(makeApp());
    await agent.post('/api/groups').send({ name: 'Solo' });
    await agent.post('/api/groups/leave');
    expect(await Group.countDocuments()).toBe(0);
  });

  it('is fine when you are not in a group', async () => {
    const { agent } = await signedIn(makeApp());
    const res = await agent.post('/api/groups/leave');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
