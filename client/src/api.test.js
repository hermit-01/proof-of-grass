import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, SLOW_MS, api, onSlowChange } from './api.js';

const reply = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('api', () => {
  it('sends JSON with same-origin cookies and returns the body', async () => {
    const fetch = vi.fn(async () => reply(201, { user: { id: '1' } }));
    vi.stubGlobal('fetch', fetch);
    await expect(api('/api/auth/signup', { method: 'POST', body: { name: 'Asha' } })).resolves.toEqual({ user: { id: '1' } });
    expect(fetch).toHaveBeenCalledWith('/api/auth/signup', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: '{"name":"Asha"}',
    });
  });

  it("turns an error response into an ApiError with the server's message", async () => {
    vi.stubGlobal('fetch', vi.fn(async () => reply(409, { error: 'That email already has an account' })));
    await expect(api('/api/auth/signup', { method: 'POST', body: {} })).rejects.toMatchObject({ status: 409, message: 'That email already has an account' });
  });

  it('reports no connection as status 0', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    const err = await api('/api/me').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(0);
  });

  it("copes with a non-JSON error page (Render's 502 while waking)", async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 502, json: async () => { throw new SyntaxError('Unexpected token <'); } })));
    await expect(api('/api/me')).rejects.toMatchObject({ status: 502, message: 'Something went wrong (502).' });
  });

  it('says the server is slow after 3 s, and stops when the answer arrives', async () => {
    vi.useFakeTimers();
    let answer;
    vi.stubGlobal('fetch', vi.fn(() => new Promise((resolve) => { answer = resolve; })));
    const seen = [];
    const stop = onSlowChange((slow) => seen.push(slow));
    const pending = api('/api/me');
    await vi.advanceTimersByTimeAsync(SLOW_MS - 1);
    expect(seen).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(seen).toEqual([true]);
    answer(reply(200, { user: null }));
    await pending;
    expect(seen).toEqual([true, false]);
    stop();
  });
});
