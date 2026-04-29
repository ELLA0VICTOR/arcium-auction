/**
 * Solana Program Instructions - Real MPC (Devnet)
 */

import { PublicKey, SystemProgram } from '@solana/web3.js';
import { AnchorProvider, Program, BN } from '@coral-xyz/anchor';
import { connection, solToLamports } from './solanaConnection';
import idl from '../idl/auction.json';

export const AUCTION_PROGRAM_ID = new PublicKey(
  '5f866LzPmKY7rSc1xXZfrenpdE2hMjQp6HeiDY8j2dmK'
);

const IDL_FOR_PROGRAM = {
  ...idl,
  address: AUCTION_PROGRAM_ID.toBase58(),
};

const IDL_NO_ACCOUNTS = {
  ...IDL_FOR_PROGRAM,
  accounts: [],
};

const COMP_DEF_OFFSETS = {
  init_auction_state: 3336649196,
  place_bid: 2587304296,
  determine_winner_first_price: 2259320019,
  determine_winner_vickrey: 1215447390,
};

const ENCRYPTION_API_BASE_URL =
  import.meta.env.VITE_ENCRYPTION_API_BASE_URL || 'http://localhost:4000/api/encryption';

function getProvider(wallet) {
  return new AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
  });
}

function getReadonlyProvider() {
  const wallet = {
    publicKey: PublicKey.default,
    signTransaction: async (tx) => tx,
    signAllTransactions: async (txs) => txs,
  };

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForAuctionAccount(auctionPDA, attempts = 8, delayMs = 1200) {
  const auctionAddress = new PublicKey(auctionPDA);

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const accountInfo = await connection.getAccountInfo(auctionAddress, 'confirmed');
    if (accountInfo) {
      return true;
    }

    if (attempt < attempts - 1) {
      await sleep(delayMs);
    }
  }

  return false;
}

async function waitForAccount(address, attempts = 8, delayMs = 1200) {
  const accountAddress = new PublicKey(address);

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const accountInfo = await connection.getAccountInfo(accountAddress, 'confirmed');
    if (accountInfo) {
      return true;
    }

    if (attempt < attempts - 1) {
      await sleep(delayMs);
    }
  }

  return false;
}

async function getArciumAccounts(computationOffset, circuitName) {
  const compDefOffset = COMP_DEF_OFFSETS[circuitName];
  if (compDefOffset === undefined) {
    throw new Error(`Unknown circuit name for comp-def offset: ${circuitName}`);
  }

  const url = new URL(`${ENCRYPTION_API_BASE_URL}/arcium-accounts`);
  url.searchParams.set('computationOffset', computationOffset.toString());
  url.searchParams.set('circuitName', circuitName);

  const response = await fetch(url.toString());
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to derive Arcium accounts');
  }

  const { accounts } = data;
  return {
    arciumProgram: new PublicKey(accounts.arciumProgram),
    mxeAccount: new PublicKey(accounts.mxeAccount),
    mempoolAccount: new PublicKey(accounts.mempoolAccount),
    executingPool: new PublicKey(accounts.executingPool),
    clusterAccount: new PublicKey(accounts.clusterAccount),
    compDefAccount: new PublicKey(accounts.compDefAccount),
    computationAccount: new PublicKey(accounts.computationAccount),
    poolAccount: new PublicKey(accounts.poolAccount),
    clockAccount: new PublicKey(accounts.clockAccount),
  };
}

function parseAuctionType(auctionType) {
  if (!auctionType) return 'firstPrice';
  if ('firstPrice' in auctionType) return 'firstPrice';
  if ('vickrey' in auctionType) return 'vickrey';
  return 'firstPrice';
}

