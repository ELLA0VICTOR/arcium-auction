import React, { useMemo, useState, useEffect, useRef } from 'react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider, useWallet } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { clusterApiUrl } from '@solana/web3.js';

import '@solana/wallet-adapter-react-ui/styles.css';

import WalletConnect from './components/WalletConnect';
import AuctionCreator from './components/AuctionCreator';
import AuctionList from './components/AuctionList';
import {
  EmptyAuctionsState,
  LoadingSkeleton,
  MetricsRail,
  ProtocolArchitecture,
  SecurityGuarantees,
  TechnicalStack,
} from './components/DashboardSections';
import {
  PlusIcon,
  RefreshIcon,
} from './components/icons';
import { fetchAllAuctionsOnChain } from './utils/programInstructions';
import { fetchAuctionMetadata, fetchAuctionResolutions } from './utils/auctionApi';

const ONGOING_GRACE_MS = 60000;
const BID_HISTORY_STORAGE_KEY = 'arcium-auction:bid-history:v1';
const MAX_STORED_BID_RECORDS = 200;

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'active-bids', label: 'Active Bids' },
  { id: 'bid-history', label: 'Bid History' },
  { id: 'faq', label: 'FAQ' },
];

const FAQ_ITEMS = [
  {
    id: 'sealed-bid',
    question: 'What is a sealed-bid auction?',
    answer: 'A sealed-bid auction lets everyone submit bids privately. No bidder can see another bidder\'s amount while the auction is active, so the winning price is not influenced by public bid chasing.',
  },
  {
    id: 'privacy',
    question: 'Who can see my bid amount?',
    answer: 'Your bid amount is encrypted before submission. The public chain can confirm that a bid exists, but the amount stays hidden until the auction is resolved.',
  },
  {
    id: 'resolution',
    question: 'What happens when an auction ends?',
    answer: 'After the countdown ends, the auction moves into awaiting resolution. The MPC workflow computes the winner from encrypted bids, then only the winner and required settlement amount are revealed.',
  },
  {
    id: 'auction-types',
    question: 'What is the difference between first-price and Vickrey?',
    answer: 'In a first-price auction, the winner pays their own bid. In a Vickrey auction, the highest bidder wins but pays the second-highest bid, which encourages more honest bidding.',
  },
  {
    id: 'losing-bids',
    question: 'Do losing bids become public?',
    answer: 'No. Losing bid amounts are not displayed after finalization. The interface only exposes the information needed to verify and settle the auction outcome.',
  },
  {
    id: 'devnet',
    question: 'Why is this running on Solana Devnet?',
    answer: 'Devnet keeps the auction flow testable without risking mainnet funds. It is useful for validating wallet connection, encrypted bidding, resolution, and UI behavior.',
  },
];

function readStoredBidHistory() {
  try {
    const rawHistory = window.localStorage.getItem(BID_HISTORY_STORAGE_KEY);
    const parsedHistory = rawHistory ? JSON.parse(rawHistory) : [];
    return Array.isArray(parsedHistory) ? parsedHistory : [];
  } catch {
    return [];
  }
}

function writeStoredBidHistory(records) {
  try {
    window.localStorage.setItem(
      BID_HISTORY_STORAGE_KEY,
      JSON.stringify(records.slice(0, MAX_STORED_BID_RECORDS))
    );
  } catch {
    // Local history is a convenience layer; bidding still works without storage.
  }
}

function getStoredBidKey(bid) {
  if (bid?.txSignature) return bid.txSignature;
  return `${bid?.auctionPDA || bid?.auctionId || 'auction'}:${bid?.bidder || 'wallet'}:${bid?.timestamp || bid?.id || 'bid'}`;
}

function toLocalBid(record) {
  return {
    id: record.id,
    bidder: record.bidder,
    amount: record.amount,
    encryptedAmount: record.encryptedAmount,
    encryptedBidderLo: record.encryptedBidderLo,
    encryptedBidderHi: record.encryptedBidderHi,
    bidderPubkey: record.bidderPubkey,
    x25519PublicKey: record.x25519PublicKey,
    nonce: record.nonce,
    timestamp: record.timestamp,
    txSignature: record.txSignature,
    escrowAmount: record.escrowAmount,
    isLocalHistory: true,
  };
}

