import React, { useMemo } from 'react';
import AuctionCard from './AuctionCard';
import { LockIcon } from './icons';

const VIEWS = {
  ongoing: {
    label: 'Ongoing',
    title: 'Ongoing Auctions',
    subtitle: 'Open sealed-bid auctions still accepting encrypted bids.',
    empty: 'No ongoing auctions right now.',
  },
  awaiting: {
    label: 'Awaiting Resolution',
    title: 'Awaiting Resolution',
    subtitle: 'Ended auctions ready for MPC winner reveal.',
    empty: 'No auctions are waiting for resolution.',
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
  onBidRecorded,
}) {
  const view = activeView || 'ongoing';

  const handleViewChange = (nextView) => {
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
      <div className="inline-empty">
        <LockIcon size={36} color="#5a5670" strokeWidth={1.4} />
        <h3>No active auctions</h3>
        <p>Your encrypted bids will appear here.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="auction-list-header">
        <div className="auction-list-title">
          <span className="section-kicker">AUCTIONS</span>
          <h3>{VIEWS[view].title}</h3>
          <p>{VIEWS[view].subtitle}</p>
        </div>

        <div className="mobile-view-select">
          <label className="form-label" htmlFor="auction-view-select">VIEW</label>
          <select
            id="auction-view-select"
            value={view}
            onChange={(event) => handleViewChange(event.target.value)}
            className="form-select"
          >
            {Object.entries(VIEWS).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label} ({grouped[key].length})
              </option>
            ))}
          </select>
        </div>

        <div className="auction-tabs" role="tablist" aria-label="Auction status">
          {Object.entries(VIEWS).map(([key, config]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={view === key}
              onClick={() => handleViewChange(key)}
              className={view === key ? 'tab-button is-active' : 'tab-button'}
            >
              {config.label}
              <span className="tab-count">{grouped[key].length}</span>
            </button>
          ))}
        </div>
      </div>

      {visibleAuctions.length === 0 ? (
        <div className="inline-empty">
          <LockIcon size={32} color="#5a5670" strokeWidth={1.4} />
          <h3>{VIEWS[view].empty}</h3>
          <p>Your encrypted bids will appear here.</p>
        </div>
      ) : (
        <div className="auction-grid">
          {visibleAuctions.map((auction) => (
            <AuctionCard
              key={auction.auctionPDA || auction.id}
              auction={auction}
              onUpdateAuction={onUpdateAuction}
              onDeleteAuction={onDeleteAuction}
              onRefreshAuctionData={onRefreshAuctionData}
              onAuctionFinalized={onAuctionFinalized}
              onPinAuctionToOngoing={onPinAuctionToOngoing}
              onBidRecorded={onBidRecorded}
            />
          ))}
        </div>
      )}
    </div>
  );
}
