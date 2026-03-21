import { useEffect, useState } from 'react';

/**
 * Reusable countdown timer hook
 * Returns remaining seconds and progress percentage
 */
export function useCountdown(
  startTime: number | null,
  durationSeconds: number | null,
  onComplete?: () => void
) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!startTime || !durationSeconds) {
      setRemaining(null);
      setProgress(0);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const remainingTime = Math.max(0, durationSeconds - elapsed);
      const progressPercent = (elapsed / durationSeconds) * 100;

      setRemaining(Math.ceil(remainingTime));
      setProgress(Math.min(100, progressPercent));

      if (remainingTime <= 0) {
        clearInterval(interval);
        onComplete?.();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [startTime, durationSeconds, onComplete]);

  return { remaining, progress };
}
