import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth.jsx';
import CameraButton from '../components/CameraButton.jsx';
import WeekDots from '../components/WeekDots.jsx';
import { listPending } from '../offline/queue.js';
import { loadWalks } from '../walks.js';
import { CLASS_LABELS, questsFor } from '../../../shared/quests.js';
import { istDate, streakWeeks, weekDates } from '../../../shared/week.js';
import Check from './Check.jsx';

export default function Home() {
  const { user, refresh, syncTick, syncNotice } = useAuth();
  const [walks, setWalks] = useState([]);
  const [pending, setPending] = useState([]);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState('');
  const [today, setToday] = useState(() => istDate());
  const [shot, setShot] = useState(null); // { file, id } while a photo is being checked

  const reload = useCallback(async () => {
    setToday(istDate());
    setPending(await listPending().catch(() => []));
    try {
      const result = await loadWalks();
      setWalks(result.walks);
      setOffline(result.offline);
      setError('');
    } catch (err) {
      if (err.status === 401) refresh();
      else setError(err.message);
    }
  }, [refresh]);

  useEffect(() => {
    reload();
  }, [reload, syncTick]);

  // Coming back to the app, maybe after midnight: work out today again and reload.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') reload();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [reload]);

  const takePhoto = (file) => setShot({ file, id: `${file.name}-${file.lastModified}-${Date.now()}` });

  if (shot) {
    return <Check key={shot.id} file={shot.file} onRetake={takePhoto} onClose={() => { setShot(null); reload(); }} />;
  }

  const walked = new Set([...walks, ...pending].map((w) => w.date));
  const pact = user.pactDaysPerWeek;
  const thisWeek = weekDates(today).filter((d) => walked.has(d)).length;
  const streak = streakWeeks([...walked], pact, today);

  return (
    <section className="stack home">
      {offline && <p className="note">Offline: showing what's saved on this phone.</p>}
      {syncNotice && <p className="error" role="alert">{syncNotice}</p>}
      {error && <p className="error" role="alert">{error}</p>}

      <div className="card stack">
        <h2>Today's quests</h2>
        <ul className="quests">
          {questsFor(today).map((q) => <li key={q}>{CLASS_LABELS[q]}</li>)}
        </ul>
        <p className="muted">Find any one of them.</p>
      </div>

      <div className="card">
        <WeekDots count={thisWeek} pact={pact} />
        <p>{thisWeek} of {pact} this week</p>
        <p className="muted">{streak === 1 ? '1 week' : `${streak} weeks`} in a row kept</p>
      </div>

      {pending.length > 0 && (
        <p className="muted">{pending.length === 1 ? '1 walk waiting to sync' : `${pending.length} walks waiting to sync`}</p>
      )}

      {walked.has(today)
        ? <p className="done">Done for today ✓</p>
        : <CameraButton onPhoto={takePhoto}>I'm outside: take the photo</CameraButton>}
    </section>
  );
}
