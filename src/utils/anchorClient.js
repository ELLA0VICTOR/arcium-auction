/**
 * Anchor Program Client
 * 
 * This module provides a bridge between the React frontend and the deployed
 * Solana program. It handles all interactions with the on-chain auction contract.
 */

import * as anchor from '@coral-xyz/anchor';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { Connection, PublicKey, SystemProgram } from '@solana/web3.js';
import { connection } from './solanaConnection';

// Program ID - will be updated after deployment
// For now, using placeholder. Update this after running `anchor deploy`
const PROGRAM_ID = new PublicKey('AucBLdAuct1on11111111111111111111111111111');

/**
 * Get Anchor provider from wallet
 */
function getProvider(wallet) {
  if (!wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  const provider = new AnchorProvider(
    connection,
    wallet,
    { commitment: 'confirmed' }
  );

  return provider;
}

/**
 * Get program instance
 */
async function getProgram(wallet) {
  const provider = getProvider(wallet);
  
  // IDL will be generated after building the program
  // For development, we'll construct calls manually
  const program = new Program(IDL, PROGRAM_ID, provider);
  
  return program;
}

/**
 * Derive auction PDA
 */
export function getAuctionPDA(creator, itemName) {
  const [auctionPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('auction'),
      creator.toBuffer(),
      Buffer.from(itemName),
    ],
    PROGRAM_ID
  );
  return auctionPDA;
}

/**
 * Derive bid PDA
 */
export function getBidPDA(auctionPDA, bidder, bidCount) {
  const [bidPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('bid'),
      auctionPDA.toBuffer(),
      bidder.toBuffer(),
      Buffer.from(bidCount.toString()),
    ],
    PROGRAM_ID
  );
  return bidPDA;
}

/**
 * Create auction on-chain using deployed program
 */
