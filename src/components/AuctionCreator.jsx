import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

export default function AuctionCreator({ onCreateAuction, onCancel }) {
  const { connected, publicKey } = useWallet();
  const [formData, setFormData] = useState({
    itemName: '',
    description: '',
    minimumBid: '',
    endTime: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    setTimeout(() => {
      const newAuction = {
        id: crypto.randomUUID(),
        creator: publicKey.toString(),
        itemName: formData.itemName,
        description: formData.description,
        minimumBid: parseFloat(formData.minimumBid),
        endTime: new Date(formData.endTime).getTime(),
        bids: [],
        status: 'active',
        createdAt: Date.now(),
      };

      onCreateAuction(newAuction);
      setIsSubmitting(false);
      setFormData({ itemName: '', description: '', minimumBid: '', endTime: '' });
    }, 800);
  };

  if (!connected) {
    return (
      <div className="glass-card p-8 text-center">
        <svg className="w-16 h-16 mx-auto mb-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <h3 className="text-xl font-display font-semibold mb-2">Wallet Not Connected</h3>
        <p className="text-gray-400">Please connect your wallet to create an auction</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-display font-bold">Create Auction</h2>
          <p className="text-sm text-gray-400">Set up a new blind sealed-bid auction</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Item Name</label>
          <input
            type="text"
            name="itemName"
            value={formData.itemName}
            onChange={handleChange}
            placeholder="e.g., Rare NFT Collection"
            className={`input-field w-full ${errors.itemName ? 'border-red-500' : ''}`}
          />
          {errors.itemName && <p className="text-red-400 text-sm mt-1">{errors.itemName}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe what you're auctioning..."
            rows={4}
            className={`input-field w-full resize-none ${errors.description ? 'border-red-500' : ''}`}
          />
          {errors.description && <p className="text-red-400 text-sm mt-1">{errors.description}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Minimum Bid (SOL)</label>
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
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400 font-mono">◎</span>
            </div>
            {errors.minimumBid && <p className="text-red-400 text-sm mt-1">{errors.minimumBid}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Auction End Time</label>
            <input
              type="datetime-local"
              name="endTime"
              value={formData.endTime}
              onChange={handleChange}
              className={`input-field w-full ${errors.endTime ? 'border-red-500' : ''}`}
            />
            {errors.endTime && <p className="text-red-400 text-sm mt-1">{errors.endTime}</p>}
          </div>
        </div>

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
                Creating Auction...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 inline-block mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Create Auction
              </>
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