import { useEffect, useState } from 'react';
import { getTimeRemaining } from '../utils/helpers';

export function useCountdown(endTime, onEnd) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeRemaining(endTime));

  useEffect(() => {
    const update = () => {
      const remaining = getTimeRemaining(endTime);
      setTimeLeft(remaining);

      if (remaining.total <= 0) {
        onEnd?.();
      }
    };

    update();
    const interval = window.setInterval(update, 1000);

    return () => window.clearInterval(interval);
  }, [endTime, onEnd]);

  return timeLeft;
}
