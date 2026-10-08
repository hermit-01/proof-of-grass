// The main-thread side of the photo checker: one Web Worker runs the model, and this file talks to it.
const READY_KEY = 'pog.checkerReady';
let worker = null;
let nextId = 0;
const jobs = new Map();
let progressListener = null;

function getWorker() {
  if (worker) return worker;
  const w = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
  w.onmessage = ({ data }) => {
    if (data.type === 'progress') {
      progressListener?.(data);
      return;
    }
    const job = jobs.get(data.id);
    if (!job) return;
    jobs.delete(data.id);
    if (data.type === 'error') job.reject(new Error(data.message));
    else job.resolve(data);
  };
  w.onerror = (event) => {
    for (const job of jobs.values()) job.reject(new Error(event.message || 'The photo checker stopped. Try again.'));
    jobs.clear();
    w.terminate();
    worker = null;
  };
  worker = w;
  return w;
}

function send(message) {
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    jobs.set(id, { resolve, reject });
    getWorker().postMessage({ ...message, id });
  });
}

// True once the model has loaded on this phone before (so it is cached and needs no download).
export function checkerWasReady() {
  try {
    return localStorage.getItem(READY_KEY) === '1';
  } catch {
    return false;
  }
}

export async function embedPhoto(file, { onProgress, onChecking } = {}) {
  progressListener = onProgress ?? null;
  try {
    await send({ type: 'load' });
  } finally {
    progressListener = null;
  }
  try {
    localStorage.setItem(READY_KEY, '1');
  } catch {
    // Storage blocked: the first-run text shows again next time, nothing worse.
  }
  onChecking?.();
  const { embedding } = await send({ type: 'embed', file });
  return embedding;
}

let embedsPromise = null;
export function getEmbeds() {
  embedsPromise ??= fetch('/embeds.json')
    .then((res) => {
      if (!res.ok) throw new Error('Could not load the quest list. Check your connection and try again.');
      return res.json();
    })
    .catch((err) => {
      embedsPromise = null;
      throw err;
    });
  return embedsPromise;
}
