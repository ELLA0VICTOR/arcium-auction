/**
 * Solana Program Instructions - Real MPC (Devnet)
 */

import { PublicKey, SystemProgram } from '@solana/web3.js';
import { AnchorProvider, Program, BN } from '@coral-xyz/anchor';
import {
  getArciumEnv,
  getArciumProgramId,
  getClockAccAddress,
  getClusterAccAddress,
  getCompDefAccAddress,
  getComputationAccAddress,
  getExecutingPoolAccAddress,
  getFeePoolAccAddress,
  getMempoolAccAddress,
  getMXEAccAddress,
} from '@arcium-hq/client';
import { connection, solToLamports } from './solanaConnection';
import idl from '../idl/auction.json';

export const AUCTION_PROGRAM_ID = new PublicKey(
  '5gnKVawJTz7aFEJWxEDgCANUZbpmKzm9U9FnXbuYWdkr'
);

const IDL_NO_ACCOUNTS = {
  ...idl,
  accounts: [],
};

const COMP_DEF_OFFSETS = {
  init_auction_state: 3336649196,
  place_bid: 2587304296,
  determine_winner_first_price: 2259320019,
  determine_winner_vickrey: 1215447390,
};

function getProvider(wallet) {
  return new AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
  });
}

function u128FromLeBytes(bytes) {
  let out = 0n;
  for (let i = 0; i < bytes.length; i++) {
    out += BigInt(bytes[i]) << (8n * BigInt(i));
  }
  return new BN(out.toString());
}

function u64ToLeBuffer(value) {
  const bn = BN.isBN(value) ? value : new BN(value.toString());
  return bn.toArrayLike(Buffer, 'le', 8);
}

function getArciumAccounts(computationOffset, circuitName) {
  let clusterOffset = 456;
  try {
    clusterOffset = getArciumEnv().arciumClusterOffset;
  } catch (_err) {
    // keep default
  }

  const compDefOffset = COMP_DEF_OFFSETS[circuitName];
  if (compDefOffset === undefined) {
    throw new Error(`Unknown circuit name for comp-def offset: ${circuitName}`);
  }

  return {
    arciumProgram: getArciumProgramId(),
    mxeAccount: getMXEAccAddress(AUCTION_PROGRAM_ID),
    mempoolAccount: getMempoolAccAddress(clusterOffset),
    executingPool: getExecutingPoolAccAddress(clusterOffset),
    clusterAccount: getClusterAccAddress(clusterOffset),
    compDefAccount: getCompDefAccAddress(AUCTION_PROGRAM_ID, compDefOffset),
    computationAccount: getComputationAccAddress(clusterOffset, computationOffset),
    poolAccount: getFeePoolAccAddress(),
    clockAccount: getClockAccAddress(),
  };
}

export function getAuctionPDA(authorityPubkey, computationOffset) {
  if (computationOffset === undefined || computationOffset === null) {
    throw new Error('computationOffset is required to derive auction PDA');
  }
  const authority = new PublicKey(authorityPubkey);
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('auction'), authority.toBuffer(), u64ToLeBuffer(computationOffset)],
    AUCTION_PROGRAM_ID
  );
  return pda;
}

export async function createAuctionOnChain(wallet, auctionData) {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected');
  }

  try {
    const provider = getProvider(wallet);
    const program = new Program(IDL_NO_ACCOUNTS, provider);

    const computationOffset = new BN(Date.now());
    const auctionPDA = getAuctionPDA(wallet.publicKey.toBase58(), computationOffset);
    const signPdaAccount = PublicKey.findProgramAddressSync(
      [Buffer.from('ArciumSignerAccount')],
      AUCTION_PROGRAM_ID
    )[0];

    const arcium = getArciumAccounts(computationOffset, 'init_auction_state');
    const auctionType = auctionData.auctionType === 'vickrey' ? { vickrey: {} } : { firstPrice: {} };

    const signature = await program.methods
      .createAuction(
        computationOffset,
        auctionType,
        new BN(solToLamports(auctionData.minimumBid)),
        new BN(Math.floor(auctionData.endTime / 1000)),
        auctionData.itemName
      )
      .accountsStrict({
        authority: wallet.publicKey,
        auction: auctionPDA,
        signPdaAccount,
        mxeAccount: arcium.mxeAccount,
        mempoolAccount: arcium.mempoolAccount,
        executingPool: arcium.executingPool,
        computationAccount: arcium.computationAccount,
        compDefAccount: arcium.compDefAccount,
        clusterAccount: arcium.clusterAccount,
        poolAccount: arcium.poolAccount,
        clockAccount: arcium.clockAccount,
        systemProgram: SystemProgram.programId,
        arciumProgram: arcium.arciumProgram,
      })
      .rpc();

    console.log('Auction created on-chain:', signature);
    console.log('Program:', AUCTION_PROGRAM_ID.toString());

    return {
      signature,
      auctionPDA: auctionPDA.toBase58(),
      computationOffset: computationOffset.toString(),
    };
  } catch (error) {
    console.error('Error creating auction on-chain:', error);
    throw new Error(`Failed to create auction: ${error.message}`);
  }
}

