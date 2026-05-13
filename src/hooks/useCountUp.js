import { useEffect, useState } from 'react';

const DEFAULT_DURATION = 800;
const DEFAULT_DELAY = 0;

function easeOutQuint(progress) {
  return 1 - Math.pow(1 - progress, 5);
}

export function useCountUp(targetValue, options = {}) {
  const { duration = DEFAULT_DURATION, delay = DEFAULT_DELAY } = options;
  const numericTarget = Number.isFinite(Number(targetValue)) ? Number(targetValue) : 0;
  const [value, setValue] = useState(0);

  useEffect(() => {
    let animationFrame = 0;
    let delayTimer = 0;
    let cancelled = false;

    delayTimer = window.setTimeout(() => {
      const startTime = performance.now();
      setValue(0);

      const tick = (now) => {
        if (cancelled) return;

        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        setValue(numericTarget * easeOutQuint(progress));

        if (progress < 1) {
          animationFrame = window.requestAnimationFrame(tick);
        }
      };

      animationFrame = window.requestAnimationFrame(tick);
    }, delay);

    return () => {
      cancelled = true;
      window.clearTimeout(delayTimer);
      window.cancelAnimationFrame(animationFrame);
    };
  }, [numericTarget, duration, delay]);

  return value;
}