function parseAuctionStatus(status) {
  if (!status) return 'active';
  if ('open' in status) return 'active';
  if ('closed' in status) return 'closed';
  if ('resolved' in status) return 'finalized';
  return 'active';
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

export async function fetchAllAuctionsOnChain() {
  try {
    const provider = getReadonlyProvider();
    const program = new Program(IDL_FOR_PROGRAM, provider);
    const auctions = await program.account.auction.all();

    return auctions
      .map(({ publicKey, account }) => {
        const bidCount = Number(account.bidCount ?? 0);
        const endTime = Number(account.endTime.toString()) * 1000;

        return {
          id: publicKey.toBase58(),
          auctionPDA: publicKey.toBase58(),
          creator: account.authority.toBase58(),
          itemName: account.itemName,
          description: '',
          imageUrl: '',
          minimumBid: Number(account.minBid.toString()) / 1e9,
          endTime,
          bids: Array.from({ length: bidCount }, (_, index) => ({
            id: `${publicKey.toBase58()}-${index}`,
          })),
          bidCount,
          onChainBidCount: bidCount,
          auctionType: parseAuctionType(account.auctionType),
          status: parseAuctionStatus(account.status),
          createdAt: endTime,
          blockchainVerified: true,
          onChainSignature: null,
        };
      })
      .sort((a, b) => b.endTime - a.endTime);
  } catch (error) {
    console.error('Error fetching all auctions on-chain:', error);
    throw new Error(`Failed to fetch auctions: ${error.message}`);
  }
}

export async function fetchAuctionSnapshot(auctionPda) {
  try {
    const provider = getReadonlyProvider();
    const program = new Program(IDL_FOR_PROGRAM, provider);
    const account = await program.account.auction.fetch(new PublicKey(auctionPda));
    const bidCount = Number(account.bidCount ?? 0);

    return {
      auctionPDA: auctionPda,
      bidCount,
      onChainBidCount: bidCount,
      status: parseAuctionStatus(account.status),
      auctionType: parseAuctionType(account.auctionType),
      endTime: Number(account.endTime.toString()) * 1000,
    };
  } catch (error) {
    console.error('Error fetching auction snapshot:', error);
    throw new Error(`Failed to fetch auction snapshot: ${error.message}`);
  }
}

async function waitForBidCountIncrease(auctionPda, previousBidCount, attempts = 45, delayMs = 2000) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const snapshot = await fetchAuctionSnapshot(auctionPda);
    if (Number(snapshot.bidCount ?? 0) > previousBidCount) {
      return snapshot;
    }

    if (attempt < attempts - 1) {
      await sleep(delayMs);
    }
  }

  throw new Error('Bid was queued but has not settled on-chain yet. Please wait a bit longer and refresh. Do not resubmit the same bid.');
}

async function waitForAuctionStatus(auctionPda, expectedStatus, attempts = 20, delayMs = 2000) {
  const expectedStatuses = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const snapshot = await fetchAuctionSnapshot(auctionPda);
    if (expectedStatuses.includes(snapshot.status)) {
      return snapshot;
    }

    if (attempt < attempts - 1) {
      await sleep(delayMs);
    }
  }

  throw new Error(`Auction did not reach ${expectedStatuses.join(' or ')} status in time.`);
}

export async function createAuctionOnChain(wallet, auctionData) {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected');
  }

  const computationOffset = new BN(Date.now());
  const auctionPDA = getAuctionPDA(wallet.publicKey.toBase58(), computationOffset);

  try {
    const provider = getProvider(wallet);
    const program = new Program(IDL_NO_ACCOUNTS, provider);
    const signPdaAccount = PublicKey.findProgramAddressSync(
      [Buffer.from('ArciumSignerAccount')],
      AUCTION_PROGRAM_ID
    )[0];

    const arcium = await getArciumAccounts(computationOffset, 'init_auction_state');
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
      recovered: false,
    };
  } catch (error) {
    const errorMessage = String(error?.message || error);
    const alreadyProcessed = errorMessage.includes('already been processed');

    if (alreadyProcessed) {
      const auctionWasCreated = await waitForAuctionAccount(auctionPDA.toBase58());

      if (auctionWasCreated) {
        console.info(
          'Create auction returned an already-processed error, but the auction account exists on-chain. Recovering as success.'
        );

        return {
          signature: null,
          auctionPDA: auctionPDA.toBase58(),
          computationOffset: computationOffset.toString(),
          recovered: true,
        };
      }
    }

    console.error('Error creating auction on-chain:', error);
    throw new Error(`Failed to create auction: ${error.message}`);
  }
}

