import React from 'react';
import { useCountdown } from '../hooks/useCountdown';

function formatUnit(value) {
  return String(value).padStart(2, '0');
}

function CountdownUnit({ value, label }) {
  return (
    <span className="countdown-unit">
      <span className="countdown-number" key={`${label}-${value}`}>
        {formatUnit(value)}
      </span>
      <span className="countdown-label">{label}</span>
    </span>
  );
}

export default function CountdownTimer({ endTime, onEnd }) {
  const timeLeft = useCountdown(endTime, onEnd);

  if (timeLeft.total <= 0) {
    return <span className="status-badge status-badge-revealing">ENDED</span>;
  }

  const hours = timeLeft.days > 0 ? timeLeft.hours + timeLeft.days * 24 : timeLeft.hours;

  return (
    <div className="countdown" aria-label="Auction countdown">
      <CountdownUnit value={hours} label="HH" />
      <span className="countdown-separator">:</span>
      <CountdownUnit value={timeLeft.minutes} label="MM" />
      <span className="countdown-separator">:</span>
      <CountdownUnit value={timeLeft.seconds} label="SS" />
    </div>
  );
}