function mergeLocalBidHistory(auctionList, bidRecords) {
  if (!bidRecords.length) return auctionList;

  const recordsByAuction = bidRecords.reduce((acc, record) => {
    const keys = [record.auctionPDA, record.auctionId].filter(Boolean);
    for (const key of keys) {
      if (!acc.has(key)) acc.set(key, []);
      acc.get(key).push(record);
    }
    return acc;
  }, new Map());

  return auctionList.map((auction) => {
    const auctionRecords = [
      ...(recordsByAuction.get(auction.auctionPDA) ?? []),
      ...(auction.id !== auction.auctionPDA ? (recordsByAuction.get(auction.id) ?? []) : []),
    ];

    if (!auctionRecords.length) return auction;

    const dedupedRecords = new Map();
    for (const record of auctionRecords) {
      dedupedRecords.set(getStoredBidKey(record), record);
    }

    const mergedBids = [...(auction.bids ?? [])];
    const existingKeys = new Set(
      mergedBids
        .filter((bid) => bid.bidder || bid.txSignature)
        .map(getStoredBidKey)
    );

    for (const record of dedupedRecords.values()) {
      const recordKey = getStoredBidKey(record);
      if (existingKeys.has(recordKey)) continue;

      const placeholderIndex = mergedBids.findIndex((bid) => !bid.bidder && !bid.txSignature);
      if (placeholderIndex >= 0) {
        mergedBids[placeholderIndex] = {
          ...mergedBids[placeholderIndex],
          ...toLocalBid(record),
        };
      } else {
        mergedBids.push(toLocalBid(record));
      }
      existingKeys.add(recordKey);
    }

    return {
      ...auction,
      bids: mergedBids,
      bidCount: Math.max(Number(auction.bidCount ?? 0), mergedBids.length),
    };
  });
}

function BrandLogo() {
  return (
    <svg className="brand-icon" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="5" y="5" width="22" height="22" stroke="currentColor" strokeWidth="3" />
      <rect x="11" y="11" width="10" height="10" fill="currentColor" />
    </svg>
  );
}

function Topbar({ activePage, onNavigate }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="brand-mark"
          onClick={() => onNavigate('dashboard')}
          aria-label="Arcium Auction dashboard"
        >
          <BrandLogo />
          <span className="brand-copy">
            <span className="brand-title">Arcium Auction</span>
            <span className="brand-subtitle">MPC-SECURED</span>
          </span>
        </button>
      </div>
      <div className="topbar-center">
        <nav className="topnav-tabs" aria-label="Application pages">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={activePage === item.id ? 'topnav-tab is-active' : 'topnav-tab'}
              onClick={() => onNavigate(item.id)}
              aria-current={activePage === item.id ? 'page' : undefined}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="topbar-right">
        <WalletConnect />
      </div>
    </header>
  );
}

