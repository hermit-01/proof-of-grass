// Every call to the server goes through here: same-origin cookies, JSON in and out, failures as ApiError.
// status 0 means the request never reached the server (no signal).

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Render's free server sleeps when idle, and the first request can take about 50 s. After SLOW_MS the app says so.
export const SLOW_MS = 3000;
const slowListeners = new Set();
let slowCount = 0;

export function onSlowChange(listener) {
  slowListeners.add(listener);
  return () => {
    slowListeners.delete(listener);
  };
}

function changeSlow(delta) {
  slowCount += delta;
  for (const listener of slowListeners) listener(slowCount > 0);
}

// How long a walk upload may take before it counts as "no signal" and stays queued on the phone.
export const WALK_TIMEOUT_MS = 15000;

// timeoutMs (optional): give up after this long and treat it as no connection (status 0).
export async function api(path, { method = 'GET', body, timeoutMs } = {}) {
  const init = { method, credentials: 'same-origin' };
  if (body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(body);
  }
  const controller = timeoutMs ? new AbortController() : null;
  if (controller) init.signal = controller.signal;
  const giveUp = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  let slow = false;
  const timer = setTimeout(() => {
    slow = true;
    changeSlow(1);
  }, SLOW_MS);
  try {
    let res;
    try {
      res = await fetch(path, init);
    } catch {
      throw new ApiError(0, 'No connection right now.');
    }
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new ApiError(res.status, data?.error ?? `Something went wrong (${res.status}).`);
    return data;
  } finally {
    clearTimeout(timer);
    clearTimeout(giveUp);
    if (slow) changeSlow(-1);
  }
}

export const postWalk = (walk) => api('/api/walks', { method: 'POST', body: walk, timeoutMs: WALK_TIMEOUT_MS });
