import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import WeekDots from '../components/WeekDots.jsx';
import { lastWeekLine } from '../format.js';

export default function Group() {
  const { user, refresh } = useAuth();
  return user.group ? <Board onLeft={refresh} /> : <NoGroup onJoined={refresh} />;
}

function NoGroup({ onJoined }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function run(path, body) {
    setBusy(true);
    setError('');
    try {
      await api(path, { method: 'POST', body });
      await onJoined();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="stack">
      <h1>Group</h1>
      <p className="muted">Walk with friends: everyone sees who kept their pact this week.</p>
      <form className="card stack" onSubmit={(e) => { e.preventDefault(); run('/api/groups/join', { code }); }}>
        <h2>Join a group</h2>
        <label>
          Group code
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={8} autoCapitalize="characters" autoComplete="off" required placeholder="ABCDEF" />
        </label>
        <button className="primary" disabled={busy}>Join</button>
      </form>
      <form className="card stack" onSubmit={(e) => { e.preventDefault(); run('/api/groups', { name }); }}>
        <h2>Start a group</h2>
        <label>
          Group name
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required />
        </label>
        <button disabled={busy}>Create</button>
      </form>
      {error && <p className="error" role="alert">{error}</p>}
    </section>
  );
}

function Board({ onLeft }) {
  const { user } = useAuth();
  const [board, setBoard] = useState(null);
  const [error, setError] = useState('');
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      setBoard(await api('/api/groups/board'));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);

  async function share() {
    const text = `Join my walking group on Proof of Grass. Code: ${user.group.code}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Proof of Grass', text, url: window.location.origin });
      } else {
        await navigator.clipboard.writeText(`${text} ${window.location.origin}`);
        setCopied(true);
      }
    } catch {
      // The share sheet was closed: nothing to do.
    }
  }

  async function leave() {
    try {
      await api('/api/groups/leave', { method: 'POST' });
      await onLeft();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="stack">
      <h1>{user.group.name}</h1>
      <p className="muted">
        Code <strong className="code">{user.group.code}</strong>{' '}
        <button className="link" onClick={share}>Share</button> {copied && 'Copied.'}
      </p>
      {error && <p className="error" role="alert">{error}</p>}
      {!board && !error && <p role="status">Loading the board…</p>}
      {board && (
        <ul className="board">
          {board.members.map((m) => (
            <li key={m.id} className="card member">
              <div className="member-top">
                <strong>{m.name}{m.isMe ? ' (you)' : ''}</strong>
                {m.walkedToday && <span className="today">✓ today</span>}
              </div>
              <WeekDots count={m.thisWeek.length} pact={m.pact} />
              <p className="muted">{lastWeekLine(m.lastWeek)}</p>
            </li>
          ))}
        </ul>
      )}
      {confirmLeave ? (
        <div className="card stack">
          <p>Leave {user.group.name}? You can rejoin with the code.</p>
          <button onClick={leave}>Leave the group</button>
          <button className="link" onClick={() => setConfirmLeave(false)}>Stay</button>
        </div>
      ) : (
        <button className="link" onClick={() => setConfirmLeave(true)}>Leave group</button>
      )}
    </section>
  );
}
