import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { makeApp } from './helpers.js';

describe('the API shell', () => {
  it('answers the health check', async () => {
    const res = await request(makeApp()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('answers unknown API paths with a JSON 404', async () => {
    const res = await request(makeApp()).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
  });

  it('answers malformed JSON with 400', async () => {
    const res = await request(makeApp()).post('/api/nope').set('Content-Type', 'application/json').send('{"oops"');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid JSON' });
  });

  it('refuses to start without a JWT secret', () => {
    expect(() => createApp({})).toThrow(/jwtSecret/);
  });
});

describe('serving the built client', () => {
  let dist;
  beforeAll(() => {
    dist = fs.mkdtempSync(path.join(os.tmpdir(), 'pog-dist-'));
    fs.writeFileSync(path.join(dist, 'index.html'), '<!doctype html><title>Proof of Grass</title>');
  });
  afterAll(() => fs.rmSync(dist, { recursive: true, force: true }));

  it('sends the app shell for app pages, so deep links and reloads work', async () => {
    const res = await request(makeApp({ clientDist: dist })).get('/history');
    expect(res.status).toBe(200);
    expect(res.text).toContain('<title>Proof of Grass</title>');
  });

  it('still answers unknown API paths with JSON, never the app shell', async () => {
    const res = await request(makeApp({ clientDist: dist })).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });
});
