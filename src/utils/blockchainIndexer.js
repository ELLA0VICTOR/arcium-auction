/**
 * Blockchain Data Indexer
 * 
 * Fetches auction and bid data from Solana blockchain
 * Makes data persist across devices and browsers
 */

import { connection } from './solanaConnection';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

/**
 * Fetch all transactions for a wallet address
 * Filters for auction-related transactions
 */
export async function fetchUserAuctions(walletPublicKey) {
  if (!walletPublicKey) {
    return { auctions: [], bids: [] };
  }

  try {
    console.log('🔍 Fetching blockchain data for wallet:', walletPublicKey.toString());

    // Get transaction signatures for this wallet
    const signatures = await connection.getSignaturesForAddress(walletPublicKey, {
      limit: 100, // Last 100 transactions
    });

    console.log(`   Found ${signatures.length} transactions`);

    // Parse transactions to find auctions and bids
    const auctions = [];
    const bids = [];

    for (const sig of signatures) {
      try {
        // Get transaction details
        const tx = await connection.getTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0,
        });

        if (!tx || !tx.meta) continue;

        // Check transaction memo/logs for auction markers
        const logs = tx.meta.logMessages || [];
        
        // Look for our auction creation pattern (small transfer to self)
        const isAuctionCreation = 
          tx.transaction.message.accountKeys.length > 0 &&
          tx.meta.postBalances[0] - tx.meta.preBalances[0] < 0 && // User paid
          Math.abs(tx.meta.postBalances[0] - tx.meta.preBalances[0]) < 0.01 * LAMPORTS_PER_SOL; // Small amount

        // Look for bid submissions (larger transfers)
        const isBidSubmission = 
          tx.meta.postBalances[0] - tx.meta.preBalances[0] < -0.01 * LAMPORTS_PER_SOL; // Larger amount transferred

        if (isAuctionCreation) {
          // This might be an auction creation
          // Store signature for later matching with localStorage
          auctions.push({
            signature: sig.signature,
            timestamp: sig.blockTime * 1000,
            slot: sig.slot,
          });
        }

        if (isBidSubmission) {
          // This might be a bid submission
          const amount = Math.abs(tx.meta.postBalances[0] - tx.meta.preBalances[0]) / LAMPORTS_PER_SOL;
          bids.push({
            signature: sig.signature,
            timestamp: sig.blockTime * 1000,
            amount: amount,
            slot: sig.slot,
          });
        }
      } catch (err) {
        console.warn('Error parsing transaction:', err.message);
      }
    }

    console.log(`✅ Found ${auctions.length} potential auctions, ${bids.length} potential bids`);

    return { auctions, bids };

  } catch (error) {
    console.error('❌ Error fetching blockchain data:', error);
    return { auctions: [], bids: [] };
  }
}

/**
 * Merge blockchain data with localStorage data
 * Adds on-chain signatures to existing auctions
 */
export function mergeBlockchainData(localAuctions, blockchainData) {
  const { auctions: chainAuctions, bids: chainBids } = blockchainData;

  // For each local auction, try to find matching blockchain transaction
  const mergedAuctions = localAuctions.map(auction => {
    // If auction already has signature, keep it
    if (auction.onChainSignature) {
      return auction;
    }

    // Try to find matching blockchain transaction by timestamp
    const match = chainAuctions.find(chainAuction => {
      const timeDiff = Math.abs(chainAuction.timestamp - auction.createdAt);
      return timeDiff < 60000; // Within 1 minute
    });

    if (match) {
      return {
        ...auction,
        onChainSignature: match.signature,
        blockchainVerified: true,
      };
    }

    return auction;
  });

  // Add blockchain metadata to bids
  const mergedAuctionsWithBids = mergedAuctions.map(auction => {
    const updatedBids = auction.bids.map(bid => {
      if (bid.signature) {
        return bid;
      }

      // Try to match bid with blockchain transaction
      const match = chainBids.find(chainBid => {
        const timeDiff = Math.abs(chainBid.timestamp - bid.timestamp);
        return timeDiff < 60000 && Math.abs(chainBid.amount - bid.amount) < 0.001;
      });

      if (match) {
        return {
          ...bid,
          signature: match.signature,
          blockchainVerified: true,
        };
      }

      return bid;
    });

    return {
      ...auction,
      bids: updatedBids,
    };
  });

  return mergedAuctionsWithBids;
}

/**
 * Verify an auction exists on-chain
 */
export async function verifyAuctionOnChain(signature) {
  try {
    const tx = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    return !!tx; // Returns true if transaction exists
  } catch (error) {
    console.error('Error verifying transaction:', error);
    return false;
  }
}

/**
 * Get transaction details for display
 */
export async function getTransactionDetails(signature) {
  try {
    const tx = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
      return null;
    }

    return {
      signature,
      blockTime: tx.blockTime,
      slot: tx.slot,
      fee: tx.meta.fee / LAMPORTS_PER_SOL,
      success: tx.meta.err === null,
    };
  } catch (error) {
    console.error('Error getting transaction details:', error);
    return null;
  }
}

export default {
  fetchUserAuctions,
  mergeBlockchainData,
  verifyAuctionOnChain,
  getTransactionDetails,
};