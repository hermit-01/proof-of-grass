// ●●○○ for 2 of 4. Walks beyond the pact add more filled dots.
export default function WeekDots({ count, pact }) {
  const total = Math.max(count, pact);
  return (
    <p className="dots" role="img" aria-label={`${count} of ${pact} walks this week`}>
      {Array.from({ length: total }, (_, i) => <span key={i} className={i < count ? 'dot on' : 'dot'} />)}
    </p>
  );
}
