import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';

const DAYS = [1, 2, 3, 4, 5, 6, 7];

export default function Settings() {
  const { user, setUser, logout } = useAuth();
  const [name, setName] = useState(user.name);
  const [days, setDays] = useState(user.pactDaysPerWeek);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  async function save(e) {
    e.preventDefault();
    setStatus('');
    setError('');
    try {
      const { user: updated } = await api('/api/me', { method: 'PATCH', body: { name, pactDaysPerWeek: days } });
      setUser(updated);
      setStatus('Saved.');
    } catch (err) {
      setError(err.message);
    }
  }

  async function doLogout() {
    try {
      await logout();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="stack">
      <h1>Settings</h1>
      <form onSubmit={save} className="card stack">
        <label>
          Name
          <input value={name} maxLength={40} required onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Days a week
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
            {DAYS.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        {status && <p className="ok" role="status">{status}</p>}
        <button className="primary">Save</button>
      </form>
      <button onClick={doLogout}>Log out</button>
      <section className="card stack about">
        <h2>About</h2>
        <p>
          Your photo is checked on this phone by CLIP, an open AI model (OpenAI, MIT licence), running in
          Transformers.js (Apache-2.0). The photo is never saved or uploaded; the server only learns the date and
          which quest you found.
        </p>
        <p className="muted">Logged in as {user.email}.</p>
      </section>
    </section>
  );
}
