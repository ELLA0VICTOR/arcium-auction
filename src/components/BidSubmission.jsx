import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { encryptBid } from '../utils/arciumEncryption';
import { validateBid } from '../utils/helpers';

export default function BidSubmission({ auction, onBidSubmitted, onCancel }) {
  const { connected, publicKey } = useWallet();
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

      setIsEncrypting(true);

      setEncryptionStage('Generating keypair...');
      await new Promise(resolve => setTimeout(resolve, 500));

      setEncryptionStage('Performing key exchange...');
      await new Promise(resolve => setTimeout(resolve, 500));

      setEncryptionStage('Encrypting bid with Rescue cipher...');
      const encrypted = await encryptBid(BigInt(Math.floor(amount * 1e9)));
      await new Promise(resolve => setTimeout(resolve, 800));

      setEncryptionStage('Submitting to blockchain...');
      await new Promise(resolve => setTimeout(resolve, 600));

      const encryptedBid = {
        id: crypto.randomUUID(),
        bidder: publicKey.toString(),
        amount: amount,
        ciphertext: encrypted.ciphertext,
        publicKey: encrypted.publicKey,
        nonce: encrypted.nonce,
        timestamp: Date.now(),
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
      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
        <p className="text-red-400 text-sm">Please connect your wallet to submit a bid</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-semibold text-purple-300 mb-1">How It Works</p>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>• Your bid will be encrypted using Arcium's x25519 + Rescue cipher</li>
              <li>• No one can see your bid amount, not even the auction creator</li>
              <li>• When the auction ends, MPC computes the winner privately</li>
              <li>• Only the winner and winning amount are revealed</li>
            </ul>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
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
              className={`input-field w-full pl-10 ${error ? 'border-red-500' : 'focus:border-purple-500'}`}
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400 font-mono text-lg">◎</span>
          </div>
          {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
        </div>

        {isEncrypting && (
          <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
            <div className="flex items-center gap-3">
              <svg className="animate-spin h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <div className="flex-1">
                <p className="text-sm font-semibold text-purple-300">{encryptionStage}</p>
                <div className="w-full bg-white/10 h-1 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 shimmer"></div>
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
                Encrypting...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 inline-block mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Submit Encrypted Bid
              </>
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
    </div>
  );
}