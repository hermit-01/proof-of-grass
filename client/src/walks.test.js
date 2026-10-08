import { describe, expect, it } from 'vitest';
import { ApiError } from './api.js';
import { WALKS_KEY } from './session.js';
import { loadWalks } from './walks.js';

const WALKS = [{ date: '2026-10-08', quest: 'sky', checkedAt: '2026-10-08T06:00:00.000Z' }];
function store(initial = {}) {
  const data = new Map(Object.entries(initial));
  return { data, load: (k) => data.get(k) ?? null, save: (k, v) => data.set(k, v) };
}

describe('loadWalks', () => {
  it('returns the server walks and keeps a copy on the phone', async () => {
    const s = store();
    await expect(loadWalks({ ...s, fetchWalks: async () => ({ walks: WALKS }) })).resolves.toEqual({ walks: WALKS, offline: false });
    expect(s.data.get(WALKS_KEY)).toEqual(WALKS);
  });

  it.each([0, 502])('falls back to the copy on the phone (status %i)', async (status) => {
    const s = store({ [WALKS_KEY]: WALKS });
    await expect(loadWalks({ ...s, fetchWalks: async () => { throw new ApiError(status, 'x'); } })).resolves.toEqual({ walks: WALKS, offline: true });
  });

  it('passes a 401 through, so the app can ask the person to log in again', async () => {
    await expect(loadWalks({ ...store(), fetchWalks: async () => { throw new ApiError(401, 'Please log in'); } })).rejects.toMatchObject({ status: 401 });
  });
});
