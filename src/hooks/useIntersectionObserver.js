import { useEffect, useRef, useState } from 'react';

const DEFAULT_OPTIONS = {
  root: null,
  rootMargin: '0px',
  threshold: 0.2,
};

export function useIntersectionObserver(options = DEFAULT_OPTIONS) {
  const targetRef = useRef(null);
  const [hasEntered, setHasEntered] = useState(false);

  useEffect(() => {
    const target = targetRef.current;

    if (!target || hasEntered) {
      return undefined;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setHasEntered(true);
        observer.disconnect();
      }
    }, { ...DEFAULT_OPTIONS, ...options });

    observer.observe(target);

    return () => observer.disconnect();
  }, [hasEntered, options]);

  return [targetRef, hasEntered];
}
