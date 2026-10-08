import { useAuth } from '../auth.jsx';
import { CLASS_LABELS, questsFor } from '../../../shared/quests.js';
import { istDate } from '../../../shared/week.js';

export default function Home() {
  const { user } = useAuth();
  const quests = questsFor(istDate());
  return (
    <section className="stack">
      <h1>Hi {user.name}</h1>
      <p>Today's quests: {quests.map((q) => CLASS_LABELS[q]).join(' · ')}</p>
    </section>
  );
}
