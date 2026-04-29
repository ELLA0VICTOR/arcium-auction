import React, { useEffect, useMemo, useState } from 'react';
import AuctionCard from './AuctionCard';

const VIEWS = {
  ongoing: {
    label: 'Ongoing',
    title: 'Ongoing Auctions',
    subtitle: 'Open sealed-bid auctions still accepting encrypted bids.',
    empty: 'No ongoing auctions right now.',
  },
  awaiting: {
    label: 'Awaiting Finalization',
    title: 'Awaiting Finalization',
    subtitle: 'Auctions that have ended and are ready for MPC winner reveal.',
    empty: 'No auctions are waiting for finalization.',
  },
  finalized: {
    label: 'Finalized',
    title: 'Finalized Auctions',
    subtitle: 'Completed auctions with published winner results.',
    empty: 'No finalized auctions yet.',
  },
};

function getAuctionView(auction, pinnedView = null) {
  if (pinnedView) return pinnedView;

  const isEnded = Date.now() >= auction.endTime;
  const isFinalized = auction.status === 'finalized';

  if (isFinalized) return 'finalized';
  if (isEnded) return 'awaiting';
  return 'ongoing';
}

export default function AuctionList({
  auctions,
  onUpdateAuction,
  onDeleteAuction,
  onRefreshAuctionData,
  activeView,
  onViewChange,
  onAuctionFinalized,
  getPinnedView,
  onPinAuctionToOngoing,
}) {
  const [view, setView] = useState(activeView || 'ongoing');

  useEffect(() => {
    if (activeView && activeView !== view) {
      setView(activeView);
    }
  }, [activeView, view]);

  const handleViewChange = (nextView) => {
    setView(nextView);
    onViewChange?.(nextView);
  };

  const grouped = useMemo(() => {
    return auctions.reduce(
      (acc, auction) => {
        const bucket = getAuctionView(auction, getPinnedView?.(auction) ?? null);
        acc[bucket].push(auction);
        return acc;
      },
      { ongoing: [], awaiting: [], finalized: [] }
    );
  }, [auctions, getPinnedView]);

  const visibleAuctions = grouped[view];

  if (auctions.length === 0) {
    return (
      <div className="glass-card p-12 text-center animate-fade-in">
        <svg className="w-20 h-20 mx-auto mb-6 text-purple-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <h3 className="text-2xl font-display font-bold mb-2">No Auctions Yet</h3>
        <p className="text-gray-400 mb-6">Be the first to create a blind sealed-bid auction.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-2xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>
            {VIEWS[view].title}
          </h3>
          <p className="mt-2 text-sm font-body" style={{ color: 'var(--text-secondary)' }}>
            {VIEWS[view].subtitle}
          </p>
        </div>

        <div className="md:hidden">
          <label className="block text-xs font-mono mb-2" style={{ color: 'var(--text-secondary)' }}>
            VIEW
          </label>
          <select
            value={view}
            onChange={(event) => handleViewChange(event.target.value)}
            className="input-field w-full"
          >
            {Object.entries(VIEWS).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label} ({grouped[key].length})
              </option>
            ))}
          </select>
        </div>

        <div className="hidden md:flex items-center gap-3">
          {Object.entries(VIEWS).map(([key, config]) => (
            <button
              key={key}
              type="button"
              onClick={() => handleViewChange(key)}
              className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                view === key
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {config.label} ({grouped[key].length})
            </button>
          ))}
        </div>
      </div>

      {visibleAuctions.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <p className="text-gray-400">{VIEWS[view].empty}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {visibleAuctions.map((auction, index) => (
            <div
              key={auction.auctionPDA || auction.id}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <AuctionCard
                auction={auction}
                onUpdateAuction={onUpdateAuction}
                onDeleteAuction={onDeleteAuction}
                onRefreshAuctionData={onRefreshAuctionData}
                onAuctionFinalized={onAuctionFinalized}
                onPinAuctionToOngoing={onPinAuctionToOngoing}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}



