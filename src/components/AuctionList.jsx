import React, { useState } from 'react';
import AuctionCard from './AuctionCard';

export default function AuctionList({ auctions, onUpdateAuction }) {
  const [filter, setFilter] = useState('all');

  const filteredAuctions = auctions.filter(auction => {
    const isEnded = Date.now() >= auction.endTime;
    const isFinalized = auction.status === 'finalized';

    if (filter === 'active') return !isEnded && !isFinalized;
    if (filter === 'ended') return isEnded && !isFinalized;
    if (filter === 'finalized') return isFinalized;
    return true;
  });

  if (auctions.length === 0) {
    return (
      <div className="glass-card p-12 text-center animate-fade-in">
        <svg className="w-20 h-20 mx-auto mb-6 text-purple-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <h3 className="text-2xl font-display font-bold mb-2">No Auctions Yet</h3>
        <p className="text-gray-400 mb-6">Be the first to create a blind sealed-bid auction</p>
        <div className="inline-block bg-purple-500/10 border border-purple-500/30 rounded-xl px-6 py-3">
          <p className="text-sm text-gray-300">
            Click <span className="font-semibold text-purple-400">"Create New Auction"</span> above to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-xl font-semibold transition-all ${
            filter === 'all'
              ? 'bg-purple-600 text-white'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          All ({auctions.length})
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-xl font-semibold transition-all ${
            filter === 'active'
              ? 'bg-purple-600 text-white'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          Active ({auctions.filter(a => Date.now() < a.endTime && a.status !== 'finalized').length})
        </button>
        <button
          onClick={() => setFilter('ended')}
          className={`px-4 py-2 rounded-xl font-semibold transition-all ${
            filter === 'ended'
              ? 'bg-purple-600 text-white'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          Ended ({auctions.filter(a => Date.now() >= a.endTime && a.status !== 'finalized').length})
        </button>
        <button
          onClick={() => setFilter('finalized')}
          className={`px-4 py-2 rounded-xl font-semibold transition-all ${
            filter === 'finalized'
              ? 'bg-purple-600 text-white'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          Finalized ({auctions.filter(a => a.status === 'finalized').length})
        </button>
      </div>

      {/* Auctions Grid */}
      {filteredAuctions.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <p className="text-gray-400">No {filter} auctions found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredAuctions.map((auction, index) => (
            <div
              key={auction.id}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <AuctionCard
                auction={auction}
                onUpdateAuction={onUpdateAuction}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}