export async function createAuctionWithProgram(wallet, auctionData, arciumPubkey) {
  try {
    const program = await getProgram(wallet);
    const auctionPDA = getAuctionPDA(wallet.publicKey, auctionData.itemName);

    const tx = await program.methods
      .createAuction(
        auctionData.itemName,
        auctionData.description,
        new anchor.BN(auctionData.minimumBid * 1e9), // Convert SOL to lamports
        new anchor.BN(Math.floor(auctionData.endTime / 1000)), // Convert to seconds
        Array.from(arciumPubkey) // Arcium MXE public key
      )
      .accounts({
        auction: auctionPDA,
        creator: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log('Auction created on-chain:', tx);
    
    return {
      signature: tx,
      auctionPDA: auctionPDA.toString(),
    };
  } catch (error) {
    console.error('Error creating auction:', error);
    throw error;
  }
}

/**
 * Submit encrypted bid using deployed program
 */
export async function submitBidWithProgram(
  wallet,
  auctionPDA,
  encryptedBid,
  bidCount
) {
  try {
    const program = await getProgram(wallet);
    const bidPDA = getBidPDA(
      new PublicKey(auctionPDA),
      wallet.publicKey,
      bidCount
    );

    const tx = await program.methods
      .submitBid(
        Array.from(encryptedBid.ciphertext),     // Encrypted bid data
        Array.from(encryptedBid.publicKey),       // x25519 public key
        Array.from(encryptedBid.nonce)            // Encryption nonce
      )
      .accounts({
        auction: new PublicKey(auctionPDA),
        bid: bidPDA,
        bidder: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log('Bid submitted on-chain:', tx);
    
    return {
      signature: tx,
      bidPDA: bidPDA.toString(),
    };
  } catch (error) {
    console.error('Error submitting bid:', error);
    throw error;
  }
}

/**
 * Finalize auction using deployed program
 */
export async function finalizeAuctionWithProgram(
  wallet,
  auctionPDA,
  winner,
  winningBid,
  computationId
) {
  try {
    const program = await getProgram(wallet);

    const tx = await program.methods
      .finalizeAuction(
        new PublicKey(winner),
        new anchor.BN(winningBid * 1e9),
        computationId
      )
      .accounts({
        auction: new PublicKey(auctionPDA),
        authority: wallet.publicKey,
      })
      .rpc();

    console.log('Auction finalized on-chain:', tx);
    
    return { signature: tx };
  } catch (error) {
    console.error('Error finalizing auction:', error);
    throw error;
  }
}

/**
 * Fetch auction data from chain
 */
export async function fetchAuctionData(auctionPDA) {
  try {
    const program = await getProgram({ publicKey: new PublicKey('11111111111111111111111111111111') });
    const auction = await program.account.auction.fetch(new PublicKey(auctionPDA));
    
    return {
      creator: auction.creator.toString(),
      itemName: auction.itemName,
      description: auction.description,
      minBid: auction.minBid.toNumber() / 1e9,
      endTime: auction.endTime.toNumber() * 1000,
      status: auction.status,
      bidCount: auction.bidCount.toNumber(),
      winner: auction.winner?.toString(),
      winningBid: auction.winningBid?.toNumber() / 1e9,
    };
  } catch (error) {
    console.error('Error fetching auction:', error);
    return null;
  }
}

// Minimal IDL for type safety (will be auto-generated after build)
const IDL = {
  version: "0.1.0",
  name: "auction",
  instructions: [
    {
      name: "createAuction",
      accounts: [
        { name: "auction", isMut: true, isSigner: false },
        { name: "creator", isMut: true, isSigner: true },
        { name: "systemProgram", isMut: false, isSigner: false }
      ],
      args: [
        { name: "itemName", type: "string" },
        { name: "description", type: "string" },
        { name: "minBid", type: "u64" },
        { name: "endTime", type: "i64" },
        { name: "arciumMxePubkey", type: { array: ["u8", 32] } }
      ]
    },
    {
      name: "submitBid",
      accounts: [
        { name: "auction", isMut: true, isSigner: false },
        { name: "bid", isMut: true, isSigner: false },
        { name: "bidder", isMut: true, isSigner: true },
        { name: "systemProgram", isMut: false, isSigner: false }
      ],
      args: [
        { name: "encryptedBidData", type: { vec: "u8" } },
        { name: "bidderPubkey", type: { array: ["u8", 32] } },
        { name: "nonce", type: { array: ["u8", 16] } }
      ]
    },
    {
      name: "finalizeAuction",
      accounts: [
        { name: "auction", isMut: true, isSigner: false },
        { name: "authority", isMut: false, isSigner: true }
      ],
      args: [
        { name: "winnerPubkey", type: "publicKey" },
        { name: "winningBidAmount", type: "u64" },
        { name: "mpcComputationId", type: "string" }
      ]
    }
  ],
  accounts: [
    {
      name: "Auction",
      type: {
        kind: "struct",
        fields: [
          { name: "creator", type: "publicKey" },
          { name: "itemName", type: "string" },
          { name: "description", type: "string" },
          { name: "minBid", type: "u64" },
          { name: "endTime", type: "i64" },
          { name: "createdAt", type: "i64" },
          { name: "status", type: { defined: "AuctionStatus" } },
          { name: "bidCount", type: "u64" },
          { name: "arciumMxePubkey", type: { array: ["u8", 32] } },
          { name: "winner", type: { option: "publicKey" } },
          { name: "winningBid", type: { option: "u64" } },
          { name: "mpcComputationId", type: { option: "string" } },
          { name: "finalizedAt", type: { option: "i64" } },
          { name: "bump", type: "u8" }
        ]
      }
    },
    {
      name: "Bid",
      type: {
        kind: "struct",
        fields: [
          { name: "auction", type: "publicKey" },
          { name: "bidder", type: "publicKey" },
          { name: "encryptedData", type: { vec: "u8" } },
          { name: "x25519Pubkey", type: { array: ["u8", 32] } },
          { name: "nonce", type: { array: ["u8", 16] } },
          { name: "timestamp", type: "i64" },
          { name: "bump", type: "u8" }
        ]
      }
    }
  ],
  types: [
    {
      name: "AuctionStatus",
      type: {
        kind: "enum",
        variants: [
          { name: "Active" },
          { name: "Finalized" },
          { name: "Cancelled" }
        ]
      }
    }
  ]
};

export default {
  createAuctionWithProgram,
  submitBidWithProgram,
  finalizeAuctionWithProgram,
  fetchAuctionData,
  getAuctionPDA,
  getBidPDA,
  PROGRAM_ID,
};