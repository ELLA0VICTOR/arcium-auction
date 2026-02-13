import React, { useMemo, useState, useEffect } from 'react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { clusterApiUrl } from '@solana/web3.js';

import '@solana/wallet-adapter-react-ui/styles.css';

import WalletConnect from './components/WalletConnect';
import AuctionCreator from './components/AuctionCreator';
import AuctionList from './components/AuctionList';

function App() {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
    ],
    [network]
  );

  const [auctions, setAuctions] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    const savedAuctions = localStorage.getItem('arcium_auctions');
    if (savedAuctions) {
      setAuctions(JSON.parse(savedAuctions));
    }
  }, []);

  const handleCreateAuction = (newAuction) => {
    const updatedAuctions = [...auctions, newAuction];
    setAuctions(updatedAuctions);
    localStorage.setItem('arcium_auctions', JSON.stringify(updatedAuctions));
    setShowCreateForm(false);
  };

  const handleUpdateAuction = (auctionId, updates) => {
    const updatedAuctions = auctions.map(auction =>
      auction.id === auctionId ? { ...auction, ...updates } : auction
    );
    setAuctions(updatedAuctions);
    localStorage.setItem('arcium_auctions', JSON.stringify(updatedAuctions));
  };

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
            {/* Header */}
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

            {/* Main Content */}
            <main className="container mx-auto px-6 py-12">
              {/* Hero Section */}
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
                </div>
              </div>

              {/* Stats Bar */}
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
                    {auctions.reduce((acc, a) => acc + a.bids.length, 0)}
                  </div>
                  <div className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                    ENCRYPTED_BIDS
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
                <div className="glass-card p-4">
                  <div className="text-3xl font-display font-bold mb-1" style={{ color: 'var(--purple-accent)' }}>
                    0MS
                  </div>
                  <div className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                    LEAK_TIME
                  </div>
                </div>
              </div>

              {/* How It Works */}
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

              {/* Security Guarantees */}
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

              {/* Tech Stack */}
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

              {/* Create Auction Form */}
              {showCreateForm && (
                <div className="mb-12 animate-slide-up">
                  <AuctionCreator
                    onCreateAuction={handleCreateAuction}
                    onCancel={() => setShowCreateForm(false)}
                  />
                </div>
              )}

              {/* Auctions List */}
              {auctions.length > 0 && (
                <div>
                  <h3 className="text-2xl font-display font-bold mb-8" style={{ color: 'var(--text-primary)' }}>
                    Active Auctions
                  </h3>
                  <AuctionList
                    auctions={auctions}
                    onUpdateAuction={handleUpdateAuction}
                  />
                </div>
              )}
            </main>

            {/* Footer */}
            <footer className="mt-20 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="container mx-auto px-6 py-6 text-center font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
                <p>
                  Powered by Arcium MPC on Solana Devnet
                </p>
              </div>
            </footer>
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;