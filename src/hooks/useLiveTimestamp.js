import { useEffect, useState } from 'react';

function pad(value) {
  return String(value).padStart(2, '0');
}

function formatUtcTimestamp(date) {
  return [
    date.getUTCFullYear(),
    '-',
    pad(date.getUTCMonth() + 1),
    '-',
    pad(date.getUTCDate()),
    ' ',
    pad(date.getUTCHours()),
    ':',
    pad(date.getUTCMinutes()),
    ':',
    pad(date.getUTCSeconds()),
    ' UTC',
  ].join('');
}

export function useLiveTimestamp() {
  const [timestamp, setTimestamp] = useState(() => formatUtcTimestamp(new Date()));

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTimestamp(formatUtcTimestamp(new Date()));
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  return timestamp;
}
