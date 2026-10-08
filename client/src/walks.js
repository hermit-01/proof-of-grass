import { api } from './api.js';
import { WALKS_KEY } from './session.js';
import { loadJSON, saveJSON } from './storage.js';

// Your walks from the server: 52 weeks, for the streak and the history. A copy stays on the phone for no-signal days.
export async function loadWalks({ fetchWalks = () => api('/api/walks?weeks=52'), load = loadJSON, save = saveJSON } = {}) {
  try {
    const { walks } = await fetchWalks();
    save(WALKS_KEY, walks);
    return { walks, offline: false };
  } catch (err) {
    if (err.status === 0 || err.status >= 500) return { walks: load(WALKS_KEY) ?? [], offline: true };
    throw err;
  }
}
