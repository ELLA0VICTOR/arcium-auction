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

const ARCIUM_PROGRAM_ID = new PublicKey('Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ');
const ARCIUM_CLUSTER_OFFSET = 456;
const OFFSET_BUFFER_SIZE = 4;

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

function u32ToLeBuffer(value) {
  const buffer = Buffer.alloc(OFFSET_BUFFER_SIZE);
  buffer.writeUInt32LE(value, 0);
  return buffer;
}

function deriveArciumPda(seeds) {
  return PublicKey.findProgramAddressSync(seeds, ARCIUM_PROGRAM_ID)[0];
}

function getMxeAccAddress(programId) {
  return deriveArciumPda([Buffer.from('MXEAccount'), programId.toBuffer()]);
}

function getMempoolAccAddress(clusterOffset) {
  return deriveArciumPda([Buffer.from('Mempool'), u32ToLeBuffer(clusterOffset)]);
}

function getExecutingPoolAccAddress(clusterOffset) {
  return deriveArciumPda([Buffer.from('Execpool'), u32ToLeBuffer(clusterOffset)]);
}

function getClusterAccAddress(clusterOffset) {
  return deriveArciumPda([Buffer.from('Cluster'), u32ToLeBuffer(clusterOffset)]);
}

function getCompDefAccAddress(programId, compDefOffset) {
  return deriveArciumPda([
    Buffer.from('ComputationDefinitionAccount'),
    programId.toBuffer(),
    u32ToLeBuffer(compDefOffset),
  ]);
}

function getComputationAccAddress(clusterOffset, computationOffset) {
  return deriveArciumPda([
    Buffer.from('ComputationAccount'),
    u32ToLeBuffer(clusterOffset),
    u64ToLeBuffer(computationOffset),
  ]);
}

function getFeePoolAccAddress() {
  return deriveArciumPda([Buffer.from('FeePool')]);
}

function getClockAccAddress() {
  return deriveArciumPda([Buffer.from('ClockAccount')]);
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

async function assertAccountOwnedBy(address, expectedOwner, label) {
  const info = await connection.getAccountInfo(address, 'confirmed');
  if (!info) {
    throw new Error(`${label} account ${address.toBase58()} does not exist. Re-run MXE/comp-def initialization for this program.`);
  }

  if (!info.owner.equals(expectedOwner)) {
    throw new Error(
      `${label} account ${address.toBase58()} is owned by ${info.owner.toBase58()}, expected ${expectedOwner.toBase58()}. Check that the frontend and API are using the same deployed auction program.`
    );
  }
}

async function getArciumAccounts(computationOffset, circuitName) {
  const compDefOffset = COMP_DEF_OFFSETS[circuitName];
  if (compDefOffset === undefined) {
    throw new Error(`Unknown circuit name for comp-def offset: ${circuitName}`);
  }

  const computationOffsetBn = BN.isBN(computationOffset)
    ? computationOffset
    : new BN(computationOffset.toString());

  const accounts = {
    arciumProgram: ARCIUM_PROGRAM_ID,
    mxeAccount: getMxeAccAddress(AUCTION_PROGRAM_ID),
    mempoolAccount: getMempoolAccAddress(ARCIUM_CLUSTER_OFFSET),
    executingPool: getExecutingPoolAccAddress(ARCIUM_CLUSTER_OFFSET),
    clusterAccount: getClusterAccAddress(ARCIUM_CLUSTER_OFFSET),
    compDefAccount: getCompDefAccAddress(AUCTION_PROGRAM_ID, compDefOffset),
    computationAccount: getComputationAccAddress(ARCIUM_CLUSTER_OFFSET, computationOffsetBn),
    poolAccount: getFeePoolAccAddress(),
    clockAccount: getClockAccAddress(),
  };

  await assertAccountOwnedBy(accounts.mxeAccount, accounts.arciumProgram, 'Arcium MXE');

  return accounts;
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

function parsePubkey(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value.toBase58 === 'function') return value.toBase58();
  try {
    return new PublicKey(value).toBase58();
  } catch {
    return null;
  }
}

function isDefaultPubkey(address) {
  return !address || address === PublicKey.default.toBase58();
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

export function getBidDepositPDA(auctionPda, bidderPubkey) {
  const auction = new PublicKey(auctionPda);
  const bidder = new PublicKey(bidderPubkey);
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('bid_deposit'), auction.toBuffer(), bidder.toBuffer()],
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
        const winner = parsePubkey(account.winner);
        const paymentAmount = Number(account.paymentAmount?.toString?.() ?? account.paymentAmount ?? 0);

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
          winner: isDefaultPubkey(winner) ? null : winner,
          winningBid: paymentAmount > 0 ? paymentAmount / 1e9 : undefined,
          proceedsClaimed: Boolean(account.proceedsClaimed),
          createdAt: endTime,
          blockchainVerified: true,
          onChainSignature: null,
        };
      })
      .sort((a, b) => b.endTime - a.endTime);
  } catch (error) {
    throw new Error(`Failed to fetch auctions: ${error.message}`);
  }
}

