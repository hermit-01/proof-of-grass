import { useEffect, useState } from 'react';
import { useAuth } from '../auth.jsx';
import { checkerWasReady, embedPhoto, getEmbeds } from '../check/checker.js';
import CameraButton from '../components/CameraButton.jsx';
import { recordWalk } from '../offline/queue.js';
import { isFreshPhoto, judgePhoto, messageFor } from '../../../shared/decide.js';

const timeLabel = (ms) => new Date(ms).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });

// Checks one photo on the phone, then counts the walk. The photo is only shown here; it is never stored or sent.
export default function Check({ file, onRetake, onClose }) {
  const { user } = useAuth();
  const [state, setState] = useState({ step: 'starting' });
  const [preview, setPreview] = useState('');

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    let live = true;
    const show = (next) => {
      if (live) setState(next);
    };
    (async () => {
      const checkedAt = Date.now();
      if (!isFreshPhoto(file.lastModified, checkedAt)) return show({ step: 'stale' });
      try {
        const firstRun = !checkerWasReady();
        show({ step: 'loading', firstRun });
        const embedding = await embedPhoto(file, {
          onProgress: ({ loaded, total }) => show({ step: 'loading', firstRun, loaded, total }),
          onChecking: () => show({ step: 'checking' }),
        });
        const { date, today, result } = judgePhoto(embedding, await getEmbeds(), checkedAt);
        if (!result.pass) return show({ step: 'fail', message: messageFor(result, today) });
        // Show the result at once; the walk is already safe on the phone while it uploads.
        const message = messageFor(result, today, timeLabel(checkedAt));
        show({ step: 'pass', message, saved: 'saving' });
        const saved = await recordWalk({ date, quest: result.quest, checkedAt: new Date(checkedAt).toISOString() }, user.id);
        show({ step: 'pass', message, saved });
      } catch (err) {
        show({ step: 'error', message: err.message });
      }
    })();
    return () => {
      live = false;
    };
  }, [file, user.id]);

  return (
    <section className="stack check">
      {preview && <img className="preview" src={preview} alt="Your photo. It stays on this phone." />}

      {state.step === 'loading' && (
        <div className="card stack" role="status">
          <p>
            {state.firstRun
              ? 'Getting your checker ready: a one-time download of about 110 MB, so use Wi-Fi.'
              : 'Waking up the checker…'}
          </p>
          {state.total ? <progress value={state.loaded} max={state.total} /> : <progress />}
        </div>
      )}

      {(state.step === 'starting' || state.step === 'checking') && <p role="status">Checking your photo…</p>}

      {state.step === 'pass' && (
        <div className="card stack result pass" role="status">
          <p className="big">{state.message}</p>
          {state.saved === 'saving' && <p className="muted">Saving…</p>}
          {state.saved === 'queued' && (
            <p className="muted">No signal right now, so it's saved on this phone. It will sync when you're back online.</p>
          )}
          <button className="primary" onClick={onClose}>Done</button>
        </div>
      )}

      {state.step === 'fail' && (
        <div className="card stack result fail" role="alert">
          <p className="big">{state.message}</p>
          <CameraButton onPhoto={onRetake}>Try again</CameraButton>
          <button onClick={onClose}>Back</button>
        </div>
      )}

      {state.step === 'stale' && (
        <div className="card stack" role="alert">
          <p className="big">Take a fresh photo</p>
          <p className="muted">That photo is more than 10 minutes old. The quest has to be found on this walk.</p>
          <CameraButton onPhoto={onRetake}>Take the photo</CameraButton>
          <button onClick={onClose}>Back</button>
        </div>
      )}

      {state.step === 'error' && (
        <div className="card stack" role="alert">
          <p className="error">{state.message}</p>
          <button onClick={onClose}>Back</button>
        </div>
      )}
    </section>
  );
}
