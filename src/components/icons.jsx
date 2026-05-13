import React from 'react';

function IconBase({
  children,
  size = 16,
  color = 'currentColor',
  strokeWidth = 1.5,
  title,
  ...props
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      {...props}
    >
      {title && <title>{title}</title>}
      {children}
    </svg>
  );
}

export function ShieldLockIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M12 3l7 3v5c0 4.6-2.8 8.2-7 10-4.2-1.8-7-5.4-7-10V6l7-3z" />
      <rect x="8.5" y="11" width="7" height="5.5" rx="1.2" />
      <path d="M10 11V9.4a2 2 0 0 1 4 0V11" />
    </IconBase>
  );
}

export function DashboardIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </IconBase>
  );
}

export function AuctionIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M7 7l5 5" />
      <path d="M9 5l8 8" />
      <path d="M4 10l3-3" />
      <path d="M12 18h8" />
      <path d="M14 14l-5 5" />
      <path d="M4 20h8" />
    </IconBase>
  );
}

export function BidsIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M7 8h10" />
      <path d="M7 12h10" />
      <path d="M7 16h6" />
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </IconBase>
  );
}

export function ProtocolIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="6" cy="12" r="2" />
      <circle cx="18" cy="6" r="2" />
      <circle cx="18" cy="18" r="2" />
      <path d="M8 11l8-4" />
      <path d="M8 13l8 4" />
      <path d="M18 8v8" />
    </IconBase>
  );
}

export function SettingsIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.1 2.1-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V20h-3v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-2.1-2.1.1-.1A1.7 1.7 0 0 0 5 15a1.7 1.7 0 0 0-1.5-1H3v-3h.5A1.7 1.7 0 0 0 5 10a1.7 1.7 0 0 0-.3-1.9l-.1-.1 2.1-2.1.1.1A1.7 1.7 0 0 0 8.7 6a1.7 1.7 0 0 0 1-1.5V4h3v.5a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 2.1 2.1-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1H21v3h-.6a1.7 1.7 0 0 0-1 1z" />
    </IconBase>
  );
}

export function PlusIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </IconBase>
  );
}

export function TrendingUpIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M3 17l6-6 4 4 7-8" />
      <path d="M14 7h6v6" />
    </IconBase>
  );
}

export function CheckCircleIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12l2.5 2.5L16 9" />
    </IconBase>
  );
}

export function CheckIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M5 12l4 4 10-10" />
    </IconBase>
  );
}

export function XIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </IconBase>
  );
}

export function LockIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      <path d="M12 14v2" />
    </IconBase>
  );
}

export function CopyIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="8" y="8" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
    </IconBase>
  );
}

export function TrashIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M4 7h16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M6 7l1 13h10l1-13" />
      <path d="M9 7V4h6v3" />
    </IconBase>
  );
}

export function RefreshIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M20 6v5h-5" />
      <path d="M4 18v-5h5" />
      <path d="M18 11a6.5 6.5 0 0 0-11-4l-3 3" />
      <path d="M6 13a6.5 6.5 0 0 0 11 4l3-3" />
    </IconBase>
  );
}

export function WalletIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6.5A2.5 2.5 0 0 1 4 16.5v-9z" />
      <path d="M16 12h4" />
      <path d="M16 12a1 1 0 1 0 0 .1" />
    </IconBase>
  );
}

export function TerminalIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M4 17h16" />
      <path d="M5 7l4 4-4 4" />
      <path d="M11 15h4" />
    </IconBase>
  );
}

export function ImageIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="M20 15l-4-4-5 5-2-2-5 5" />
    </IconBase>
  );
}

export function ClockIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </IconBase>
  );
}

export function ZapIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M13 2L4 14h7l-1 8 10-13h-7l0-7z" />
    </IconBase>
  );
}

export function AlertIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.2 4.1L2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.8 4.1a2 2 0 0 0-3.6 0z" />
    </IconBase>
  );
}

export function EncryptionCircuitIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="8" y="10" width="8" height="7" rx="1.5" />
      <path d="M10 10V8a2 2 0 0 1 4 0v2" />
      <path d="M4 7h3" />
      <path d="M17 7h3" />
      <path d="M6 7v5h2" />
      <path d="M18 7v5h-2" />
      <path d="M12 17v3" />
      <circle cx="4" cy="7" r="1" />
      <circle cx="20" cy="7" r="1" />
      <circle cx="12" cy="21" r="1" />
    </IconBase>
  );
}

export function ComputeNodesIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M12 5l7 12H5L12 5z" />
      <circle cx="12" cy="5" r="2" />
      <circle cx="5" cy="17" r="2" />
      <circle cx="19" cy="17" r="2" />
    </IconBase>
  );
}

export function ComputeStackIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M8 9h8" />
      <path d="M7 12h10" />
      <rect x="6" y="12" width="12" height="7" rx="1.5" />
      <path d="M9 12V9a3 3 0 0 1 6 0v3" />
      <path d="M9 15h6" />
    </IconBase>
  );
}

export function SelectiveRevealIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M3 12s3.3-6 9-6 9 6 9 6-3.3 6-9 6-9-6-9-6z" />
      <circle cx="12" cy="12" r="2.4" />
      <path d="M12 7v10" />
    </IconBase>
  );
}

export function EmptyAuctionIcon(props) {
  return (
    <IconBase {...props} viewBox="0 0 64 64">
      <rect x="10" y="14" width="44" height="36" rx="4" />
      <path d="M18 24h28" />
      <path d="M18 34h20" />
      <path d="M24 50v6" />
      <path d="M40 50v6" />
      <circle cx="49" cy="18" r="6" />
      <path d="M46.5 18l1.8 1.8 3.3-4" />
    </IconBase>
  );
}
