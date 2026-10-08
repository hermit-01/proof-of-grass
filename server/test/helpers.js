import { createApp } from '../src/app.js';

export const SECRET = 'test-secret-that-is-at-least-32-characters-long';

// bcryptCost 4 keeps the tests fast; production uses the default, 12.
export function makeApp(options = {}) {
  return createApp({ jwtSecret: SECRET, bcryptCost: 4, ...options });
}

export const fixedNow = (iso) => () => new Date(iso);
