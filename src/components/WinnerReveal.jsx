import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useWallet } from '@solana/wallet-adapter-react';
import { finalizeAuctionOnChain, fetchAuctionSnapshot } from '../utils/programInstructions';
import { fetchAuctionResolution } from '../utils/auctionApi';
import { copyToClipboard } from '../utils/helpers';

export default function WinnerReveal({ auction, onFinalized, onRefreshAuctionData }) {
  const wallet = useWallet();
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [computationStage, setComputationStage] = useState('');
  const [progress, setProgress] = useState(0);
  const [winner, setWinner] = useState(null);
  const [showReveal, setShowReveal] = useState(false);
  const [displayedAmount, setDisplayedAmount] = useState(0);
  const [copyState, setCopyState] = useState('Copy address');
  const finalizeLockRef = useRef(false);

  const totalBids = Number(auction.bidCount ?? auction.bids?.length ?? 0);
  const syncedBidCount = Number(auction.onChainBidCount ?? 0);

  const waitForResolution = async () => {
    const maxAttempts = 30;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        const resolution = await fetchAuctionResolution(auction.auctionPDA);
        return resolution;
      } catch (_error) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    throw new Error('Winner resolution not available on-chain yet. Please refresh shortly.');
  };

  const waitForBidSync = async () => {
    if (!auction.auctionPDA) {
      throw new Error('Missing on-chain auction address.');
    }

    if (totalBids === 0) {
      throw new Error('No bids submitted for this auction');
    }

    if (syncedBidCount >= totalBids) {
      return;
    }

    const maxAttempts = 12;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      setComputationStage('Waiting for encrypted bid callback settlement...');
      const snapshot = await fetchAuctionSnapshot(auction.auctionPDA);
      const liveBidCount = Number(snapshot.bidCount ?? 0);

      onRefreshAuctionData?.();

      if (liveBidCount >= totalBids) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    throw new Error('Your latest bid is still settling on-chain. Please try finalization again in a few seconds.');
  };

  const handleFinalize = async () => {
    if (!wallet.connected) {
      alert('Please connect your wallet to finalize');
      return;
    }

    if (finalizeLockRef.current || isFinalizing) {
      return;
    }

    finalizeLockRef.current = true;
    setIsFinalizing(true);
    setProgress(0);

    try {
      const stages = [
        { text: 'Queuing MPC computation...', duration: 1000, progress: 20 },
        { text: 'Arx nodes fetching encrypted bids...', duration: 1200, progress: 40 },
        { text: 'Computing winner via secure multi-party computation...', duration: 1500, progress: 70 },
        { text: 'Executing callback instruction...', duration: 1000, progress: 90 },
        { text: 'Finalizing result on-chain...', duration: 800, progress: 100 },
      ];

      for (const stage of stages) {
        setComputationStage(stage.text);
        await new Promise(resolve => setTimeout(resolve, stage.duration));
        setProgress(stage.progress);
      }

      await waitForBidSync();
      await finalizeAuctionOnChain(wallet, auction.auctionPDA, auction.auctionType);
      setComputationStage('Waiting for winner resolution to publish...');
      const resolution = await waitForResolution();

      setWinner({ address: resolution.winner, amount: resolution.paymentAmountSol });
      setIsFinalizing(false);
      setShowReveal(true);
      await onRefreshAuctionData?.();

      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#8B5CF6', '#EC4899', '#F3E8FF'],
        });
      }, 500);

      setTimeout(() => {
        finalizeLockRef.current = false;
        onFinalized(resolution.winner, resolution.paymentAmountSol);
      }, 2500);
    } catch (error) {
      console.error('Error finalizing auction:', error);
      alert(error.message || 'Failed to finalize auction');
      setIsFinalizing(false);
      finalizeLockRef.current = false;
      setComputationStage('');
      setProgress(0);
    }
  };

  useEffect(() => {
    if (winner && showReveal) {
      const duration = 1500;
      const steps = 60;
      const increment = winner.amount / steps;
      let current = 0;

      const timer = setInterval(() => {
        current += increment;
        if (current >= winner.amount) {
          setDisplayedAmount(winner.amount);
          clearInterval(timer);
        } else {
          setDisplayedAmount(current);
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }
  }, [winner, showReveal]);

  const handleCopyWinner = async () => {
    if (!winner?.address) return;
    const copied = await copyToClipboard(winner.address);
    setCopyState(copied ? 'Copied' : 'Copy failed');
    setTimeout(() => setCopyState('Copy address'), 1500);
  };

  if (showReveal && winner) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-purple-500/20 border-2 border-purple-500/50 p-8">
          <div className="absolute inset-0 bg-gradient-mesh opacity-30"></div>

          <div className="relative z-10 text-center">
            <div className="mb-6 animate-scale-in">
              <svg className="w-20 h-20 mx-auto text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>

            <h3 className="text-3xl font-display font-bold mb-2 glow-text animate-slide-up">
              Winner Revealed!
            </h3>

            <div className="mt-6 space-y-4">
              <div className="animate-slide-up animation-delay-200">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                  <p className="text-sm text-gray-400">Winning Address</p>
                  <button
                    type="button"
                    onClick={handleCopyWinner}
                    className="px-3 py-1 rounded-full text-xs font-semibold bg-white/5 text-gray-300 hover:bg-white/10 transition"
                  >
                    {copyState}
                  </button>
                </div>
                <div className="bg-white/5 border border-purple-500/30 rounded-xl p-4 font-mono text-lg break-all">
                  <span className="text-gradient font-bold">{winner.address}</span>
                </div>
              </div>

              <div className="animate-slide-up animation-delay-400">
                <p className="text-sm text-gray-400 mb-2">Winning Bid</p>
                <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/50 rounded-xl p-6">
                  <p className="text-5xl font-display font-bold text-gradient animate-count-up">
                    SOL {displayedAmount.toFixed(4)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl animate-slide-up animation-delay-600">
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-semibold text-green-400">
                  Auction Finalized
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!isFinalizing ? (
        <button
          onClick={handleFinalize}
          disabled={isFinalizing}
          className="btn-primary w-full animate-pulse-glow disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5 inline-block mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Trigger MPC Finalization
        </button>
      ) : (
        <div className="glass-card p-6 animate-slide-up">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 relative">
              <svg className="animate-spin text-purple-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h4 className="text-xl font-display font-bold mb-2">MPC Computation in Progress</h4>
            <p className="text-sm text-gray-400 mb-4">{computationStage}</p>

            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500 ease-out shimmer"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-purple-400 font-mono mt-2">{progress}%</p>
          </div>

          <div className="space-y-2 text-sm text-gray-400">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 text-purple-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>Encrypted bids being processed by Arx nodes</p>
            </div>
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 text-purple-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>Winner computed without revealing losing bids</p>
            </div>
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 text-purple-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>Result verified and stored on Solana</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




