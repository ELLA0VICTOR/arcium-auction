import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { createAuctionWithProgram } from '../utils/anchorClient';
import { getMXEPublicKey } from '../utils/arciumEncryption';

export default function AuctionCreator({ onCreateAuction, onCancel }) {
  const { connected, publicKey } = useWallet();
  const wallet = useWallet();
  const [formData, setFormData] = useState({
    itemName: '',
    description: '',
    minimumBid: '',
    endTime: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txStatus, setTxStatus] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.itemName.trim()) {
      newErrors.itemName = 'Item name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    const minBid = parseFloat(formData.minimumBid);
    if (!formData.minimumBid || minBid <= 0) {
      newErrors.minimumBid = 'Minimum bid must be greater than 0';
    }

    if (!formData.endTime) {
      newErrors.endTime = 'End time is required';
    } else {
      const endDate = new Date(formData.endTime);
      if (endDate <= new Date()) {
        newErrors.endTime = 'End time must be in the future';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!connected) {
      alert('Please connect your wallet first');
      return;
    }

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const auctionId = crypto.randomUUID();
      
      const newAuction = {
        id: auctionId,
        creator: publicKey.toString(),
        itemName: formData.itemName,
        description: formData.description,
        minimumBid: parseFloat(formData.minimumBid),
        endTime: new Date(formData.endTime).getTime(),
        bids: [],
        status: 'active',
        createdAt: Date.now(),
      };

      // Get Arcium MXE public key for encryption
      setTxStatus('Fetching Arcium MXE public key...');
      const arciumPubkey = await getMXEPublicKey();

      // Create auction on-chain using Anchor program
      setTxStatus('Deploying auction to Solana devnet...');
      const result = await createAuctionWithProgram(wallet, newAuction, arciumPubkey);
      
      // Add blockchain data to auction
      newAuction.onChainSignature = result.signature;
      newAuction.auctionPDA = result.auctionPDA;
      newAuction.arciumMxePubkey = Array.from(arciumPubkey);

      setTxStatus('Transaction confirmed! Auction deployed on-chain.');
      
      // Wait a moment to show success
      await new Promise(resolve => setTimeout(resolve, 1000));

      onCreateAuction(newAuction);
      setFormData({ itemName: '', description: '', minimumBid: '', endTime: '' });
      setTxStatus('');

    } catch (error) {
      console.error('Error creating auction:', error);
      setErrors({ submit: error.message });
      setTxStatus('');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!connected) {
    return (
      <div className="glass-card p-8 text-center">
        <svg className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--purple-accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <h3 className="text-xl font-display font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          Wallet Not Connected
        </h3>
        <p className="text-sm font-body" style={{ color: 'var(--text-secondary)' }}>
          Please connect your wallet to create an auction
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 flex items-center justify-center" 
             style={{ 
               background: 'var(--purple-accent)',
               borderRadius: '4px'
             }}>
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>
            Create Auction
          </h2>
          <p className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
            Deploy Anchor Program to Devnet
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-mono mb-2" style={{ color: 'var(--text-primary)' }}>
            Item Name
          </label>
          <input
            type="text"
            name="itemName"
            value={formData.itemName}
            onChange={handleChange}
            placeholder="e.g., Rare NFT Collection"
            className={`input-field w-full ${errors.itemName ? 'border-red-500' : ''}`}
          />
          {errors.itemName && <p className="text-red-400 text-sm mt-1 font-mono">{errors.itemName}</p>}
        </div>

        <div>
          <label className="block text-sm font-mono mb-2" style={{ color: 'var(--text-primary)' }}>
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe what you're auctioning..."
            rows={4}
            className={`input-field w-full resize-none ${errors.description ? 'border-red-500' : ''}`}
          />
          {errors.description && <p className="text-red-400 text-sm mt-1 font-mono">{errors.description}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-mono mb-2" style={{ color: 'var(--text-primary)' }}>
              Minimum Bid (SOL)
            </label>
            <div className="relative">
              <input
                type="number"
                name="minimumBid"
                value={formData.minimumBid}
                onChange={handleChange}
                placeholder="0.5"
                step="0.01"
                min="0"
                className={`input-field w-full pl-10 ${errors.minimumBid ? 'border-red-500' : ''}`}
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono" style={{ color: 'var(--purple-accent)' }}>
                ◎
              </span>
            </div>
            {errors.minimumBid && <p className="text-red-400 text-sm mt-1 font-mono">{errors.minimumBid}</p>}
          </div>

          <div>
            <label className="block text-sm font-mono mb-2" style={{ color: 'var(--text-primary)' }}>
              Auction End Time
            </label>
            <input
              type="datetime-local"
              name="endTime"
              value={formData.endTime}
              onChange={handleChange}
              className={`input-field w-full ${errors.endTime ? 'border-red-500' : ''}`}
            />
            {errors.endTime && <p className="text-red-400 text-sm mt-1 font-mono">{errors.endTime}</p>}
          </div>
        </div>

        {txStatus && (
          <div className="p-4 rounded" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--purple-accent)' }}>
            <p className="text-sm font-mono" style={{ color: 'var(--purple-accent)' }}>
              {txStatus}
            </p>
          </div>
        )}

        {errors.submit && (
          <div className="p-4 rounded" style={{ background: 'var(--bg-tertiary)', border: '1px solid #ef4444' }}>
            <p className="text-sm font-mono text-red-400">
              {errors.submit}
            </p>
          </div>
        )}

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 inline-block" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Deploying...
              </>
            ) : (
              'Create Auction'
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}