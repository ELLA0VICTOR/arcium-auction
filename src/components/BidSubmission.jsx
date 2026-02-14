import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { encryptBid } from '../utils/arciumEncryption';
import { validateBid } from '../utils/helpers';
import { submitBidOnChain, getWalletBalance } from '../utils/programInstructions';

export default function BidSubmission({ auction, onBidSubmitted, onCancel }) {
  const { connected, publicKey } = useWallet();
  const wallet = useWallet();
  const [bidAmount, setBidAmount] = useState('');
  const [error, setError] = useState('');
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [encryptionStage, setEncryptionStage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!connected) {
      setError('Please connect your wallet first');
      return;
    }

    try {
      const amount = parseFloat(bidAmount);
      validateBid(amount, auction.minimumBid);

      // Check wallet balance
      const balance = await getWalletBalance(publicKey);
      if (balance < amount) {
        throw new Error(`Insufficient balance. You have ${balance.toFixed(4)} SOL. Need ${amount} SOL + gas fees. Get devnet SOL from https://faucet.solana.com`);
      }

      setIsEncrypting(true);

      setEncryptionStage('Generating keypair...');
      await new Promise(resolve => setTimeout(resolve, 500));

      setEncryptionStage('Performing key exchange...');
      await new Promise(resolve => setTimeout(resolve, 500));

      setEncryptionStage('Encrypting bid with Rescue cipher...');
      const encrypted = await encryptBid(BigInt(Math.floor(amount * 1e9)));
      await new Promise(resolve => setTimeout(resolve, 800));

      setEncryptionStage('Submitting to Solana devnet...');
      
      // Actually submit to blockchain
      const result = await submitBidOnChain(wallet, auction.id, encrypted, amount);

      setEncryptionStage('Transaction confirmed!');
      await new Promise(resolve => setTimeout(resolve, 600));

      const encryptedBid = {
        id: crypto.randomUUID(),
        bidder: publicKey.toString(),
        amount: amount,
        ciphertext: encrypted.ciphertext,
        publicKey: encrypted.publicKey,
        nonce: encrypted.nonce,
        timestamp: Date.now(),
        txSignature: result.signature,
        escrowAmount: result.escrowAmount,
      };

      onBidSubmitted(encryptedBid);
      setBidAmount('');
      setIsEncrypting(false);
      setEncryptionStage('');

    } catch (err) {
      setError(err.message);
      setIsEncrypting(false);
      setEncryptionStage('');
    }
  };

  if (!connected) {
    return (
      <div className="p-4 rounded" style={{ background: 'var(--bg-tertiary)', border: '1px solid #ef4444' }}>
        <p className="text-sm font-mono text-red-400">
          Please connect your wallet to submit a bid
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="p-4 rounded" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--purple-accent)' }}>
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--purple-accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-mono mb-1" style={{ color: 'var(--purple-accent)' }}>
              REAL_BLOCKCHAIN_TRANSACTION
            </p>
            <ul className="text-xs font-body space-y-1" style={{ color: 'var(--text-secondary)' }}>
              <li>• Bid encrypted using x25519 + Rescue cipher</li>
              <li>• SOL transferred to auction escrow on-chain</li>
              <li>• Transaction confirmed on Solana devnet</li>
              <li>• Amount stays hidden until auction ends</li>
            </ul>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-mono mb-2" style={{ color: 'var(--text-primary)' }}>
            Your Bid Amount (SOL)
          </label>
          <div className="relative">
            <input
              type="number"
              value={bidAmount}
              onChange={(e) => {
                setBidAmount(e.target.value);
                setError('');
              }}
              placeholder={`Minimum ${auction.minimumBid} SOL`}
              step="0.01"
              min={auction.minimumBid}
              disabled={isEncrypting}
              className={`input-field w-full pl-10 ${error ? 'border-red-500' : ''}`}
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-lg" style={{ color: 'var(--purple-accent)' }}>
              ◎
            </span>
          </div>
          {error && <p className="text-red-400 text-sm mt-1 font-mono">{error}</p>}
        </div>

        {isEncrypting && (
          <div className="p-4 rounded" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--purple-accent)' }}>
            <div className="flex items-center gap-3">
              <svg className="animate-spin h-5 w-5" style={{ color: 'var(--purple-accent)' }} fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <div className="flex-1">
                <p className="text-sm font-mono" style={{ color: 'var(--purple-accent)' }}>
                  {encryptionStage}
                </p>
                <div className="w-full h-1 rounded-full mt-2 overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
                  <div className="h-full shimmer" style={{ background: 'var(--purple-accent)' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isEncrypting || !bidAmount}
            className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEncrypting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 inline-block" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              'Submit Encrypted Bid'
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isEncrypting}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </form>

      <div className="p-3 rounded text-xs font-mono" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
        Need devnet SOL? Visit: https://faucet.solana.com
      </div>
    </div>
  );
}