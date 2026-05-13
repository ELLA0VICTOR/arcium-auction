import React, { useMemo } from 'react';
import {
  CheckCircleIcon,
  ComputeStackIcon,
  EmptyAuctionIcon,
  LockIcon,
  PlusIcon,
} from './icons';

function MetricCell({ label, value }) {
  return (
    <div className="metric-cell">
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
    </div>
  );
}

export function MetricsRail({ auctions }) {
  const totalBids = useMemo(
    () => auctions.reduce((acc, auction) => {
      const bidCount = typeof auction.bidCount === 'number'
        ? auction.bidCount
        : (auction.bids?.length ?? 0);
      return acc + bidCount;
    }, 0),
    [auctions]
  );

  const onChainCount = useMemo(
    () => auctions.filter((auction) => auction.blockchainVerified).length,
    [auctions]
  );

  const metrics = [
    { label: 'TOTAL_AUCTIONS', value: auctions.length },
    { label: 'ENCRYPTED_BIDS', value: totalBids },
    { label: 'ON_CHAIN', value: onChainCount },
    { label: 'PRIVACY_RATE', value: '100%' },
  ];

  return (
    <section className="metric-rail" aria-label="Protocol metrics">
      {metrics.map((metric) => (
        <MetricCell key={metric.label} {...metric} />
      ))}
    </section>
  );
}

const protocolCards = [
  {
    step: '01_ENCRYPTION',
    title: 'Client-Side Encryption',
    description: 'Bids encrypted using x25519 ECDH key exchange + Rescue cipher. Private keys never leave your device.',
    Icon: LockIcon,
  },
  {
    step: '02_MPC_COMPUTE',
    title: 'Arx Node Network',
    description: 'Distributed MPC nodes compute winner from encrypted bids. No single party sees plaintext amounts.',
    Icon: ComputeStackIcon,
  },
  {
    step: '03_REVEAL',
    title: 'Selective Decryption',
    description: 'Only winner address and amount revealed on-chain. Losing bids remain encrypted forever.',
    Icon: CheckCircleIcon,
  },
];

export function ProtocolArchitecture() {
  return (
    <section id="how-it-works" className="section-block">
      <div className="section-heading">
        <h3>Protocol Architecture</h3>
      </div>

      <div className="protocol-grid">
        {protocolCards.map(({ step, title, description, Icon }) => (
          <article className="protocol-card" key={step}>
            <div className="protocol-icon-box">
              {React.createElement(Icon, { size: 28, color: 'currentColor', strokeWidth: 1.8 })}
            </div>
            <div className="protocol-step">{step}</div>
            <h4>{title}</h4>
            <p>{description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

const securityRows = [
  {
    name: 'NO_FRONT_RUNNING',
    description: 'Encrypted bids prevent MEV bots from extracting value through transaction ordering.',
  },
  {
    name: 'NO_BID_SNIPING',
    description: 'Sealed-bid format eliminates last-second bidding advantages. Fair for all participants.',
  },
  {
    name: 'CRYPTOGRAPHIC_PRIVACY',
    description: 'Your bid amount is mathematically impossible to decrypt without your private key.',
  },
  {
    name: 'VERIFIABLE_EXECUTION',
    description: 'All computation proofs stored on Solana. Audit the entire process on-chain.',
  },
];

export function SecurityGuarantees() {
  return (
    <section className="section-block">
      <div className="section-heading">
        <h3>Security Guarantees</h3>
      </div>

      <div className="security-grid">
        {securityRows.map((row) => (
          <article className="security-card" key={row.name}>
            <div className="security-icon-box">
              <CheckCircleIcon size={20} color="currentColor" strokeWidth={1.8} />
            </div>
            <div>
              <div className="security-name">{row.name}</div>
              <div className="security-description">{row.description}</div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function TechnicalStack() {
  const entries = [
    ['BLOCKCHAIN', 'Solana'],
    ['MPC_NETWORK', 'Arcium'],
    ['KEY_EXCHANGE', 'x25519'],
    ['CIPHER', 'Rescue'],
  ];

  return (
    <section id="technical-stack" className="technical-stack-panel">
      <h3>Technical Stack</h3>

      <div className="technical-stack-grid">
        {entries.map(([label, value]) => (
          <div className="technical-stack-item" key={label}>
            <div className="technical-stack-label">{label}</div>
            <div className="technical-stack-value">{value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function LoadingSkeleton() {
  return (
    <div className="loading-panel" aria-label="Loading blockchain data">
      <div className="skeleton skeleton-dot" />
      <div className="loading-copy">
        <div className="skeleton skeleton-line skeleton-line-lg" />
        <div className="skeleton skeleton-line skeleton-line-sm" />
      </div>
    </div>
  );
}

export function EmptyAuctionsState({ onCreateAuction }) {
  return (
    <section className="empty-state">
      <EmptyAuctionIcon size={72} color="#5a5670" strokeWidth={1.4} />
      <h3>No active auctions</h3>
      <p>Your encrypted auction book is empty. Create a sealed-bid auction to start collecting private bids on devnet.</p>
      <button type="button" className="button-primary" onClick={onCreateAuction}>
        <PlusIcon size={14} strokeWidth={1.8} />
        Create Auction
      </button>
    </section>
  );
}
