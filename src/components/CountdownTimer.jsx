import React, { useState, useEffect } from 'react';
import { getTimeRemaining } from '../utils/helpers';

export default function CountdownTimer({ endTime, onEnd }) {
  const [timeLeft, setTimeLeft] = useState(getTimeRemaining(endTime));

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = getTimeRemaining(endTime);
      setTimeLeft(remaining);

      if (remaining.total <= 0) {
        clearInterval(interval);
        if (onEnd) onEnd();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime, onEnd]);

  if (timeLeft.total <= 0) {
    return <p className="text-sm font-semibold text-orange-400">Ended</p>;
  }

  const formatUnit = (value) => String(value).padStart(2, '0');

  return (
    <div className="flex items-center gap-1 font-mono text-sm">
      {timeLeft.days > 0 && (
        <>
          <span className="font-bold text-white">{formatUnit(timeLeft.days)}</span>
          <span className="text-gray-500">d</span>
        </>
      )}
      <span className="font-bold text-white">{formatUnit(timeLeft.hours)}</span>
      <span className="text-gray-500">:</span>
      <span className="font-bold text-white">{formatUnit(timeLeft.minutes)}</span>
      <span className="text-gray-500">:</span>
      <span className="font-bold text-white">{formatUnit(timeLeft.seconds)}</span>
    </div>
  );
}