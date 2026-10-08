import { useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';

const DAYS = [1, 2, 3, 4, 5, 6, 7];

export default function PactSetup() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [days, setDays] = useState(user.pactDaysPerWeek);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setError('');
    try {
      const { user: updated } = await api('/api/me', { method: 'PATCH', body: { pactDaysPerWeek: days } });
      setUser(updated);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="stack">
      <h1>Your pact</h1>
      <p>How many days a week will you get outside for a walk or a run?</p>
      <div className="day-picker" role="radiogroup" aria-label="Days a week">
        {DAYS.map((n) => (
          <button key={n} role="radio" aria-checked={days === n} className={days === n ? 'on' : ''} onClick={() => setDays(n)}>
            {n}
          </button>
        ))}
      </div>
      <p className="pact-line">I walk <strong>{days}</strong> {days === 1 ? 'day' : 'days'} a week.</p>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="primary" onClick={save} disabled={busy}>Make the pact</button>
    </section>
  );
}
