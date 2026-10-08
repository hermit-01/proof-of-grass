import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { ApiError } from '../api.js';
import { addPending, clearPending, flushPending, listPending, recordWalk } from './queue.js';

const walk = (date, quest = 'sky') => ({ date, quest, checkedAt: `${date}T12:00:00.000Z` });
const failWith = (status, message = 'x') => async () => { throw new ApiError(status, message); };

beforeEach(() => clearPending());

describe('recordWalk', () => {
  it('posts the walk and reports it saved', async () => {
    const sent = [];
    await expect(recordWalk(walk('2026-10-08'), 'u1', async (w) => { sent.push(w); })).resolves.toBe('saved');
    expect(sent).toEqual([walk('2026-10-08')]);
    expect(await listPending()).toEqual([]);
  });

  it('counts 409 (already counted, e.g. a double tap) as saved', async () => {
    await expect(recordWalk(walk('2026-10-08'), 'u1', failWith(409))).resolves.toBe('saved');
    expect(await listPending()).toEqual([]);
  });

  it.each([0, 502])('keeps the walk on the phone when the post fails with status %i', async (status) => {
    await expect(recordWalk(walk('2026-10-08'), 'u1', failWith(status))).resolves.toBe('queued');
    expect(await listPending()).toEqual([{ ...walk('2026-10-08'), userId: 'u1' }]);
  });

  it('passes other errors through (a 400 means the walk itself is wrong)', async () => {
    await expect(recordWalk(walk('2026-10-08'), 'u1', failWith(400, 'That date is in the future'))).rejects.toMatchObject({ status: 400 });
    expect(await listPending()).toEqual([]);
  });

  it('keeps the walk on the phone while the post is still hanging, so closing the app cannot lose it', async () => {
    let finish;
    const pending = recordWalk(walk('2026-10-08'), 'u1', () => new Promise((resolve) => { finish = resolve; }));
    await new Promise((r) => setTimeout(r, 50)); // the post is in flight and never answered yet
    expect(await listPending()).toEqual([{ ...walk('2026-10-08'), userId: 'u1' }]);
    finish();
    await expect(pending).resolves.toBe('saved');
    expect(await listPending()).toEqual([]);
  });

  it('keeps the walk when the session has expired (401), to send after the next login', async () => {
    await expect(recordWalk(walk('2026-10-08'), 'u1', failWith(401, 'Please log in'))).resolves.toBe('queued');
    expect(await listPending()).toEqual([{ ...walk('2026-10-08'), userId: 'u1' }]);
  });
});

describe('flushPending', () => {
  it('sends what is waiting and empties the queue', async () => {
    await addPending({ ...walk('2026-10-07'), userId: 'u1' });
    await addPending({ ...walk('2026-10-08'), userId: 'u1' });
    const sent = [];
    await expect(flushPending('u1', async (w) => { sent.push(w); })).resolves.toEqual({ synced: 2, dropped: [] });
    expect(sent).toEqual([walk('2026-10-07'), walk('2026-10-08')]);
    expect(await listPending()).toEqual([]);
  });

  it('drops a walk the server refuses with 400, and says why', async () => {
    await addPending({ ...walk('2026-10-03'), userId: 'u1' });
    const result = await flushPending('u1', failWith(400, 'Walks can only be recorded up to 2 days later'));
    expect(result).toEqual({ synced: 0, dropped: [{ ...walk('2026-10-03'), reason: 'Walks can only be recorded up to 2 days later' }] });
    expect(await listPending()).toEqual([]);
  });

  it.each([0, 503])('keeps everything when the network or the server is down (status %i)', async (status) => {
    await addPending({ ...walk('2026-10-08'), userId: 'u1' });
    await expect(flushPending('u1', failWith(status))).resolves.toEqual({ synced: 0, dropped: [] });
    expect(await listPending()).toHaveLength(1);
  });

  it('counts a 409 as synced', async () => {
    await addPending({ ...walk('2026-10-08'), userId: 'u1' });
    await expect(flushPending('u1', failWith(409))).resolves.toEqual({ synced: 1, dropped: [] });
    expect(await listPending()).toEqual([]);
  });

  it("throws away walks queued by another account, never sending them as this one's", async () => {
    await addPending({ ...walk('2026-10-08'), userId: 'someone-else' });
    const sent = [];
    await expect(flushPending('u1', async (w) => { sent.push(w); })).resolves.toEqual({ synced: 0, dropped: [] });
    expect(sent).toEqual([]);
    expect(await listPending()).toEqual([]);
  });
});