export async function fetchAuctionSnapshot(auctionPda) {
  try {
    const provider = getReadonlyProvider();
    const program = new Program(IDL_FOR_PROGRAM, provider);
    const account = await program.account.auction.fetch(new PublicKey(auctionPda));
    const bidCount = Number(account.bidCount ?? 0);
    const winner = parsePubkey(account.winner);
    const paymentAmount = Number(account.paymentAmount?.toString?.() ?? account.paymentAmount ?? 0);

    return {
      auctionPDA: auctionPda,
      bidCount,
      onChainBidCount: bidCount,
      status: parseAuctionStatus(account.status),
      auctionType: parseAuctionType(account.auctionType),
      endTime: Number(account.endTime.toString()) * 1000,
      minimumBid: Number(account.minBid.toString()) / 1e9,
      winner: isDefaultPubkey(winner) ? null : winner,
      winningBid: paymentAmount > 0 ? paymentAmount / 1e9 : undefined,
      proceedsClaimed: Boolean(account.proceedsClaimed),
    };
  } catch (error) {
    throw new Error(`Failed to fetch auction snapshot: ${error.message}`);
  }
}

export async function fetchBidDepositStatus(auctionPda, bidderPubkey) {
  const bidDepositPda = getBidDepositPDA(auctionPda, bidderPubkey);

  try {
    const provider = getReadonlyProvider();
    const program = new Program(IDL_FOR_PROGRAM, provider);
    const account = await program.account.bidDeposit.fetch(bidDepositPda);

    return {
      exists: true,
      bidDepositPda: bidDepositPda.toBase58(),
      amount: Number(account.amount?.toString?.() ?? account.amount ?? 0) / 1e9,
      bidder: parsePubkey(account.bidder),
      auction: parsePubkey(account.auction),
    };
  } catch {
    return {
      exists: false,
      bidDepositPda: bidDepositPda.toBase58(),
      amount: 0,
    };
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
        return {
          signature: null,
          auctionPDA: auctionPDA.toBase58(),
          computationOffset: computationOffset.toString(),
          recovered: true,
        };
      }
    }

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
  const bidDeposit = getBidDepositPDA(auctionPda, wallet.publicKey);
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
        bidDeposit,
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

    return {
      signature,
      escrowAmount: bidAmountSOL,
      bidBondAmount: snapshotBeforeBid.minimumBid,
      bidDepositPda: bidDeposit.toBase58(),
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
        const settledSnapshot = await waitForBidCountIncrease(auctionPda, previousBidCount);

        return {
          signature: null,
          escrowAmount: bidAmountSOL,
          bidBondAmount: snapshotBeforeBid.minimumBid,
          bidDepositPda: bidDeposit.toBase58(),
          recovered: true,
          computationOffset: computationOffset.toString(),
          settledBidCount: Number(settledSnapshot.bidCount ?? previousBidCount + 1),
        };
      }
    }

    if (error.message.includes('insufficient')) {
      throw new Error('Insufficient SOL balance. Get devnet SOL: https://faucet.solana.com');
    }
    throw new Error(`Failed to submit bid: ${error.message}`);
  }
}

export async function claimBidRefundOnChain(wallet, auctionPda) {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected');
  }

  const provider = getProvider(wallet);
  const program = new Program(IDL_NO_ACCOUNTS, provider);
  const auction = new PublicKey(auctionPda);
  const bidDeposit = getBidDepositPDA(auctionPda, wallet.publicKey);

  try {
    const signature = await program.methods
      .claimRefund()
      .accountsStrict({
        bidder: wallet.publicKey,
        auction,
        bidDeposit,
      })
      .rpc();

    return {
      signature,
      bidDepositPda: bidDeposit.toBase58(),
    };
  } catch (error) {
    throw new Error(`Failed to claim refund: ${error.message}`);
  }
}

export async function claimWinningDepositOnChain(wallet, auctionPda, winnerAddress) {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected');
  }
  if (!winnerAddress) {
    throw new Error('Winner address is not available yet.');
  }

  const provider = getProvider(wallet);
  const program = new Program(IDL_NO_ACCOUNTS, provider);
  const auction = new PublicKey(auctionPda);
  const winnerBidDeposit = getBidDepositPDA(auctionPda, winnerAddress);

  try {
    const signature = await program.methods
      .claimWinningDeposit()
      .accountsStrict({
        authority: wallet.publicKey,
        auction,
        winnerBidDeposit,
      })
      .rpc();

    return {
      signature,
      bidDepositPda: winnerBidDeposit.toBase58(),
    };
  } catch (error) {
    throw new Error(`Failed to claim winning deposit: ${error.message}`);
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
    const auctionNotOpen =
      errorMessage.includes('AuctionNotOpen') ||
      errorMessage.includes('Error Number: 6002');

    if (!alreadyProcessed && !auctionNotOpen) {
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
        return { signature: null, status: 'computing', recovered: true };
      }
    }

    throw new Error(`Failed to finalize: ${error.message}`);
  }
}
export async function getWalletBalance(publicKey) {
  try {
    const balance = await connection.getBalance(publicKey);
    return balance / 1e9;
  } catch (_error) {
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
  } catch (_error) {
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
  getBidDepositPDA,
  fetchAllAuctionsOnChain,
  fetchAuctionSnapshot,
  fetchBidDepositStatus,
  claimBidRefundOnChain,
  claimWinningDepositOnChain,
  AUCTION_PROGRAM_ID,
};










