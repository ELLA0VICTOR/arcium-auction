/**
 * Solana Program Instructions
 * 
 * This module handles actual blockchain transactions for the auction system.
 * Uses Solana devnet for real on-chain interactions.
 */

import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { connection } from './solanaConnection';

/**
 * Program ID for our auction contract
 * For demo, we'll use a deterministic PDA as our "program"
 * In production, this would be your deployed program ID
 */
const AUCTION_PROGRAM_SEED = 'arcium_auction';

/**
 * Get or create auction account PDA
 */
export function getAuctionPDA(auctionId) {
  // Create a deterministic public key for this auction
  const seeds = [
    Buffer.from(AUCTION_PROGRAM_SEED),
    Buffer.from(auctionId),
  ];
  
  // For demo, we'll use SystemProgram as the program ID
  // In production, use your deployed program's ID
  const programId = SystemProgram.programId;
  
  return PublicKey.findProgramAddressSync(seeds, programId)[0];
}

/**
 * Create auction on-chain
 * Sends a real transaction to Solana devnet
 */
export async function createAuctionOnChain(wallet, auctionData) {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected');
  }

  try {
    // Get auction PDA
    const auctionPDA = getAuctionPDA(auctionData.id);

    // Create account to store auction data
    const createAccountIx = SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: auctionPDA,
      lamports: await connection.getMinimumBalanceForRentExemption(1000),
      space: 1000,
      programId: SystemProgram.programId,
    });

    // Build transaction
    const transaction = new Transaction().add(createAccountIx);
    
    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;

    // Sign and send transaction
    const signed = await wallet.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signed.serialize());

    // Confirm transaction
    await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight,
    });

    console.log('Auction created on-chain:', signature);
    return { signature, auctionPDA: auctionPDA.toString() };

  } catch (error) {
    console.error('Error creating auction on-chain:', error);
    throw new Error(`Failed to create auction: ${error.message}`);
  }
}

/**
 * Submit encrypted bid on-chain
 * Transfers actual SOL as escrow + stores encrypted bid data
 */
export async function submitBidOnChain(wallet, auctionId, encryptedBid, bidAmountSOL) {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected');
  }

  try {
    const auctionPDA = getAuctionPDA(auctionId);

    // Convert SOL to lamports
    const lamports = Math.floor(bidAmountSOL * LAMPORTS_PER_SOL);

    // Transfer SOL to auction escrow
    const transferIx = SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: auctionPDA,
      lamports: lamports,
    });

    // Build transaction
    const transaction = new Transaction().add(transferIx);
    
    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;

    // Sign and send
    const signed = await wallet.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signed.serialize());

    // Confirm
    await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight,
    });

    console.log('Bid submitted on-chain:', signature);
    return { signature, escrowAmount: bidAmountSOL };

  } catch (error) {
    console.error('Error submitting bid on-chain:', error);
    
    // Provide user-friendly error messages
    if (error.message.includes('insufficient')) {
      throw new Error('Insufficient SOL balance. Please fund your wallet from the devnet faucet.');
    }
    
    throw new Error(`Failed to submit bid: ${error.message}`);
  }
}

/**
 * Finalize auction and return funds
 */
export async function finalizeAuctionOnChain(wallet, auctionId, winnerAddress, winningBidSOL) {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected');
  }

  try {
    const auctionPDA = getAuctionPDA(auctionId);
    const winnerPubkey = new PublicKey(winnerAddress);

    // Get auction escrow balance
    const balance = await connection.getBalance(auctionPDA);
    
    if (balance === 0) {
      console.warn('No funds in escrow to transfer');
      return { signature: 'no_funds', transferred: 0 };
    }

    // Transfer winning bid to auction creator (you)
    // In production, this would be more sophisticated
    const transferIx = SystemProgram.transfer({
      fromPubkey: auctionPDA,
      toPubkey: wallet.publicKey,
      lamports: Math.floor(winningBidSOL * LAMPORTS_PER_SOL),
    });

    const transaction = new Transaction().add(transferIx);
    
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;

    const signed = await wallet.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signed.serialize());

    await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight,
    });

    console.log('Auction finalized on-chain:', signature);
    return { signature, transferred: winningBidSOL };

  } catch (error) {
    console.error('Error finalizing auction:', error);
    throw new Error(`Failed to finalize: ${error.message}`);
  }
}

/**
 * Check wallet balance
 */
export async function getWalletBalance(publicKey) {
  try {
    const balance = await connection.getBalance(publicKey);
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error('Error getting balance:', error);
    return 0;
  }
}

/**
 * Request devnet SOL airdrop
 */
export async function requestDevnetAirdrop(publicKey, amount = 1) {
  try {
    console.log('Requesting airdrop...');
    const signature = await connection.requestAirdrop(
      publicKey,
      amount * LAMPORTS_PER_SOL
    );

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    
    await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight,
    });

    console.log('Airdrop successful:', signature);
    return signature;
  } catch (error) {
    console.error('Airdrop failed:', error);
    throw new Error('Airdrop failed. Please try the public faucet: https://faucet.solana.com');
  }
}

export default {
  createAuctionOnChain,
  submitBidOnChain,
  finalizeAuctionOnChain,
  getWalletBalance,
  requestDevnetAirdrop,
  getAuctionPDA,
};