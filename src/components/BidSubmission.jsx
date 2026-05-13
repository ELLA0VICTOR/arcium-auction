import React, { useMemo, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { encryptBid } from '../utils/arciumEncryption';
import { validateBid } from '../utils/helpers';
import { submitBidOnChain, getWalletBalance } from '../utils/programInstructions';
import { LockIcon, XIcon } from './icons';

const ENCRYPTION_STEPS = [
  'Encrypting bid with x25519...',
  'Submitting to MPC network...',
  'Broadcasting to Solana...',
  'Bid sealed on-chain.',
];

function getEncryptionStep(stage) {
  if (!stage) return -1;
  if (stage.includes('sealed') || stage.includes('confirmed')) return 3;
  if (stage.includes('Broadcasting') || stage.includes('accepted')) return 2;
  if (stage.includes('Submitting')) return 1;
  return 0;
}

export default function BidSubmission({ auction, onBidSubmitted, onCancel }) {
  const { connected, publicKey } = useWallet();
  const wallet = useWallet();
  const [bidAmount, setBidAmount] = useState('');
  const [error, setError] = useState('');
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [encryptionStage, setEncryptionStage] = useState('');
  const isCreator = Boolean(
    publicKey && auction?.creator && auction.creator === publicKey.toBase58()
  );
  const activeStep = useMemo(() => getEncryptionStep(encryptionStage), [encryptionStage]);
  const progressClass = activeStep >= 0 ? `progress-step-${activeStep + 1}` : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!connected) {
      setError('Please connect your wallet first');
      return;
    }

    if (isCreator) {
      setError('Auction creators cannot bid on their own auction.');
      return;
    }

    try {
      const amount = parseFloat(bidAmount);
      validateBid(amount, auction.minimumBid);
      if (!auction.auctionPDA) {
        throw new Error('Auction not initialized on-chain yet.');
      }

      const balance = await getWalletBalance(publicKey);
      if (balance < amount) {
        throw new Error(`Insufficient balance. You have ${balance.toFixed(4)} SOL. Need ${amount} SOL + gas fees. Get devnet SOL from https://faucet.solana.com`);
      }

      setIsEncrypting(true);

      setEncryptionStage('Encrypting bid with x25519...');
      await new Promise(resolve => setTimeout(resolve, 500));

      setEncryptionStage('Deriving sealed bid key...');
      await new Promise(resolve => setTimeout(resolve, 500));

      setEncryptionStage('Encrypting bid with Rescue cipher...');
      const encrypted = await encryptBid(
        BigInt(Math.floor(amount * 1e9)),
        publicKey.toBase58()
      );
      await new Promise(resolve => setTimeout(resolve, 800));

      setEncryptionStage('Submitting to MPC network...');
      await new Promise(resolve => setTimeout(resolve, 300));

      setEncryptionStage('Broadcasting to Solana...');
      const result = await submitBidOnChain(wallet, auction.auctionPDA, encrypted, amount);

      if (result.recovered) {
        setEncryptionStage('Bid was already accepted on-chain. Syncing pending state...');
        await new Promise(resolve => setTimeout(resolve, 600));
      }

      setEncryptionStage('Bid sealed on-chain.');
      await new Promise(resolve => setTimeout(resolve, 600));

      const encryptedBid = {
        id: crypto.randomUUID(),
        bidder: publicKey.toString(),
        amount: amount,
        encryptedAmount: encrypted.encryptedAmount,
        encryptedBidderLo: encrypted.encryptedBidderLo,
        encryptedBidderHi: encrypted.encryptedBidderHi,
        bidderPubkey: encrypted.bidderPubkey,
        x25519PublicKey: encrypted.x25519PublicKey,
        nonce: encrypted.nonce,
        timestamp: Date.now(),
        txSignature: result.signature,
        escrowAmount: result.escrowAmount,
      };

      await onBidSubmitted(encryptedBid);
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
      <>
        <div className="modal-header">
          <div>
            <h3>Place Encrypted Bid</h3>
            <p className="modal-subtitle">Wallet connection required.</p>
          </div>
          <button type="button" className="button-icon" onClick={onCancel} aria-label="Close bid modal">
            <XIcon size={16} strokeWidth={1.5} />
          </button>
        </div>

        <div className="state-panel state-panel-danger">
          <LockIcon size={16} color="#ef4444" strokeWidth={1.5} />
          <div>
            <strong>Please connect your wallet to submit a bid</strong>
            <p>The auction contract requires a connected signer for encrypted escrow submission.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="modal-header">
        <div>
          <h3>Place Encrypted Bid</h3>
          <p className="modal-subtitle">{auction.itemName}</p>
        </div>
        <button type="button" className="button-icon" onClick={onCancel} aria-label="Close bid modal" disabled={isEncrypting}>
          <XIcon size={16} strokeWidth={1.5} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bid-form">
        <div className="bid-input-wrap">
          <span className="bid-unit">SOL</span>
          <input
            type="number"
            value={bidAmount}
            onChange={(e) => {
              setBidAmount(e.target.value);
              setError('');
            }}
            placeholder={`Minimum ${auction.minimumBid}`}
            step="0.01"
            min={auction.minimumBid}
            disabled={isEncrypting || isCreator}
            className={error ? 'bid-input is-invalid' : 'bid-input'}
          />
        </div>

        <div className="security-notice">
          <LockIcon size={13} strokeWidth={1.5} />
          Your bid is encrypted client-side. Private key never leaves your device.
        </div>

        {isCreator && (
          <div className="state-panel state-panel-danger">
            <LockIcon size={16} color="#ef4444" strokeWidth={1.5} />
            <div>
              <strong>Auction creators cannot bid on their own auction.</strong>
              <p>Switch wallets to test the bidder flow.</p>
            </div>
          </div>
        )}

        {error && <p className="error-text">{error}</p>}

        {isEncrypting && (
          <div className="encryption-progress" aria-live="polite">
            <div className="encryption-line">
              <div className={`encryption-line-fill ${progressClass}`} />
            </div>
            {ENCRYPTION_STEPS.map((step, index) => (
              <div
                key={step}
                className={index <= activeStep ? 'encryption-step is-active' : 'encryption-step'}
              >
                {step}
              </div>
            ))}
          </div>
        )}

        <div className="modal-actions">
          <button
            type="submit"
            disabled={isEncrypting || !bidAmount || isCreator}
            className="button-primary"
          >
            {isEncrypting ? 'Processing...' : isCreator ? 'Creator Cannot Bid' : 'Submit Encrypted Bid'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isEncrypting}
            className="button-secondary"
          >
            Cancel
          </button>
        </div>

        <div className="security-notice">
          Need devnet SOL? Visit https://faucet.solana.com
        </div>
      </form>
    </>
  );
}