export async function submitBidOnChain(wallet, auctionPda, encryptedBid, bidAmountSOL) {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected');
  }

  try {
    const provider = getProvider(wallet);
    const program = new Program(IDL_NO_ACCOUNTS, provider);

    const computationOffset = new BN(Date.now());
    const auction = new PublicKey(auctionPda);
    const signPdaAccount = PublicKey.findProgramAddressSync(
      [Buffer.from('ArciumSignerAccount')],
      AUCTION_PROGRAM_ID
    )[0];
    const arcium = getArciumAccounts(computationOffset, 'place_bid');

    const signature = await program.methods
      .placeBid(
        computationOffset,
        Uint8Array.from(encryptedBid.encryptedBidderLo),
        Uint8Array.from(encryptedBid.encryptedBidderHi),
        Uint8Array.from(encryptedBid.encryptedAmount),
        Uint8Array.from(encryptedBid.bidderPubkey),
        u128FromLeBytes(encryptedBid.nonce)
      )
      .accountsStrict({
        bidder: wallet.publicKey,
        auction,
        signPdaAccount,
        mxeAccount: arcium.mxeAccount,
        mempoolAccount: arcium.mempoolAccount,
        executingPool: arcium.executingPool,
        computationAccount: arcium.computationAccount,
        compDefAccount: arcium.compDefAccount,
        clusterAccount: arcium.clusterAccount,
        poolAccount: arcium.poolAccount,
        clockAccount: arcium.clockAccount,
        systemProgram: SystemProgram.programId,
        arciumProgram: arcium.arciumProgram,
      })
      .rpc();

    console.log('Bid submitted on-chain:', signature);

    return { signature, escrowAmount: bidAmountSOL };
  } catch (error) {
    console.error('Error submitting bid on-chain:', error);
    if (error.message.includes('insufficient')) {
      throw new Error('Insufficient SOL balance. Get devnet SOL: https://faucet.solana.com');
    }
    throw new Error(`Failed to submit bid: ${error.message}`);
  }
}

export async function finalizeAuctionOnChain(wallet, auctionPda, auctionType = 'firstPrice') {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected');
  }

  try {
    const provider = getProvider(wallet);
    const program = new Program(IDL_NO_ACCOUNTS, provider);
    const computationOffset = new BN(Date.now());
    const auction = new PublicKey(auctionPda);
    const signPdaAccount = PublicKey.findProgramAddressSync(
      [Buffer.from('ArciumSignerAccount')],
      AUCTION_PROGRAM_ID
    )[0];

    await program.methods
      .closeAuction()
      .accountsStrict({
        authority: wallet.publicKey,
        auction,
      })
      .rpc();

    const circuit = auctionType === 'vickrey' ? 'determine_winner_vickrey' : 'determine_winner_first_price';
    const arcium = getArciumAccounts(computationOffset, circuit);

    const method = auctionType === 'vickrey'
      ? program.methods.determineWinnerVickrey(computationOffset)
      : program.methods.determineWinnerFirstPrice(computationOffset);

    const signature = await method
      .accountsStrict({
        authority: wallet.publicKey,
        auction,
        signPdaAccount,
        mxeAccount: arcium.mxeAccount,
        mempoolAccount: arcium.mempoolAccount,
        executingPool: arcium.executingPool,
        computationAccount: arcium.computationAccount,
        compDefAccount: arcium.compDefAccount,
        clusterAccount: arcium.clusterAccount,
        poolAccount: arcium.poolAccount,
        clockAccount: arcium.clockAccount,
        systemProgram: SystemProgram.programId,
        arciumProgram: arcium.arciumProgram,
      })
      .rpc();

    return { signature, status: 'computing' };
  } catch (error) {
    console.error('Error finalizing auction:', error);
    throw new Error(`Failed to finalize: ${error.message}`);
  }
}

export async function getWalletBalance(publicKey) {
  try {
    const balance = await connection.getBalance(publicKey);
    return balance / 1e9;
  } catch (error) {
    console.error('Error getting balance:', error);
    return 0;
  }
}

export async function requestDevnetAirdrop(publicKey, amount = 1) {
  try {
    const signature = await connection.requestAirdrop(
      publicKey,
      amount * 1e9
    );

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

    await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight,
    });

    return signature;
  } catch (error) {
    console.error('Airdrop failed:', error);
    throw new Error('Airdrop failed. Use: https://faucet.solana.com');
  }
}

export default {
  createAuctionOnChain,
  submitBidOnChain,
  finalizeAuctionOnChain,
  getWalletBalance,
  requestDevnetAirdrop,
  getAuctionPDA,
  AUCTION_PROGRAM_ID,
};