function FAQPage() {
  const [openFaqId, setOpenFaqId] = useState(FAQ_ITEMS[0].id);

  return (
    <section className="faq-page page-section" aria-labelledby="faq-heading">
      <div className="faq-header">
        <div>
          <p className="faq-kicker">QUESTIONS</p>
          <h2 id="faq-heading">Frequently Asked Questions</h2>
        </div>
        <p>
          Quick answers for using the encrypted auction flow, from bid privacy to winner resolution.
        </p>
      </div>

      <div className="faq-list">
        {FAQ_ITEMS.map((item) => {
          const isOpen = openFaqId === item.id;
          const answerId = `faq-answer-${item.id}`;

          return (
            <article className={isOpen ? 'faq-item is-open' : 'faq-item'} key={item.id}>
              <button
                type="button"
                className="faq-question"
                aria-expanded={isOpen}
                aria-controls={answerId}
                onClick={() => setOpenFaqId(isOpen ? null : item.id)}
              >
                <span>{item.question}</span>
                <span className="faq-toggle" aria-hidden="true">{isOpen ? '-' : '+'}</span>
              </button>
              <div className="faq-answer" id={answerId} hidden={!isOpen}>
                <p>{item.answer}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function AppContent() {
  const { publicKey, connected } = useWallet();
  const [sharedAuctions, setSharedAuctions] = useState([]);
  const [pendingAuctions, setPendingAuctions] = useState([]);
  const [hiddenAuctionKeys, setHiddenAuctionKeys] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isLoadingBlockchainData, setIsLoadingBlockchainData] = useState(false);
  const [activeBidsView, setActiveBidsView] = useState('ongoing');
  const [bidHistoryView, setBidHistoryView] = useState('ongoing');
  const [activePage, setActivePage] = useState('dashboard');
  const [bidHistoryRecords, setBidHistoryRecords] = useState(readStoredBidHistory);
  const [ongoingPins, setOngoingPins] = useState({});
  const activeLoadRef = useRef(null);
  const queuedSilentRefreshRef = useRef(false);

  const getAuctionKey = (auction) => auction.auctionPDA || auction.id;

  const pinAuctionToOngoing = (auctionOrKey, until) => {
    const key = typeof auctionOrKey === 'string' ? auctionOrKey : getAuctionKey(auctionOrKey);
    if (!key || !until) return;

    setOngoingPins((current) => {
      const nextUntil = Math.max(current[key] ?? 0, until);
      if (nextUntil === (current[key] ?? 0)) {
        return current;
      }

      return { ...current, [key]: nextUntil };
    });
  };

  const getPinnedView = (auction) => {
    const key = getAuctionKey(auction);
    if (!key) return null;

    const pinnedUntil = ongoingPins[key] ?? 0;
    return pinnedUntil > Date.now() ? 'ongoing' : null;
  };

  const pruneExpiredPins = () => {
    const now = Date.now();
    setOngoingPins((current) => {
      const next = Object.fromEntries(Object.entries(current).filter(([, until]) => until > now));
      return Object.keys(next).length === Object.keys(current).length ? current : next;
    });
  };

  const mergeAuctionSources = (optimisticAuctions, chainAuctions) => {
    const optimisticByKey = new Map(
      optimisticAuctions.map((auction) => [getAuctionKey(auction), auction])
    );
    const chainKeys = new Set(chainAuctions.map((auction) => getAuctionKey(auction)));

    const mergedFromChain = chainAuctions.map((chainAuction) => {
      const optimisticAuction = optimisticByKey.get(getAuctionKey(chainAuction));
      if (!optimisticAuction) return chainAuction;

      const localBids = optimisticAuction.bids ?? [];
      const localBidCount = Number(optimisticAuction.bidCount ?? localBids.length ?? 0);
      const chainBidCount = Number(chainAuction.bidCount ?? chainAuction.bids?.length ?? 0);
      const visibleBidCount = Math.max(localBidCount, chainBidCount);
      const visibleBids = localBidCount >= chainBidCount ? localBids : (chainAuction.bids ?? []);

      return {
        ...optimisticAuction,
        ...chainAuction,
        id: chainAuction.id,
        auctionPDA: chainAuction.auctionPDA,
        creator: chainAuction.creator,
        itemName: chainAuction.itemName || optimisticAuction.itemName,
        description: optimisticAuction.description || chainAuction.description,
        imageUrl: optimisticAuction.imageUrl || chainAuction.imageUrl,
        minimumBid: chainAuction.minimumBid,
        endTime: chainAuction.endTime,
        auctionType: chainAuction.auctionType,
        status: chainAuction.status,
        bidCount: visibleBidCount,
        onChainBidCount: chainAuction.onChainBidCount ?? chainBidCount,
        bids: visibleBids,
        createdAt: optimisticAuction.createdAt || chainAuction.createdAt,
        computationOffset: optimisticAuction.computationOffset || chainAuction.computationOffset,
        onChainSignature: optimisticAuction.onChainSignature || chainAuction.onChainSignature,
        blockchainVerified: true,
      };
    });

    const pendingOnly = optimisticAuctions.filter(
      (auction) => !chainKeys.has(getAuctionKey(auction))
    );

    return [...pendingOnly, ...mergedFromChain];
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

  const auctions = useMemo(() => {
    const merged = mergeAuctionSources(pendingAuctions, sharedAuctions);
    const deduped = dedupeAuctions(merged);
    const connectedWallet = publicKey?.toBase58();
    const walletBidRecords = connectedWallet
      ? bidHistoryRecords.filter((record) => record.bidder === connectedWallet)
      : [];

    const hiddenKeys = new Set(hiddenAuctionKeys);
    const visibleAuctions = hiddenAuctionKeys.length
      ? deduped.filter((auction) => !hiddenKeys.has(getAuctionKey(auction)))
      : deduped;

    return mergeLocalBidHistory(visibleAuctions, walletBidRecords);
  }, [sharedAuctions, pendingAuctions, hiddenAuctionKeys, bidHistoryRecords, publicKey]);

  const myBidAuctions = useMemo(() => {
    const connectedWallet = publicKey?.toBase58();
    if (!connectedWallet) return [];

    return auctions.filter((auction) =>
      (auction.bids ?? []).some((bid) => bid.bidder === connectedWallet)
    );
  }, [auctions, publicKey]);

  const loadAuctionData = async (isSilent = false) => {
    if (activeLoadRef.current) {
      if (isSilent) {
        queuedSilentRefreshRef.current = true;
      }
      return activeLoadRef.current;
    }

    if (!isSilent) {
      setIsLoadingBlockchainData(true);
    }

    const request = (async () => {
      try {
        const chainAuctions = await fetchAllAuctionsOnChain();
        const metadataByAuction = await fetchAuctionMetadata().catch(() => {
          return {};
        });
        const withMetadata = applySharedMetadata(chainAuctions, metadataByAuction);
        const finalizedAuctionPdas = withMetadata
          .filter((auction) => auction.status === 'finalized')
          .map((auction) => auction.auctionPDA)
          .filter(Boolean);
        const resolutionsByAuction = finalizedAuctionPdas.length
          ? await fetchAuctionResolutions(finalizedAuctionPdas).catch(() => {
              return {};
            })
          : {};
        const fullyHydratedAuctions = dedupeAuctions(
          applyResolutions(withMetadata, resolutionsByAuction)
        );

        setSharedAuctions(fullyHydratedAuctions);

        return fullyHydratedAuctions;
      } catch {
        return [];
      } finally {
        activeLoadRef.current = null;

        if (!isSilent) {
          setIsLoadingBlockchainData(false);
        }

        if (queuedSilentRefreshRef.current) {
          queuedSilentRefreshRef.current = false;
          void loadAuctionData(true);
        }
      }
    })();

    activeLoadRef.current = request;
    return request;
  };

  useEffect(() => {
    loadAuctionData();
  }, []);

  useEffect(() => {
    if (connected && publicKey) {
      loadAuctionData();
    }
  }, [connected, publicKey]);

  useEffect(() => {
    const interval = setInterval(() => {
      pruneExpiredPins();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleCreateAuction = async (newAuction) => {
    setShowCreateForm(false);
    setPendingAuctions((current) => dedupeAuctions([newAuction, ...current]));
    pinAuctionToOngoing(newAuction, Number(newAuction.endTime) + ONGOING_GRACE_MS);
    await loadAuctionData();
  };

  const handleUpdateAuction = (auctionId, updates) => {
    setPendingAuctions((current) => {
      const hasExistingOverlay = current.some(
        (auction) => auction.id === auctionId || auction.auctionPDA === auctionId
      );

      if (hasExistingOverlay) {
        return dedupeAuctions(
          current.map((auction) =>
            auction.id === auctionId || auction.auctionPDA === auctionId
              ? { ...auction, ...updates }
              : auction
          )
        );
      }

      const sourceAuction = auctions.find(
        (auction) => auction.id === auctionId || auction.auctionPDA === auctionId
      );

      if (!sourceAuction) {
        return current;
      }

      return dedupeAuctions([{ ...sourceAuction, ...updates }, ...current]);
    });
  };

  const handleDeleteAuction = (auctionId) => {
    const matchingAuction = auctions.find(
      (auction) => auction.id === auctionId || auction.auctionPDA === auctionId
    );

    if (!matchingAuction) {
      return;
    }

    const auctionKey = getAuctionKey(matchingAuction);

    setHiddenAuctionKeys((current) =>
      current.includes(auctionKey) ? current : [...current, auctionKey]
    );
    setPendingAuctions((current) =>
      current.filter((auction) => getAuctionKey(auction) !== auctionKey)
    );
  };

  const handleAuctionFinalized = (auctionId, winner, winningBid) => {
    setPendingAuctions((current) =>
      dedupeAuctions(
        current.map((auction) =>
          auction.id === auctionId || auction.auctionPDA === auctionId
            ? { ...auction, status: 'finalized', winner, winningBid }
            : auction
        )
      )
    );
    pinAuctionToOngoing(auctionId, Date.now() + ONGOING_GRACE_MS);
  };

  const handlePinAuctionToOngoing = (auctionId, until) => {
    pinAuctionToOngoing(auctionId, until);
  };

  const handleBidRecorded = (auction, bid) => {
    const auctionKey = getAuctionKey(auction);
    if (!auctionKey || !bid?.bidder) return;

    const bidRecord = {
      ...bid,
      auctionId: auction.id || auctionKey,
      auctionPDA: auction.auctionPDA || auctionKey,
      itemName: auction.itemName,
      endTime: auction.endTime,
      recordedAt: Date.now(),
    };

    setBidHistoryRecords((current) => {
      const next = [
        bidRecord,
        ...current.filter((record) => getStoredBidKey(record) !== getStoredBidKey(bidRecord)),
      ].slice(0, MAX_STORED_BID_RECORDS);

      writeStoredBidHistory(next);
      return next;
    });
  };

  const handlePageChange = (pageId) => {
    setActivePage(pageId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewProtocol = () => {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleRefresh = () => {
    void loadAuctionData();
  };

  useEffect(() => {
    const interval = setInterval(() => {
      loadAuctionData(true);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app-root">
      <Topbar activePage={activePage} onNavigate={handlePageChange} />

      <main className="app-main">
        <div className="main-content dashboard-grid">
          {isLoadingBlockchainData && <LoadingSkeleton />}

          {activePage === 'dashboard' && (
            <>
              <section id="dashboard" className="hero-section">
                <div className="status-box-row">
                  <span className="status-box status-box-filled">MPC-SECURED</span>
                  <span className="status-box">SOLANA DEVNET</span>
                  <span className="status-box status-box-accent">BLOCKCHAIN SYNCED</span>
                </div>

                <h1 className="hero-title">
                  BLIND SEALED-BID
                  <br />
                  AUCTIONS
                </h1>

                <div className="hero-bottom-row">
                  <p className="hero-description">
                    Private Solana auctions where bids stay encrypted until Arcium MPC computes the winner. Participants get sealed execution without exposing losing bids.
                  </p>

                  <div className="hero-actions">
                    <button
                      type="button"
                      className="button-primary"
                      onClick={() => setShowCreateForm(true)}
                    >
                      <PlusIcon size={14} strokeWidth={1.8} />
                      Create Auction
                    </button>
                    <button type="button" className="button-secondary" onClick={handleViewProtocol}>
                      View Protocol
                    </button>
                    {connected && !isLoadingBlockchainData && (
                      <button
                        type="button"
                        className="button-ghost"
                        onClick={handleRefresh}
                        title="Refresh auctions"
                      >
                        <RefreshIcon size={14} strokeWidth={1.6} />
                        Refresh
                      </button>
                    )}
                  </div>
                </div>
              </section>

              <MetricsRail auctions={auctions} />
              <ProtocolArchitecture />
              <SecurityGuarantees />
              <TechnicalStack />
            </>
          )}

          {activePage === 'active-bids' && (
            <section id="auctions" className="auction-section page-section">
              {auctions.length > 0 ? (
                <AuctionList
                  auctions={auctions}
                  onUpdateAuction={handleUpdateAuction}
                  onDeleteAuction={handleDeleteAuction}
                  onRefreshAuctionData={loadAuctionData}
                  activeView={activeBidsView}
                  onViewChange={setActiveBidsView}
                  onAuctionFinalized={handleAuctionFinalized}
                  getPinnedView={getPinnedView}
                  onPinAuctionToOngoing={handlePinAuctionToOngoing}
                  onBidRecorded={handleBidRecorded}
                />
              ) : (
                !isLoadingBlockchainData && (
                  <EmptyAuctionsState onCreateAuction={() => setShowCreateForm(true)} />
                )
              )}
            </section>
          )}

          {activePage === 'bid-history' && (
            <section className="auction-section page-section">
              {myBidAuctions.length > 0 ? (
                <AuctionList
                  auctions={myBidAuctions}
                  onUpdateAuction={handleUpdateAuction}
                  onDeleteAuction={handleDeleteAuction}
                  onRefreshAuctionData={loadAuctionData}
                  activeView={bidHistoryView}
                  onViewChange={setBidHistoryView}
                  onAuctionFinalized={handleAuctionFinalized}
                  getPinnedView={getPinnedView}
                  onPinAuctionToOngoing={handlePinAuctionToOngoing}
                  onBidRecorded={handleBidRecorded}
                />
              ) : (
                <div className="inline-empty">
                  <h3>Your encrypted bids will appear here.</h3>
                  <p>{connected ? 'Place a bid on an active auction to populate this page.' : 'Connect your wallet to view bid history for this session.'}</p>
                </div>
              )}
            </section>
          )}

          {activePage === 'faq' && (
            <FAQPage />
          )}
        </div>
      </main>

      {showCreateForm && (
        <div className="create-overlay" onClick={() => setShowCreateForm(false)}>
          <div className="create-panel" onClick={(event) => event.stopPropagation()}>
            <AuctionCreator
              onCreateAuction={handleCreateAuction}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        </div>
      )}
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
    []
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
