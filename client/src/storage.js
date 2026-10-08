// localStorage that never throws: a private window or blocked storage just behaves as empty.

export function loadJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the app still works, it just can't open offline.
  }
}

export function removeKey(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Blocked storage: there is nothing to remove.
  }
}
