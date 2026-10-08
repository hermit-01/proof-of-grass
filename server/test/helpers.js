import request from 'supertest';
import { createApp } from '../src/app.js';

export const SECRET = 'test-secret-that-is-at-least-32-characters-long';

// bcryptCost 4 keeps the tests fast; production uses the default, 12.
export function makeApp(options = {}) {
  return createApp({ jwtSecret: SECRET, bcryptCost: 4, ...options });
}

export const fixedNow = (iso) => () => new Date(iso);

// Signs a new user up and returns a supertest agent that carries their session cookie.
export async function signedIn(app, { name = 'Asha', email = 'asha@example.com', password = 'walk-every-day' } = {}) {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/signup').send({ name, email, password });
  if (res.status !== 201) throw new Error(`signup failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { agent, user: res.body.user };
}
