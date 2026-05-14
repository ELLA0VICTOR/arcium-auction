import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { createAuctionOnChain } from '../utils/programInstructions';
import { saveAuctionMetadata } from '../utils/auctionApi';
import { ImageIcon, LockIcon, PlusIcon, XIcon } from './icons';

export default function AuctionCreator({ onCreateAuction, onCancel }) {
  const { connected, publicKey } = useWallet();
  const wallet = useWallet();
  const [formData, setFormData] = useState({
    itemName: '',
    description: '',
    imageUrl: '',
    minimumBid: '',
    endTime: '',
    auctionType: 'firstPrice',
  });
  const [uploadedImageDataUrl, setUploadedImageDataUrl] = useState('');
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

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, imageUrl: 'Please choose a valid image file' }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, imageUrl: 'Image file must be 5MB or smaller for shared metadata sync' }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setUploadedImageDataUrl(String(reader.result || ''));
      setErrors((prev) => ({ ...prev, imageUrl: '' }));
    };
    reader.onerror = () => {
      setErrors((prev) => ({ ...prev, imageUrl: 'Failed to read image file' }));
    };
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.itemName.trim()) {
      newErrors.itemName = 'Item name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    const selectedImage = uploadedImageDataUrl || formData.imageUrl.trim();
    if (selectedImage) {
      if (selectedImage.startsWith('data:image/')) {
        // Uploaded image, valid data URL.
      } else {
        try {
          const parsed = new URL(selectedImage);
          if (!['http:', 'https:'].includes(parsed.protocol)) {
            newErrors.imageUrl = 'Image URL must start with http:// or https://';
          }
        } catch {
          newErrors.imageUrl = 'Enter a valid image URL';
        }
      }
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
        imageUrl: uploadedImageDataUrl || formData.imageUrl.trim(),
        minimumBid: parseFloat(formData.minimumBid),
        endTime: new Date(formData.endTime).getTime(),
        bids: [],
        auctionType: formData.auctionType,
        status: 'active',
        createdAt: Date.now(),
      };

      setTxStatus('Creating auction on Solana devnet...');
      const result = await createAuctionOnChain(wallet, newAuction);

      if (result.recovered) {
        setTxStatus('Auction was already accepted on-chain. Syncing metadata...');
      }

      newAuction.onChainSignature = result.signature;
      newAuction.auctionPDA = result.auctionPDA;
      newAuction.computationOffset = result.computationOffset;

      try {
        await saveAuctionMetadata({
          auctionPDA: newAuction.auctionPDA,
          creator: newAuction.creator,
          itemName: newAuction.itemName,
          description: newAuction.description,
          imageUrl: newAuction.imageUrl,
          createdAt: newAuction.createdAt,
        });
      } catch (metadataError) {
        console.error('Auction metadata sync failed:', metadataError);
        window.alert(
          'Auction was created on-chain, but shared image metadata did not sync. Try a smaller image or use a hosted image URL for global image visibility.'
        );
      }

      setTxStatus('Transaction confirmed. Syncing auction data...');

      await new Promise(resolve => setTimeout(resolve, 1000));

      await onCreateAuction(newAuction);
      setFormData({
        itemName: '',
        description: '',
        imageUrl: '',
        minimumBid: '',
        endTime: '',
        auctionType: 'firstPrice',
      });
      setUploadedImageDataUrl('');
      setTxStatus('');
    } catch (error) {
      setErrors({ submit: error.message });
      setTxStatus('');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!connected) {
    return (
      <div className="form-card">
        <div className="modal-header">
          <div className="form-header">
            <div className="form-icon-box">
              <LockIcon size={20} strokeWidth={1.6} />
            </div>
            <div>
              <h3>Wallet Not Connected</h3>
              <p>Connect a wallet to create an auction.</p>
            </div>
          </div>
          <button type="button" className="button-icon" onClick={onCancel} aria-label="Close create auction">
            <XIcon size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="form-card">
      <div className="modal-header">
        <div className="form-header">
          <div className="form-icon-box">
            <PlusIcon size={20} strokeWidth={1.7} />
          </div>
          <div>
            <h2>Create Auction</h2>
            <p>Deploy to Solana Devnet</p>
          </div>
        </div>
        <button type="button" className="button-icon" onClick={onCancel} aria-label="Close create auction" disabled={isSubmitting}>
          <XIcon size={16} strokeWidth={1.5} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="form-stack">
        <div className="form-section">
          <label className="form-label">Auction Type</label>
          <div className="choice-grid">
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, auctionType: 'firstPrice' }))}
              className={formData.auctionType === 'firstPrice' ? 'choice-card is-selected' : 'choice-card'}
            >
              <div className="choice-card-title">
                <span>First-Price</span>
                <span className="tag-pill">DEFAULT</span>
              </div>
              <p>Highest sealed bid wins and pays exactly their own bid amount.</p>
            </button>

            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, auctionType: 'vickrey' }))}
              className={formData.auctionType === 'vickrey' ? 'choice-card is-selected' : 'choice-card'}
            >
              <div className="choice-card-title">
                <span>Vickrey</span>
                <span className="tag-pill">SECOND PRICE</span>
              </div>
              <p>Highest sealed bid wins, but pays the second-highest bid amount.</p>
            </button>
          </div>
        </div>

        <div className="form-section">
          <label className="form-label" htmlFor="itemName">Item Name</label>
          <input
            id="itemName"
            type="text"
            name="itemName"
            value={formData.itemName}
            onChange={handleChange}
            placeholder="Rare NFT Collection"
            className={errors.itemName ? 'form-input is-invalid' : 'form-input'}
          />
          {errors.itemName && <p className="error-text">{errors.itemName}</p>}
        </div>

        <div className="form-section">
          <label className="form-label" htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe what you are auctioning..."
            rows={4}
            className={errors.description ? 'form-textarea is-invalid' : 'form-textarea'}
          />
          {errors.description && <p className="error-text">{errors.description}</p>}
        </div>

        <div className="form-section">
          <label className="form-label">Item Image</label>
          <div className="upload-row">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className={errors.imageUrl ? 'form-input is-invalid' : 'form-input'}
            />
            <input
              type="url"
              name="imageUrl"
              value={formData.imageUrl}
              onChange={handleChange}
              placeholder="or paste image URL"
              className={errors.imageUrl ? 'form-input is-invalid' : 'form-input'}
            />
          </div>
          {(uploadedImageDataUrl || formData.imageUrl.trim()) && (
            <div className="image-preview">
              <img
                src={uploadedImageDataUrl || formData.imageUrl.trim()}
                alt="Auction item preview"
              />
              <div className="image-preview-actions">
                <button
                  type="button"
                  className="button-ghost"
                  onClick={() => {
                    setUploadedImageDataUrl('');
                    setFormData((prev) => ({ ...prev, imageUrl: '' }));
                  }}
                >
                  <ImageIcon size={13} strokeWidth={1.5} />
                  Clear Image
                </button>
              </div>
            </div>
          )}
          {errors.imageUrl && <p className="error-text">{errors.imageUrl}</p>}
        </div>

        <div className="form-grid-2">
          <div className="form-section">
            <label className="form-label" htmlFor="minimumBid">Minimum Bid</label>
            <div className="input-with-unit">
              <span className="input-unit">SOL</span>
              <input
                id="minimumBid"
                type="number"
                name="minimumBid"
                value={formData.minimumBid}
                onChange={handleChange}
                placeholder="0.5"
                step="0.01"
                min="0"
                className={errors.minimumBid ? 'form-input is-invalid' : 'form-input'}
              />
            </div>
            {errors.minimumBid && <p className="error-text">{errors.minimumBid}</p>}
          </div>

          <div className="form-section">
            <label className="form-label" htmlFor="endTime">Auction End Time</label>
            <input
              id="endTime"
              type="datetime-local"
              name="endTime"
              value={formData.endTime}
              onChange={handleChange}
              className={errors.endTime ? 'form-input is-invalid' : 'form-input'}
            />
            {errors.endTime && <p className="error-text">{errors.endTime}</p>}
          </div>
        </div>

        {txStatus && <div className="tx-status">{txStatus}</div>}

        {errors.submit && <div className="submit-error">{errors.submit}</div>}

        <div className="form-actions">
          <button
            type="submit"
            disabled={isSubmitting}
            className="button-primary"
          >
            {isSubmitting ? 'Deploying...' : 'Create Auction'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="button-secondary"
            disabled={isSubmitting}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
