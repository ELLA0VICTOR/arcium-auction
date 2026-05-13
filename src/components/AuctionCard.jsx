import React, { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import CountdownTimer from './CountdownTimer';
import BidSubmission from './BidSubmission';
import WinnerReveal from './WinnerReveal';
import { copyToClipboard } from '../utils/helpers';
import {
  CheckCircleIcon,
  CopyIcon,
  LockIcon,
  TrashIcon,
} from './icons';

function formatAddress(address = '') {
  if (!address) return 'Unknown';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatSol(value) {
  return Number(value ?? 0).toLocaleString(undefined, {
    maximumFractionDigits: 4,
    minimumFractionDigits: 0,
  });
}

function getStatusConfig({ isFinalized, isEnded, totalBids }) {
  if (isFinalized) {
    return { key: 'closed', label: 'CLOSED' };
  }

  if (isEnded) {
    return { key: 'revealing', label: 'REVEALING' };
  }

  if (totalBids > 0) {
    return { key: 'encrypted', label: 'ENCRYPTED' };
  }

  return { key: 'active', label: 'ACTIVE' };
}

export default function AuctionCard({
  auction,
  onUpdateAuction,
  onDeleteAuction,
  onRefreshAuctionData,
  onAuctionFinalized,
  onPinAuctionToOngoing,
  onBidRecorded,
}) {
  const { publicKey } = useWallet();
  const BID_SETTLEMENT_PIN_MS = 60000;
  const RESULT_VISIBILITY_PIN_MS = 5 * 60 * 1000;
  const [showBidForm, setShowBidForm] = useState(false);
  const [showBidSuccess, setShowBidSuccess] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isEndedLive, setIsEndedLive] = useState(false);
  const [winnerCopied, setWinnerCopied] = useState(false);
  const isEnded = isEndedLive;
  const isFinalized = auction.status === 'finalized';
  const totalBids = typeof auction.bidCount === 'number' ? auction.bidCount : (auction.bids?.length ?? 0);
  const syncedBidCount = typeof auction.onChainBidCount === 'number' ? auction.onChainBidCount : totalBids;
  const isBidSyncPending = totalBids > syncedBidCount;
  const imageUrl = (auction.imageUrl || '').trim();
  const showImage = imageUrl && !imageError;
  const auctionTypeLabel = auction.auctionType === 'vickrey' ? 'VICKREY' : 'FIRST-PRICE';
  const auctionTypeHint = auction.auctionType === 'vickrey'
    ? 'Winner pays second-highest bid'
    : 'Winner pays own bid';
  const connectedWallet = publicKey?.toBase58();
  const walletBidCount = connectedWallet
    ? (auction.bids ?? []).filter((bid) => bid.bidder === connectedWallet).length
    : 0;
  const hasBidBefore = walletBidCount > 0;
  const isCreator = Boolean(connectedWallet && auction.creator === connectedWallet);
  const status = getStatusConfig({ isFinalized, isEnded, totalBids });

  useEffect(() => {
    if (Date.now() >= auction.endTime) {
      const settledTimer = setTimeout(() => setIsEndedLive(true), 0);
      return () => clearTimeout(settledTimer);
    }

    const delay = Math.max(0, auction.endTime - Date.now() + 50);
    const timer = setTimeout(() => setIsEndedLive(true), delay);
    return () => clearTimeout(timer);
  }, [auction.endTime]);

  const handleBidSubmitted = async (encryptedBid) => {
    const updatedBids = [...(auction.bids ?? []), encryptedBid];
    onUpdateAuction(auction.id, {
      bids: updatedBids,
      bidCount: Math.max(totalBids + 1, updatedBids.length),
    });
    onBidRecorded?.(auction, encryptedBid);
    onPinAuctionToOngoing?.(auction.auctionPDA || auction.id, Number(auction.endTime) + BID_SETTLEMENT_PIN_MS);
    setShowBidForm(false);
    setShowBidSuccess(true);
    await onRefreshAuctionData?.();
  };

  const handleFinalized = async (winner, winningBid) => {
    onUpdateAuction(auction.id, {
      status: 'finalized',
      winner,
      winningBid,
    });
    onPinAuctionToOngoing?.(auction.auctionPDA || auction.id, Date.now() + RESULT_VISIBILITY_PIN_MS);
    onAuctionFinalized?.(auction.auctionPDA || auction.id, winner, winningBid);
    await onRefreshAuctionData?.();
  };

  const handleDelete = () => {
    if (!onDeleteAuction) return;
    const confirmed = window.confirm('Hide this auction for this session? This does not affect on-chain data.');
    if (!confirmed) return;
    onDeleteAuction(auction.id);
  };

  const handleCopyWinner = async () => {
    if (!auction.winner) return;
    const copied = await copyToClipboard(auction.winner);
    if (!copied) return;
    setWinnerCopied(true);
    setTimeout(() => setWinnerCopied(false), 1500);
  };

  return (
    <>
      <article className={showImage ? 'auction-card auction-card-has-media' : 'auction-card'}>
        {showImage && (
          <div className="auction-media">
            <img
              src={imageUrl}
              alt={auction.itemName}
              onError={() => setImageError(true)}
            />
          </div>
        )}

        <div className="auction-detail-card">
          <div className="auction-card-header">
            <div className="auction-title">
              <h4>{auction.itemName}</h4>
              <p>{auction.description}</p>
            </div>

            <div className="auction-header-actions">
              <span className="type-badge" title={auctionTypeHint}>{auctionTypeLabel}</span>
              <span className={`status-badge status-badge-${status.key}`}>
                {status.key === 'active' && <span className="status-dot status-dot-success" />}
                {status.key === 'encrypted' && <span className="status-dot status-dot-mpc" />}
                {status.label}
              </span>
              <button
                type="button"
                className="button-icon"
                onClick={handleDelete}
                title="Hide for this session"
                aria-label="Hide auction"
              >
                <TrashIcon size={15} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          <div className="auction-card-body">
            <div className="auction-data-grid">
              <div className="auction-data-cell">
                <div className="auction-data-label">Minimum Bid</div>
                <div className="auction-data-value">SOL {formatSol(auction.minimumBid)}</div>
              </div>
              <div className="auction-data-cell">
                <div className="auction-data-label">Bid Count</div>
                <div className="auction-data-value">{totalBids}</div>
              </div>
              <div className="auction-data-cell">
                <div className="auction-data-label">Creator</div>
                <div className="auction-data-value truncate">{formatAddress(auction.creator)}</div>
              </div>
            </div>

            <div className="countdown-wrap">
              {!isEnded && <CountdownTimer endTime={auction.endTime} onEnd={() => setIsEndedLive(true)} />}
              {isEnded && !isFinalized && (
                <span className="status-badge status-badge-revealing">AWAITING FINALIZATION</span>
              )}
              {isFinalized && <span className="status-badge status-badge-closed">COMPLETE</span>}
            </div>

            {totalBids > 0 && !isFinalized && (
              <div className="state-panel">
                <LockIcon size={16} color="#9b8ff5" strokeWidth={1.5} />
                <div>
                  <strong>All bids encrypted</strong>
                  <p>Amounts stay sealed through Arcium MPC until the auction resolves.</p>
                </div>
              </div>
            )}

            {isBidSyncPending && !isFinalized && (
              <div className="state-panel state-panel-warning">
                <LockIcon size={16} color="#fbbf24" strokeWidth={1.5} />
                <div>
                  <strong>Bid sync in progress</strong>
                  <p>
                    {syncedBidCount} bid{syncedBidCount === 1 ? '' : 's'} confirmed on-chain, {totalBids - syncedBidCount} waiting for MPC callback settlement.
                  </p>
                </div>
              </div>
            )}

            {isFinalized && auction.winner && (
              <div className="winner-panel">
                <div className="winner-header">
                  <CheckCircleIcon size={17} color="#34d399" strokeWidth={1.5} />
                  Winner Revealed
                </div>
                <div className="winner-meta">
                  <div className="winner-label">WINNING ADDRESS</div>
                  <div className="winner-address">{auction.winner}</div>
                  <button
                    type="button"
                    onClick={handleCopyWinner}
                    className="button-ghost"
                  >
                    <CopyIcon size={13} strokeWidth={1.5} />
                    {winnerCopied ? 'Copied' : 'Copy address'}
                  </button>
                  <div className="winner-label">WINNING BID</div>
                  <div className="winner-amount">SOL {formatSol(auction.winningBid)}</div>
                </div>
              </div>
            )}

            {!isEnded && hasBidBefore && !isCreator && (
              <div className="state-panel state-panel-success">
                <CheckCircleIcon size={16} color="#34d399" strokeWidth={1.5} />
                <div>
                  <strong>{walletBidCount} encrypted bid{walletBidCount === 1 ? '' : 's'} submitted</strong>
                  <p>You can submit another sealed bid before the timer ends.</p>
                </div>
              </div>
            )}

            {!isEnded && isCreator && (
              <div className="state-panel state-panel-danger">
                <LockIcon size={16} color="#ef4444" strokeWidth={1.5} />
                <div>
                  <strong>Creator bidding is locked</strong>
                  <p>Auction creators cannot bid on their own auction.</p>
                </div>
              </div>
            )}

            {isEnded && !isFinalized && isCreator && (
              <WinnerReveal
                auction={auction}
                onFinalized={handleFinalized}
                onRefreshAuctionData={onRefreshAuctionData}
              />
            )}

            {isEnded && !isFinalized && !isCreator && (
              <div className="state-panel">
                <LockIcon size={16} color="#9b8ff5" strokeWidth={1.5} />
                <div>
                  <strong>Awaiting creator finalization</strong>
                  <p>Only the auction creator can trigger MPC finalization. The winner will appear here once the result is published.</p>
                </div>
              </div>
            )}
          </div>

          <div className="auction-card-footer">
            <span className="bid-count">
              {totalBids} encrypted bid{totalBids === 1 ? '' : 's'}
            </span>

            {!isEnded ? (
              <button
                type="button"
                onClick={() => setShowBidForm(true)}
                className="action-link"
                disabled={isCreator}
              >
                <span>{isCreator ? 'Creator cannot bid' : hasBidBefore ? 'Place another bid' : 'Place encrypted bid'}</span>
                <span>-&gt;</span>
              </button>
            ) : (
              <span className="bid-count">{isFinalized ? 'Closed' : 'Reveal available'}</span>
            )}
          </div>
        </div>
      </article>

      {showBidForm && (
        <div className="modal-overlay" onClick={() => setShowBidForm(false)}>
          <div className="modal-panel" onClick={(event) => event.stopPropagation()}>
            <BidSubmission
              auction={auction}
              onBidSubmitted={handleBidSubmitted}
              onCancel={() => setShowBidForm(false)}
            />
          </div>
        </div>
      )}

      {showBidSuccess && (
        <div className="modal-overlay" onClick={() => setShowBidSuccess(false)}>
          <div className="bid-success-panel" onClick={(event) => event.stopPropagation()}>
            <div className="bid-success-icon">
              <CheckCircleIcon size={56} color="currentColor" strokeWidth={1.35} />
            </div>
            <h3>Bid Successful</h3>
            <p>Your encrypted bid was sealed on-chain. The amount stays private until MPC resolution.</p>
            <div className="modal-actions">
              {!isEnded && !isCreator && (
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => {
                    setShowBidSuccess(false);
                    setShowBidForm(true);
                  }}
                >
                  Place another bid
                </button>
              )}
              <button
                type="button"
                className="button-primary"
                onClick={() => setShowBidSuccess(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
