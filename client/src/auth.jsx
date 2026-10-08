import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api.js';
import { clearPending, flushPending } from './offline/queue.js';
import { USER_KEY, WALKS_KEY, resolveSession } from './session.js';
import { removeKey, saveJSON } from './storage.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(null);
  const [loading, setLoading] = useState(true);
  // Grows whenever queued walks reach the server, so screens know to reload.
  const [syncTick, setSyncTick] = useState(0);
  const [syncNotice, setSyncNotice] = useState('');

  // Keep the copy on the phone in step, so the app can open with no signal.
  const setUser = useCallback((next) => {
    setUserState(next);
    if (next) {
      saveJSON(USER_KEY, next);
    } else {
      removeKey(USER_KEY);
      removeKey(WALKS_KEY);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      setUserState((await resolveSession()).user);
    } catch {
      // An unexpected answer (not 401, not offline): keep whoever is shown now.
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const userId = user?.id;
  const sync = useCallback(async () => {
    if (!userId) return;
    const { synced, dropped } = await flushPending(userId).catch(() => ({ synced: 0, dropped: [] }));
    if (dropped.length) {
      setSyncNotice(dropped.map((w) => `Your walk from ${w.date} couldn't be saved: ${w.reason}`).join(' '));
    }
    if (synced || dropped.length) setSyncTick((n) => n + 1);
  }, [userId]);

  // Send waiting walks when the app opens, and whenever the phone gets signal back.
  useEffect(() => {
    sync();
    const onOnline = () => {
      refresh();
      sync();
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [sync, refresh]);

  const logout = useCallback(async () => {
    await api('/api/auth/logout', { method: 'POST' });
    await clearPending().catch(() => {});
    setUser(null);
  }, [setUser]);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, refresh, logout, syncTick, syncNotice, sync }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