export async function submitBidOnChain(wallet, auctionPda, encryptedBid, bidAmountSOL) {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected');
  }
  if (!encryptedBid?.x25519PublicKey) {
    throw new Error('Missing bid encryption public key');
  }

  const computationOffset = new BN(Date.now());
  const auction = new PublicKey(auctionPda);
  const snapshotBeforeBid = await fetchAuctionSnapshot(auctionPda);
  const previousBidCount = Number(snapshotBeforeBid.bidCount ?? 0);

  try {
    const provider = getProvider(wallet);
    const program = new Program(IDL_NO_ACCOUNTS, provider);
    const signPdaAccount = PublicKey.findProgramAddressSync(
      [Buffer.from('ArciumSignerAccount')],
      AUCTION_PROGRAM_ID
    )[0];
    const arcium = await getArciumAccounts(computationOffset, 'place_bid');

    const signature = await program.methods
      .placeBid(
        computationOffset,
        Uint8Array.from(encryptedBid.encryptedBidderLo),
        Uint8Array.from(encryptedBid.encryptedBidderHi),
        Uint8Array.from(encryptedBid.encryptedAmount),
        Uint8Array.from(encryptedBid.x25519PublicKey),
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

    const settledSnapshot = await waitForBidCountIncrease(auctionPda, previousBidCount);

    console.log('Bid submitted on-chain:', signature);

    return {
      signature,
      escrowAmount: bidAmountSOL,
      recovered: false,
      computationOffset: computationOffset.toString(),
      settledBidCount: Number(settledSnapshot.bidCount ?? previousBidCount + 1),
    };
  } catch (error) {
    const errorMessage = String(error?.message || error);
    const alreadyProcessed = errorMessage.includes('already been processed');

    if (alreadyProcessed) {
      const arcium = await getArciumAccounts(computationOffset, 'place_bid');
      const computationExists = await waitForAccount(arcium.computationAccount.toBase58());

      if (computationExists) {
        console.info(
          'Place bid returned an already-processed error, but the Arcium computation account exists on-chain. Waiting for callback settlement.'
        );

        const settledSnapshot = await waitForBidCountIncrease(auctionPda, previousBidCount);

        return {
          signature: null,
          escrowAmount: bidAmountSOL,
          recovered: true,
          computationOffset: computationOffset.toString(),
          settledBidCount: Number(settledSnapshot.bidCount ?? previousBidCount + 1),
        };
      }
    }

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

  const provider = getProvider(wallet);
  const program = new Program(IDL_NO_ACCOUNTS, provider);
  const computationOffset = new BN(Date.now());
  const auction = new PublicKey(auctionPda);
  const signPdaAccount = PublicKey.findProgramAddressSync(
    [Buffer.from('ArciumSignerAccount')],
    AUCTION_PROGRAM_ID
  )[0];

  try {
    await program.methods
      .closeAuction()
      .accountsStrict({
        authority: wallet.publicKey,
        auction,
      })
      .rpc();
  } catch (error) {
    const errorMessage = String(error?.message || error);
    const alreadyProcessed = errorMessage.includes('already been processed');

    if (!alreadyProcessed) {
      console.error('Error closing auction before finalization:', error);
      throw new Error(`Failed to finalize: ${error.message}`);
    }
  }

  await waitForAuctionStatus(auctionPda, ['closed', 'finalized']);

  try {
    const circuit = auctionType === 'vickrey' ? 'determine_winner_vickrey' : 'determine_winner_first_price';
    const arcium = await getArciumAccounts(computationOffset, circuit);

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

    return { signature, status: 'computing', recovered: false };
  } catch (error) {
    const errorMessage = String(error?.message || error);
    const alreadyProcessed = errorMessage.includes('already been processed');

    if (alreadyProcessed) {
      const circuit = auctionType === 'vickrey' ? 'determine_winner_vickrey' : 'determine_winner_first_price';
      const arcium = await getArciumAccounts(computationOffset, circuit);
      const computationExists = await waitForAccount(arcium.computationAccount.toBase58());

      if (computationExists) {
        console.info(
          'Finalize returned an already-processed error, but the Arcium computation account exists on-chain. Recovering as queued.'
        );

        return { signature: null, status: 'computing', recovered: true };
      }
    }

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
  fetchAllAuctionsOnChain,
  fetchAuctionSnapshot,
  AUCTION_PROGRAM_ID,
};









