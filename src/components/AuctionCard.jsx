import React, { useState } from 'react';
import CountdownTimer from './CountdownTimer';
import BidSubmission from './BidSubmission';
import WinnerReveal from './WinnerReveal';

export default function AuctionCard({ auction, onUpdateAuction }) {
  const [showBidForm, setShowBidForm] = useState(false);
  const isEnded = Date.now() >= auction.endTime;
  const isFinalized = auction.status === 'finalized';

  const handleBidSubmitted = (encryptedBid) => {
    const updatedBids = [...auction.bids, encryptedBid];
    onUpdateAuction(auction.id, { bids: updatedBids });
    setShowBidForm(false);
  };

  const handleFinalized = (winner, winningBid) => {
    onUpdateAuction(auction.id, {
      status: 'finalized',
      winner,
      winningBid,
    });
  };

  return (
    <div className="glass-card-hover p-6 animate-cascade">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-2xl font-display font-bold mb-2">{auction.itemName}</h3>
          <p className="text-gray-400 text-sm line-clamp-2">{auction.description}</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
          isFinalized ? 'bg-green-500/20 text-green-400' :
          isEnded ? 'bg-orange-500/20 text-orange-400' :
          'bg-purple-500/20 text-purple-400'
        }`}>
          {isFinalized ? 'Finalized' : isEnded ? 'Ended' : 'Active'}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/5 rounded-xl p-3">
          <p className="text-xs text-gray-400 mb-1">Minimum Bid</p>
          <p className="text-lg font-bold font-mono text-purple-400">◎ {auction.minimumBid}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3">
          <p className="text-xs text-gray-400 mb-1">Total Bids</p>
          <p className="text-lg font-bold">{auction.bids.length}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3">
          <p className="text-xs text-gray-400 mb-1">Creator</p>
          <p className="text-sm font-mono truncate">
            {auction.creator.slice(0, 6)}...{auction.creator.slice(-4)}
          </p>
        </div>
        <div className="bg-white/5 rounded-xl p-3">
          <p className="text-xs text-gray-400 mb-1">Status</p>
          {!isEnded && <CountdownTimer endTime={auction.endTime} onEnd={() => {}} />}
          {isEnded && !isFinalized && <p className="text-sm font-semibold text-orange-400">Awaiting Finalization</p>}
          {isFinalized && <p className="text-sm font-semibold text-green-400">Complete</p>}
        </div>
      </div>

      {/* Bid Privacy Indicator */}
      {auction.bids.length > 0 && !isFinalized && (
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

      {/* Winner Display */}
      {isFinalized && auction.winner && (
        <div className="mb-4 p-4 bg-gradient-to-r from-green-500/20 to-purple-500/20 border border-green-500/30 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-lg font-display font-bold text-green-400">Winner Revealed</p>
          </div>
          <div className="ml-9">
            <p className="text-sm text-gray-400 mb-1">Winner</p>
            <p className="font-mono text-white mb-2">
              {auction.winner.slice(0, 8)}...{auction.winner.slice(-8)}
            </p>
            <p className="text-sm text-gray-400 mb-1">Winning Bid</p>
            <p className="text-2xl font-bold font-mono text-gradient">◎ {auction.winningBid.toFixed(4)}</p>
          </div>
        </div>
      )}

      {/* Actions */}
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
        />
      )}
    </div>
  );
}