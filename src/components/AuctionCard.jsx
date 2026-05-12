import React, { useEffect, useState } from 'react';
import CountdownTimer from './CountdownTimer';
import BidSubmission from './BidSubmission';
import WinnerReveal from './WinnerReveal';
import { copyToClipboard } from '../utils/helpers';

export default function AuctionCard({
  auction,
  onUpdateAuction,
  onDeleteAuction,
  onRefreshAuctionData,
  onAuctionFinalized,
  onPinAuctionToOngoing,
}) {
  const ONGOING_GRACE_MS = 60000;
  const [showBidForm, setShowBidForm] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isEndedLive, setIsEndedLive] = useState(Date.now() >= auction.endTime);
  const [winnerCopied, setWinnerCopied] = useState(false);
  const isEnded = isEndedLive || Date.now() >= auction.endTime;
  const isFinalized = auction.status === 'finalized';
  const totalBids = typeof auction.bidCount === 'number' ? auction.bidCount : (auction.bids?.length ?? 0);
  const syncedBidCount = typeof auction.onChainBidCount === 'number' ? auction.onChainBidCount : totalBids;
  const isBidSyncPending = totalBids > syncedBidCount;
  const imageUrl = (auction.imageUrl || '').trim();
  const showImage = imageUrl && !imageError;
  const auctionTypeLabel = auction.auctionType === 'vickrey' ? 'Vickrey' : 'First-Price';
  const auctionTypeHint = auction.auctionType === 'vickrey'
    ? 'Winner pays second-highest bid'
    : 'Winner pays own bid';

  useEffect(() => {
    if (Date.now() >= auction.endTime) {
      setIsEndedLive(true);
      return undefined;
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
    onPinAuctionToOngoing?.(auction.auctionPDA || auction.id, Number(auction.endTime) + ONGOING_GRACE_MS);
    setShowBidForm(false);
    await onRefreshAuctionData?.();
  };

  const handleFinalized = async (winner, winningBid) => {
    onUpdateAuction(auction.id, {
      status: 'finalized',
      winner,
      winningBid,
    });
    onPinAuctionToOngoing?.(auction.auctionPDA || auction.id, Date.now() + ONGOING_GRACE_MS);
    await onRefreshAuctionData?.();
    onAuctionFinalized?.(auction.auctionPDA || auction.id, winner, winningBid);
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
    <div className="glass-card-hover p-6 animate-cascade">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-2xl font-display font-bold mb-2">{auction.itemName}</h3>
          <p className="text-gray-400 text-sm line-clamp-2">{auction.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/20"
            title={auctionTypeHint}
          >
            {auctionTypeLabel}
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
            isFinalized ? 'bg-green-500/20 text-green-400' :
            isEnded ? 'bg-orange-500/20 text-orange-400' :
            'bg-purple-500/20 text-purple-400'
          }`}>
            {isFinalized ? 'Finalized' : isEnded ? 'Awaiting Finalization' : 'Active'}
          </div>
          <button
            type="button"
            onClick={handleDelete}
            className="px-2 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 hover:bg-red-500/30 transition"
            title="Hide for this session"
          >
            Hide
          </button>
        </div>
      </div>

      <div className="mb-4">
        {showImage ? (
          <div className="w-full h-20 sm:h-24 rounded-xl border border-white/10 bg-white/5 overflow-hidden p-1">
            <img
              src={imageUrl}
              alt={auction.itemName}
              className="w-full h-full object-contain object-center rounded-lg"
              onError={() => setImageError(true)}
            />
          </div>
        ) : (
          <div className="w-full h-20 sm:h-24 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-sm text-gray-400">
            No item image
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/5 rounded-xl p-3">
          <p className="text-xs text-gray-400 mb-1">Minimum Bid</p>
          <p className="text-lg font-bold font-mono text-purple-400 flex items-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
            </svg>
            <span>{auction.minimumBid}</span>
          </p>
        </div>
        <div className="bg-white/5 rounded-xl p-3">
          <p className="text-xs text-gray-400 mb-1">Total Bids</p>
          <p className="text-lg font-bold">{totalBids}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3">
          <p className="text-xs text-gray-400 mb-1">Creator</p>
          <p className="text-sm font-mono truncate">
            {auction.creator.slice(0, 6)}...{auction.creator.slice(-4)}
          </p>
        </div>
        <div className="bg-white/5 rounded-xl p-3">
          <p className="text-xs text-gray-400 mb-1">Status</p>
          <div className="min-h-[1.5rem] flex items-center">
            {!isEnded && <CountdownTimer endTime={auction.endTime} onEnd={() => setIsEndedLive(true)} />}
            {isEnded && !isFinalized && (
              <p className="text-xs sm:text-sm font-semibold text-orange-400 leading-tight break-words">
                Awaiting Finalization
              </p>
            )}
            {isFinalized && <p className="text-sm font-semibold text-green-400">Complete</p>}
          </div>
        </div>
      </div>

      {totalBids > 0 && !isFinalized && (
        <div className="mb-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl flex items-center gap-3">
          <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-semibold text-purple-300">All Bids Encrypted</p>
            <p className="text-xs text-gray-400">Amounts hidden via Arcium MPC until auction ends</p>
          </div>
        </div>
      )}

      {isBidSyncPending && !isFinalized && (
        <div className="mb-4 p-3 bg-white/5 border border-white/10 rounded-xl">
          <p className="text-sm font-semibold text-white">Bid sync in progress</p>
          <p className="text-xs text-gray-400 mt-1">
            {syncedBidCount} bid{syncedBidCount === 1 ? '' : 's'} confirmed on-chain, {totalBids - syncedBidCount} still waiting for MPC callback settlement.
          </p>
        </div>
      )}

      {isFinalized && auction.winner && (
        <div className="mb-4 p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-lg font-display font-bold text-purple-300">Winner Revealed</p>
          </div>
          <div className="ml-9">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
              <p className="text-sm text-gray-400">Winner</p>
              <button
                type="button"
                onClick={handleCopyWinner}
                className="px-2 py-1 rounded-full text-xs font-semibold bg-white/5 text-gray-300 hover:bg-white/10 transition"
              >
                {winnerCopied ? 'Copied' : 'Copy address'}
              </button>
            </div>
            <p className="font-mono text-white mb-2 break-all text-sm">
              {auction.winner}
            </p>
            <p className="text-sm text-gray-400 mb-1">Winning Bid</p>
            <p className="text-2xl font-bold font-mono text-purple-400 flex items-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
              </svg>
              <span>{auction.winningBid.toFixed(4)}</span>
            </p>
          </div>
        </div>
      )}

      {!isEnded && !showBidForm && (
        <button
          onClick={() => setShowBidForm(true)}
          className="btn-primary w-full"
        >
          <svg className="w-5 h-5 inline-block mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Submit Encrypted Bid
        </button>
      )}

      {showBidForm && (
        <BidSubmission
          auction={auction}
          onBidSubmitted={handleBidSubmitted}
          onCancel={() => setShowBidForm(false)}
        />
      )}

      {isEnded && !isFinalized && (
        <WinnerReveal
          auction={auction}
          onFinalized={handleFinalized}
          onRefreshAuctionData={onRefreshAuctionData}
        />
      )}
    </div>
  );
}



