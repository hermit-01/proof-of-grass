import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api.js';
import { USER_KEY, WALKS_KEY, resolveSession } from './session.js';
import { removeKey, saveJSON } from './storage.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const logout = useCallback(async () => {
    await api('/api/auth/logout', { method: 'POST' });
    setUser(null);
  }, [setUser]);

  return <AuthContext.Provider value={{ user, setUser, loading, refresh, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
