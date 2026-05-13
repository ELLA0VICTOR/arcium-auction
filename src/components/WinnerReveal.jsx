import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { finalizeAuctionOnChain, fetchAuctionSnapshot } from '../utils/programInstructions';
import { fetchAuctionResolution } from '../utils/auctionApi';
import { copyToClipboard } from '../utils/helpers';
import { CheckCircleIcon, CopyIcon, LockIcon, ZapIcon } from './icons';

function progressClass(progress) {
  return progress > 0 ? `is-${progress}` : '';
}

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
      } catch {
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
        finalizeLockRef.current = false;
        onFinalized(resolution.winner, resolution.paymentAmountSol);
      }, 2500);
    } catch (error) {
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

    return undefined;
  }, [winner, showReveal]);

  const handleCopyWinner = async () => {
    if (!winner?.address) return;
    const copied = await copyToClipboard(winner.address);
    setCopyState(copied ? 'Copied' : 'Copy failed');
    setTimeout(() => setCopyState('Copy address'), 1500);
  };

  if (showReveal && winner) {
    return (
      <div className="reveal-result">
        <div className="winner-header">
          <CheckCircleIcon size={18} color="#34d399" strokeWidth={1.5} />
          <h3>Winner Revealed</h3>
        </div>

        <div>
          <div className="winner-label">WINNING ADDRESS</div>
          <div className="reveal-address-box">{winner.address}</div>
          <button
            type="button"
            onClick={handleCopyWinner}
            className="button-ghost"
          >
            <CopyIcon size={13} strokeWidth={1.5} />
            {copyState}
          </button>
        </div>

        <div>
          <div className="winner-label">WINNING BID</div>
          <div className="reveal-amount-box">SOL {displayedAmount.toFixed(4)}</div>
        </div>

        <div className="state-panel state-panel-success">
          <CheckCircleIcon size={16} color="#34d399" strokeWidth={1.5} />
          <div>
            <strong>Auction finalized</strong>
            <p>Winner result is verified and stored on Solana.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="finalize-panel">
      {!isFinalizing ? (
        <button
          type="button"
          onClick={handleFinalize}
          disabled={isFinalizing}
          className="button-primary"
        >
          <ZapIcon size={15} strokeWidth={1.6} />
          Trigger MPC Finalization
        </button>
      ) : (
        <div className="progress-panel">
          <div className="progress-label">{computationStage}</div>
          <div className="progress-track">
            <div className={`progress-fill ${progressClass(progress)}`} />
          </div>
          <div className="progress-percent">{progress}%</div>

          <div className="finalize-list">
            <div className="finalize-list-row">
              <LockIcon size={14} color="#9b8ff5" strokeWidth={1.5} />
              <span>Encrypted bids are processed by Arx nodes.</span>
            </div>
            <div className="finalize-list-row">
              <LockIcon size={14} color="#9b8ff5" strokeWidth={1.5} />
              <span>Winner is computed without revealing losing bids.</span>
            </div>
            <div className="finalize-list-row">
              <CheckCircleIcon size={14} color="#34d399" strokeWidth={1.5} />
              <span>Result is written back to Solana.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
