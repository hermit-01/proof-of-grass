import { useEffect, useState } from 'react';
import { useAuth } from '../auth.jsx';
import { historyWeeks } from '../format.js';
import { listPending } from '../offline/queue.js';
import { loadWalks } from '../walks.js';
import { CLASS_LABELS } from '../../../shared/quests.js';
import { istDate } from '../../../shared/week.js';

const DAY_NAMES = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const shortDate = (date) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });

export default function History() {
  const { user, syncTick } = useAuth();
  const [walks, setWalks] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [{ walks: saved }, pending] = await Promise.all([loadWalks(), listPending().catch(() => [])]);
        setWalks([...saved, ...pending]);
      } catch (err) {
        setError(err.message);
      }
    })();
  }, [syncTick]);

  const pact = user.pactDaysPerWeek;
  return (
    <section className="stack">
      <h1>History</h1>
      {error && <p className="error" role="alert">{error}</p>}
      {!walks && !error && <p role="status">Loading…</p>}
      {walks && (
        <table className="calendar">
          <thead>
            <tr>
              <th scope="col">Week of</th>
              {DAY_NAMES.map((d, i) => <th key={i} scope="col">{d}</th>)}
              <th scope="col">Pact</th>
            </tr>
          </thead>
          <tbody>
            {historyWeeks(walks, istDate(), pact).map((week) => (
              <tr key={week.monday}>
                <th scope="row">{shortDate(week.monday)}</th>
                {week.days.map((day) => (
                  <td
                    key={day.date}
                    className={[day.walk && 'walked', day.isToday && 'today', day.isFuture && 'future'].filter(Boolean).join(' ')}
                    title={day.walk ? `${shortDate(day.date)}: found ${CLASS_LABELS[day.walk.quest]}` : shortDate(day.date)}
                  >
                    {day.walk ? '●' : ''}
                  </td>
                ))}
                <td className={week.kept ? 'kept' : ''}>{week.walks}/{pact}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="muted">The pact column uses your current pact ({pact} {pact === 1 ? 'day' : 'days'} a week).</p>
    </section>
  );
}
