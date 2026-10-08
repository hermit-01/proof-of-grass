import { describe, expect, it } from 'vitest';
import { ApiError } from './api.js';
import { USER_KEY, WALKS_KEY, resolveSession } from './session.js';

function memoryStore(initial = {}) {
  const data = new Map(Object.entries(initial));
  return { data, load: (k) => data.get(k) ?? null, save: (k, v) => data.set(k, v), remove: (k) => data.delete(k) };
}
const ASHA = { id: 'u1', name: 'Asha', email: 'asha@example.com', pactDaysPerWeek: 4, group: null };
const failWith = (status) => async () => { throw new ApiError(status, 'x'); };

describe('resolveSession', () => {
  it("uses the server's answer and remembers the user on the phone", async () => {
    const store = memoryStore();
    await expect(resolveSession({ ...store, fetchMe: async () => ({ user: ASHA }) })).resolves.toEqual({ user: ASHA, offline: false });
    expect(store.data.get(USER_KEY)).toEqual(ASHA);
  });

  it('forgets the user and their cached walks when the session has expired (401)', async () => {
    const store = memoryStore({ [USER_KEY]: ASHA, [WALKS_KEY]: [] });
    await expect(resolveSession({ ...store, fetchMe: failWith(401) })).resolves.toEqual({ user: null, offline: false });
    expect(store.data.size).toBe(0);
  });

  it.each([0, 502, 503])('opens as the last user when the server is unreachable (status %i)', async (status) => {
    const store = memoryStore({ [USER_KEY]: ASHA });
    await expect(resolveSession({ ...store, fetchMe: failWith(status) })).resolves.toEqual({ user: ASHA, offline: true });
  });

  it('shows the welcome screen offline if nobody has logged in on this phone', async () => {
    await expect(resolveSession({ ...memoryStore(), fetchMe: failWith(0) })).resolves.toEqual({ user: null, offline: true });
  });
});
