import { api } from './api.js';
import { loadJSON, removeKey, saveJSON } from './storage.js';

export const USER_KEY = 'pog.user';
export const WALKS_KEY = 'pog.walks';

// How the app starts: with a user saved on this phone it opens straight to Home (weak signal or a sleeping
// server must not hold the camera button hostage) and checks with the server in the background.
export function initialAuthState(load = loadJSON) {
  const user = load(USER_KEY);
  return { user, loading: !user };
}

// Who is logged in? Ask the server. With no signal, or the server down, fall back to the last user seen on
// this phone, so the app still opens on a walk with no network.
export async function resolveSession({ fetchMe = () => api('/api/me'), load = loadJSON, save = saveJSON, remove = removeKey } = {}) {
  try {
    const { user } = await fetchMe();
    save(USER_KEY, user);
    return { user, offline: false };
  } catch (err) {
    if (err.status === 401) {
      remove(USER_KEY);
      remove(WALKS_KEY);
      return { user: null, offline: false };
    }
    if (err.status === 0 || err.status >= 500) return { user: load(USER_KEY), offline: true };
    throw err;
  }
}
