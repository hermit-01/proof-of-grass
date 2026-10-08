// Walks that couldn't reach the server (no signal, or the server asleep or failing) wait here on the phone,
// in IndexedDB, until the app next opens or the phone gets signal back. Keyed by date: one walk per day.
import { postWalk } from '../api.js';

const DB_NAME = 'proof-of-grass';
const STORE = 'pendingWalks';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'date' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function inStore(mode, action) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = action(tx.objectStore(STORE));
    tx.oncomplete = () => {
      db.close();
      resolve(req.result);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export const addPending = (entry) => inStore('readwrite', (store) => store.put(entry));
export const listPending = () => inStore('readonly', (store) => store.getAll());
export const removePending = (date) => inStore('readwrite', (store) => store.delete(date));
export const clearPending = () => inStore('readwrite', (store) => store.clear());

// No network, or a server error (Render waking up): worth trying again later.
const retryable = (err) => err.status === 0 || err.status >= 500;

// Sends a counted walk. If it can't get through, keeps it on the phone. Returns 'saved' or 'queued'.
export async function recordWalk(walk, userId, post = postWalk) {
  try {
    await post(walk);
    return 'saved';
  } catch (err) {
    if (err.status === 409) return 'saved'; // already counted for that day
    if (retryable(err)) {
      await addPending({ ...walk, userId });
      return 'queued';
    }
    throw err;
  }
}

// Sends what's waiting, oldest first. A walk the server refuses (e.g. 400: more than 2 days late) is dropped
// and reported. On no network, a server error or a lost session it stops and keeps the rest for next time.
export async function flushPending(userId, post = postWalk) {
  const result = { synced: 0, dropped: [] };
  for (const { userId: owner, ...walk } of await listPending()) {
    if (owner !== userId) {
      await removePending(walk.date); // queued by an account that has since logged out
      continue;
    }
    try {
      await post(walk);
      result.synced++;
    } catch (err) {
      if (retryable(err) || err.status === 401) break;
      if (err.status === 409) result.synced++;
      else result.dropped.push({ ...walk, reason: err.message });
    }
    await removePending(walk.date);
  }
  return result;
}
