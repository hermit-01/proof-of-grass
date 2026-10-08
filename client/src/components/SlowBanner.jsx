import { useEffect, useState } from 'react';
import { onSlowChange } from '../api.js';

export default function SlowBanner() {
  const [slow, setSlow] = useState(false);
  useEffect(() => onSlowChange(setSlow), []);
  if (!slow) return null;
  return (
    <div className="banner" role="status">
      Waking the server… Free hosting naps when nobody's using it, so this can take up to a minute.
    </div>
  );
}
