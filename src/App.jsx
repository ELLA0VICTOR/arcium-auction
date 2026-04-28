import React, { useMemo, useState, useEffect } from 'react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider, useWallet } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { clusterApiUrl } from '@solana/web3.js';

import '@solana/wallet-adapter-react-ui/styles.css';

import WalletConnect from './components/WalletConnect';
import AuctionCreator from './components/AuctionCreator';
import AuctionList from './components/AuctionList';
import { AUCTION_PROGRAM_ID, fetchAllAuctionsOnChain } from './utils/programInstructions';
import { fetchAuctionMetadata, fetchAuctionResolutions } from './utils/auctionApi';

function AppContent() {
  const { publicKey, connected } = useWallet();
  const [auctions, setAuctions] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isLoadingBlockchainData, setIsLoadingBlockchainData] = useState(false);
  const storageKey = `arcium_auctions:${AUCTION_PROGRAM_ID.toBase58()}`;

  const getAuctionKey = (auction) => auction.auctionPDA || auction.id;

  const mergeAuctionSources = (localAuctions, chainAuctions) => {
    const localByKey = new Map(localAuctions.map((auction) => [getAuctionKey(auction), auction]));

    return chainAuctions.map((chainAuction) => {
      const localAuction = localByKey.get(getAuctionKey(chainAuction));
      if (!localAuction) return chainAuction;

      const localBids = localAuction.bids ?? [];
      const localBidCount = Number(localAuction.bidCount ?? localBids.length ?? 0);
      const chainBidCount = Number(chainAuction.bidCount ?? chainAuction.bids?.length ?? 0);
      const visibleBidCount = Math.max(localBidCount, chainBidCount);
      const visibleBids = localBidCount >= chainBidCount ? localBids : (chainAuction.bids ?? []);

      return {
        ...localAuction,
        ...chainAuction,
        id: chainAuction.id,
        auctionPDA: chainAuction.auctionPDA,
        creator: chainAuction.creator,
        itemName: chainAuction.itemName || localAuction.itemName,
        description: localAuction.description || chainAuction.description,
        imageUrl: localAuction.imageUrl || chainAuction.imageUrl,
        minimumBid: chainAuction.minimumBid,
        endTime: chainAuction.endTime,
        auctionType: chainAuction.auctionType,
        status: chainAuction.status,
        bidCount: visibleBidCount,
        onChainBidCount: chainAuction.onChainBidCount ?? chainBidCount,
        bids: visibleBids,
        createdAt: localAuction.createdAt || chainAuction.createdAt,
        computationOffset: localAuction.computationOffset || chainAuction.computationOffset,
        onChainSignature: localAuction.onChainSignature || chainAuction.onChainSignature,
        blockchainVerified: true,
      };
    });
  };

  const dedupeAuctions = (auctionList) => {
    const deduped = new Map();

    for (const auction of auctionList) {
      const key = getAuctionKey(auction);
      const existing = deduped.get(key);

      if (!existing) {
        deduped.set(key, auction);
        continue;
      }

      const existingBidCount = Number(existing.bidCount ?? existing.bids?.length ?? 0);
      const nextBidCount = Number(auction.bidCount ?? auction.bids?.length ?? 0);

      deduped.set(key, {
        ...existing,
        ...auction,
        description: auction.description || existing.description,
        imageUrl: auction.imageUrl || existing.imageUrl,
        createdAt: auction.createdAt || existing.createdAt,
        bidCount: Math.max(existingBidCount, nextBidCount),
        onChainBidCount: Math.max(
          Number(existing.onChainBidCount ?? 0),
          Number(auction.onChainBidCount ?? 0)
        ),
        bids: nextBidCount >= existingBidCount ? (auction.bids ?? []) : (existing.bids ?? []),
      });
    }

    return [...deduped.values()].sort((a, b) => b.endTime - a.endTime);
  };

  const applySharedMetadata = (auctionList, metadataByAuction) =>
    auctionList.map((auction) => {
      const metadata = metadataByAuction[auction.auctionPDA || auction.id];
      if (!metadata) return auction;

      return {
        ...auction,
        description: metadata.description || auction.description,
        imageUrl: metadata.imageUrl || auction.imageUrl,
        createdAt: metadata.createdAt || auction.createdAt,
      };
    });

  const applyResolutions = (auctionList, resolutionsByAuction) =>
    auctionList.map((auction) => {
      const resolution = resolutionsByAuction[auction.auctionPDA || auction.id];
      if (!resolution) return auction;

      return {
        ...auction,
        winner: resolution.winner,
        winningBid: resolution.paymentAmountSol,
        resolutionSignature: resolution.signature,
      };
    });

  const loadAuctionData = async () => {
    setIsLoadingBlockchainData(true);
    try {
      console.log('Loading shared auction data...');
      const [chainAuctions, metadataByAuction] = await Promise.all([
        fetchAllAuctionsOnChain(),
        fetchAuctionMetadata(),
      ]);
      const savedAuctions = localStorage.getItem(storageKey);
      const localAuctions = savedAuctions ? JSON.parse(savedAuctions) : [];
      const mergedAuctions = mergeAuctionSources(localAuctions, chainAuctions);
      const withMetadata = applySharedMetadata(mergedAuctions, metadataByAuction);
      const finalizedAuctionPdas = withMetadata
        .filter((auction) => auction.status === 'finalized')
        .map((auction) => auction.auctionPDA)
        .filter(Boolean);
      const resolutionsByAuction = await fetchAuctionResolutions(finalizedAuctionPdas);
      const fullyHydratedAuctions = dedupeAuctions(applyResolutions(withMetadata, resolutionsByAuction));

      setAuctions(fullyHydratedAuctions);
      localStorage.setItem(storageKey, JSON.stringify(fullyHydratedAuctions));
      console.log('Shared auction data loaded');
      return fullyHydratedAuctions;
    } catch (error) {
      console.error('Error loading auction data:', error);
      return [];
    } finally {
      setIsLoadingBlockchainData(false);
    }
  };

  useEffect(() => {
    loadAuctionData();
  }, []);

  useEffect(() => {
    if (connected && publicKey) {
      loadAuctionData();
    }
  }, [connected, publicKey]);

  const handleCreateAuction = async (newAuction) => {
    setShowCreateForm(false);
    const refreshedAuctions = await loadAuctionData();

    if (!refreshedAuctions.some((auction) => getAuctionKey(auction) === newAuction.auctionPDA)) {
      const updatedAuctions = dedupeAuctions([newAuction, ...refreshedAuctions]);
      setAuctions(updatedAuctions);
      localStorage.setItem(storageKey, JSON.stringify(updatedAuctions));
    }
  };

  const handleUpdateAuction = (auctionId, updates) => {
    const updatedAuctions = auctions.map((auction) => {
      const matches =
        auction.id === auctionId ||
        auction.auctionPDA === auctionId;

      return matches ? { ...auction, ...updates } : auction;
    });
    setAuctions(updatedAuctions);
    localStorage.setItem(storageKey, JSON.stringify(updatedAuctions));
  };

  const handleDeleteAuction = (auctionId) => {
    const updatedAuctions = auctions.filter(
      (auction) => auction.id !== auctionId && auction.auctionPDA !== auctionId
    );
    setAuctions(updatedAuctions);
    localStorage.setItem(storageKey, JSON.stringify(updatedAuctions));
  };

  useEffect(() => {
    const interval = setInterval(() => {
      loadAuctionData();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <header className="border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="container mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none">
              <rect x="8" y="8" width="16" height="16" stroke="#8B5CF6" strokeWidth="2" fill="none"/>
              <rect x="12" y="12" width="8" height="8" fill="#8B5CF6"/>
            </svg>
            <div>
              <h1 className="text-xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>
                Arcium Auction
              </h1>
              <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                MPC-SECURED
              </p>
            </div>
          </div>
          <WalletConnect />
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        {isLoadingBlockchainData && (
          <div className="mb-8 glass-card p-4 flex items-center gap-3 animate-fade-in">
            <svg className="animate-spin h-5 w-5" style={{ color: 'var(--purple-accent)' }} fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>
              Loading blockchain data...
            </span>
          </div>
        )}

        <div className="mb-20 animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <div className="px-2 py-1 text-xs font-mono font-bold tracking-wider"
                 style={{
                   background: 'var(--purple-accent)',
                   color: 'white',
                   borderRadius: '2px'
                 }}>
              MPC-SECURED
            </div>
            <div className="px-2 py-1 text-xs font-mono"
                 style={{
                   border: '1px solid var(--border-subtle)',
                   borderRadius: '2px',
                   color: 'var(--text-secondary)'
                 }}>
              SOLANA DEVNET
            </div>
            {connected && (
              <div className="px-2 py-1 text-xs font-mono animate-fade-in"
                   style={{
                     border: '1px solid var(--purple-accent)',
                     borderRadius: '2px',
                     color: 'var(--purple-accent)'
                   }}>
                 BLOCKCHAIN SYNCED
              </div>
            )}
          </div>
          <h2 className="text-6xl font-display font-bold mb-4 leading-tight" style={{ color: 'var(--text-primary)' }}>
            Blind Sealed-Bid<br/>Auctions
          </h2>
          <p className="text-base mb-8 max-w-2xl font-body" style={{ color: 'var(--text-secondary)' }}>
            Zero-knowledge bidding protocol. Arcium's Multi-Party Computation network ensures complete bid privacy until winner reveal. No front-running. No bid sniping. Cryptographically guaranteed fairness.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="btn-primary animate-scale-in animation-delay-200"
            >
              Create Auction
            </button>
            <button
              className="btn-secondary"
              onClick={() => document.getElementById('how-it-works').scrollIntoView({ behavior: 'smooth' })}
            >
              View Protocol
            </button>
            {connected && !isLoadingBlockchainData && (
              <button
                onClick={loadAuctionData}
                className="btn-secondary animate-fade-in"
                title="Refresh auctions"
              >
                Refresh
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20 animate-slide-up animation-delay-100">
          <div className="glass-card p-4">
            <div className="text-3xl font-display font-bold mb-1" style={{ color: 'var(--purple-accent)' }}>
              {auctions.length}
            </div>
            <div className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
              TOTAL_AUCTIONS
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="text-3xl font-display font-bold mb-1" style={{ color: 'var(--purple-accent)' }}>
              {auctions.reduce((acc, a) => acc + (typeof a.bidCount === 'number' ? a.bidCount : a.bids.length), 0)}
            </div>
            <div className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
              ENCRYPTED_BIDS
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="text-3xl font-display font-bold mb-1" style={{ color: 'var(--purple-accent)' }}>
              {auctions.filter(a => a.blockchainVerified).length}
            </div>
            <div className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
              ON_CHAIN
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="text-3xl font-display font-bold mb-1" style={{ color: 'var(--purple-accent)' }}>
              100%
            </div>
            <div className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
              PRIVACY_RATE
            </div>
          </div>
        </div>

        <div id="how-it-works" className="mb-20 animate-slide-up animation-delay-200">
          <h3 className="text-2xl font-display font-bold mb-8" style={{ color: 'var(--text-primary)' }}>
            Protocol Architecture
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="glass-card-hover p-6">
              <div className="w-12 h-12 mb-4 flex items-center justify-center"
                   style={{
                     background: 'var(--bg-tertiary)',
                     border: '1px solid var(--purple-accent)',
                     borderRadius: '4px'
                   }}>
                <svg className="w-6 h-6" style={{ color: 'var(--purple-accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="text-sm font-mono mb-2" style={{ color: 'var(--purple-accent)' }}>
                01_ENCRYPTION
              </div>
              <h4 className="text-lg font-display font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                Client-Side Encryption
              </h4>
              <p className="text-sm font-body leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Bids encrypted using x25519 ECDH key exchange + Rescue cipher. Private keys never leave your device.
              </p>
            </div>

            <div className="glass-card-hover p-6">
              <div className="w-12 h-12 mb-4 flex items-center justify-center"
                   style={{
                     background: 'var(--bg-tertiary)',
                     border: '1px solid var(--purple-accent)',
                     borderRadius: '4px'
                   }}>
                <svg className="w-6 h-6" style={{ color: 'var(--purple-accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div className="text-sm font-mono mb-2" style={{ color: 'var(--purple-accent)' }}>
                02_MPC_COMPUTE
              </div>
              <h4 className="text-lg font-display font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                Arx Node Network
              </h4>
              <p className="text-sm font-body leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Distributed MPC nodes compute winner from encrypted bids. No single party sees plaintext amounts.
              </p>
            </div>

            <div className="glass-card-hover p-6">
              <div className="w-12 h-12 mb-4 flex items-center justify-center"
                   style={{
                     background: 'var(--bg-tertiary)',
                     border: '1px solid var(--purple-accent)',
                     borderRadius: '4px'
                   }}>
                <svg className="w-6 h-6" style={{ color: 'var(--purple-accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-sm font-mono mb-2" style={{ color: 'var(--purple-accent)' }}>
                03_REVEAL
              </div>
              <h4 className="text-lg font-display font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                Selective Decryption
              </h4>
              <p className="text-sm font-body leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Only winner address and amount revealed on-chain. Losing bids remain encrypted forever.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-20 animate-slide-up animation-delay-300">
          <h3 className="text-2xl font-display font-bold mb-8" style={{ color: 'var(--text-primary)' }}>
            Security Guarantees
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="glass-card p-5 flex items-start gap-4">
              <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center"
                   style={{
                     background: 'var(--purple-accent)',
                     borderRadius: '4px'
                   }}>
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-mono text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                  NO_FRONT_RUNNING
                </div>
                <p className="text-xs font-body" style={{ color: 'var(--text-secondary)' }}>
                  Encrypted bids prevent MEV bots from extracting value through transaction ordering.
                </p>
              </div>
            </div>

            <div className="glass-card p-5 flex items-start gap-4">
              <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center"
                   style={{
                     background: 'var(--purple-accent)',
                     borderRadius: '4px'
                   }}>
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-mono text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                  NO_BID_SNIPING
                </div>
                <p className="text-xs font-body" style={{ color: 'var(--text-secondary)' }}>
                  Sealed-bid format eliminates last-second bidding advantages. Fair for all participants.
                </p>
              </div>
            </div>

            <div className="glass-card p-5 flex items-start gap-4">
              <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center"
                   style={{
                     background: 'var(--purple-accent)',
                     borderRadius: '4px'
                   }}>
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-mono text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                  CRYPTOGRAPHIC_PRIVACY
                </div>
                <p className="text-xs font-body" style={{ color: 'var(--text-secondary)' }}>
                  Your bid amount is mathematically impossible to decrypt without your private key.
                </p>
              </div>
            </div>

            <div className="glass-card p-5 flex items-start gap-4">
              <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center"
                   style={{
                     background: 'var(--purple-accent)',
                     borderRadius: '4px'
                   }}>
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-mono text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                  VERIFIABLE_EXECUTION
                </div>
                <p className="text-xs font-body" style={{ color: 'var(--text-secondary)' }}>
                  All computation proofs stored on Solana. Audit the entire process on-chain.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-20 glass-card p-8 animate-slide-up animation-delay-400">
          <h3 className="text-xl font-display font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
            Technical Stack
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="text-xs font-mono mb-2" style={{ color: 'var(--text-secondary)' }}>
                BLOCKCHAIN
              </div>
              <div className="font-mono text-sm" style={{ color: 'var(--text-primary)' }}>
                Solana
              </div>
            </div>
            <div>
              <div className="text-xs font-mono mb-2" style={{ color: 'var(--text-secondary)' }}>
                MPC_NETWORK
              </div>
              <div className="font-mono text-sm" style={{ color: 'var(--text-primary)' }}>
                Arcium
              </div>
            </div>
            <div>
              <div className="text-xs font-mono mb-2" style={{ color: 'var(--text-secondary)' }}>
                KEY_EXCHANGE
              </div>
              <div className="font-mono text-sm" style={{ color: 'var(--text-primary)' }}>
                x25519
              </div>
            </div>
            <div>
              <div className="text-xs font-mono mb-2" style={{ color: 'var(--text-secondary)' }}>
                CIPHER
              </div>
              <div className="font-mono text-sm" style={{ color: 'var(--text-primary)' }}>
                Rescue
              </div>
            </div>
          </div>
        </div>

        {showCreateForm && (
          <div
            className="fixed inset-0 z-50 overflow-y-auto animate-fade-in"
            style={{ background: 'rgba(0, 0, 0, 0.8)' }}
            onClick={() => setShowCreateForm(false)}
          >
            <div className="min-h-full flex items-start justify-center px-3 py-4 sm:px-4 sm:py-8">
              <div
                className="w-full max-w-2xl animate-slide-up"
                onClick={(e) => e.stopPropagation()}
              >
                <AuctionCreator
                  onCreateAuction={handleCreateAuction}
                  onCancel={() => setShowCreateForm(false)}
                />
              </div>
            </div>
          </div>
        )}

        {auctions.length > 0 && (
          <div>
            <AuctionList
              auctions={auctions}
              onUpdateAuction={handleUpdateAuction}
              onDeleteAuction={handleDeleteAuction}
              onRefreshAuctionData={loadAuctionData}
            />
          </div>
        )}

        {auctions.length === 0 && connected && !isLoadingBlockchainData && (
          <div className="glass-card p-12 text-center animate-fade-in">
            <svg className="w-16 h-16 mx-auto mb-4 opacity-50" style={{ color: 'var(--text-secondary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <h3 className="text-xl font-display font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              No Auctions Yet
            </h3>
            <p className="text-sm font-body mb-6" style={{ color: 'var(--text-secondary)' }}>
              Create your first blind auction to get started
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn-primary"
            >
              Create Auction
            </button>
          </div>
        )}
      </main>

      <footer className="mt-20 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="container mx-auto px-6 py-6 text-center font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
          <p>
            Powered by Arcium MPC on Solana Devnet - Data Persists On-Chain
          </p>
        </div>
      </footer>
    </div>
  );
}

function App() {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
    ],
    [network]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <AppContent />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;

