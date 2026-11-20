import { useEffect, useState } from 'react';

export function useTurnTimer(active: boolean, endsAt: number | null | undefined, intervalMs = 500): number {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!active || !endsAt) return;
    setNowMs(Date.now());
    const id = setInterval(() => {
      setNowMs(Date.now());
    }, intervalMs);
    return () => clearInterval(id);
  }, [active, endsAt, intervalMs]);

  if (!active || !endsAt) return 0;
  return Math.max(0, Math.ceil((endsAt - nowMs) / 1000));
}
