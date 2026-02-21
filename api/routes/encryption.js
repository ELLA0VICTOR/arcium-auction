import express from 'express';
import {
  RescueCipher,
  getArciumProgram,
  getArciumProgramId,
  getClockAccAddress,
  getClusterAccAddress,
  getCompDefAccAddress,
  getComputationAccAddress,
  getExecutingPoolAccAddress,
  getFeePoolAccAddress,
  getMempoolAccAddress,
  getMXEAccAddress,
  x25519,
} from '@arcium-hq/client';
import * as anchor from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';

const router = express.Router();

// Deployed program configuration
const PROGRAM_ID = new PublicKey(
  process.env.PROGRAM_ID || '5gnKVawJTz7aFEJWxEDgCANUZbpmKzm9U9FnXbuYWdkr'
);
const CLUSTER_OFFSET = Number(process.env.CLUSTER_OFFSET || 456);
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';

const COMP_DEF_OFFSETS = {
  init_auction_state: 3336649196,
  place_bid: 2587304296,
  determine_winner_first_price: 2259320019,
  determine_winner_vickrey: 1215447390,
};

function buildArciumProvider() {
  const connection = new Connection(RPC_URL, 'confirmed');
  const wallet = new anchor.Wallet(anchor.web3.Keypair.generate());
  return new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' });
}

function extractMxeX25519Pubkey(mxe) {
  const utility = mxe?.utilityPubkeys ?? mxe?.utility_pubkeys;
  const set = utility?.set;
  const setInner = set?.[0] ?? set?.['0'] ?? set;
  const x25519Pubkey = setInner?.x25519Pubkey ?? setInner?.x25519_pubkey;
  if (!x25519Pubkey) {
    throw new Error('MXE utility pubkeys not initialized yet');
  }
  return x25519Pubkey;
}

router.get('/arcium-accounts', async (req, res) => {
  try {
    const computationOffsetRaw = req.query.computationOffset;
    const circuitName = String(req.query.circuitName || '');

    if (!computationOffsetRaw) {
      return res.status(400).json({
        success: false,
        error: 'Missing computationOffset query param',
      });
    }

    if (!COMP_DEF_OFFSETS[circuitName]) {
      return res.status(400).json({
        success: false,
        error: `Unknown circuit name: ${circuitName}`,
      });
    }

    const computationOffsetString = String(computationOffsetRaw);
    if (!/^\d+$/.test(computationOffsetString)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid computationOffset',
      });
    }
    const computationOffsetBn = new anchor.BN(computationOffsetString);

    const compDefOffset = COMP_DEF_OFFSETS[circuitName];
    const accounts = {
      arciumProgram: getArciumProgramId().toString(),
      mxeAccount: getMXEAccAddress(PROGRAM_ID).toString(),
      mempoolAccount: getMempoolAccAddress(CLUSTER_OFFSET).toString(),
      executingPool: getExecutingPoolAccAddress(CLUSTER_OFFSET).toString(),
      clusterAccount: getClusterAccAddress(CLUSTER_OFFSET).toString(),
      compDefAccount: getCompDefAccAddress(PROGRAM_ID, compDefOffset).toString(),
      computationAccount: getComputationAccAddress(CLUSTER_OFFSET, computationOffsetBn).toString(),
      poolAccount: getFeePoolAccAddress().toString(),
      clockAccount: getClockAccAddress().toString(),
      clusterOffset: CLUSTER_OFFSET,
      programId: PROGRAM_ID.toString(),
      circuitName,
      compDefOffset,
      computationOffset: computationOffsetString,
    };

    res.json({ success: true, accounts });
  } catch (error) {
    console.error('Error deriving Arcium accounts:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get MXE Public Key from Deployed Cluster
 * 
 * Fetches the real MXE public key from the deployed Arcium program
 */
router.get('/mxe-pubkey', async (req, res) => {
  try {
    const provider = buildArciumProvider();
    const arciumProgram = getArciumProgram(provider);
    const mxePDA = getMXEAccAddress(PROGRAM_ID);
    
    console.log('ðŸ“¡ Fetching MXE public key...');
    console.log('   Program ID:', PROGRAM_ID.toString());
    console.log('   Cluster Offset:', CLUSTER_OFFSET);
    console.log('   MXE PDA:', mxePDA.toString());
    
    const mxe = await arciumProgram.account.mxeAccount.fetch(mxePDA);
    const mxePublicKey = extractMxeX25519Pubkey(mxe);
    
    console.log('âœ… MXE public key fetched');
    console.log('   Length:', mxePublicKey.length, 'bytes');
    
    res.json({
      success: true,
      publicKey: Array.from(mxePublicKey),
      programId: PROGRAM_ID.toString(),
      clusterOffset: CLUSTER_OFFSET,
      mxePDA: mxePDA.toString(),
      note: 'Real MXE public key from deployed cluster'
    });
    
  } catch (error) {
    console.error('âŒ Error getting MXE public key:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      hint: 'Make sure program is deployed with: arcium deploy --cluster-offset 456'
    });
  }
});

/**
 * Encrypt Bid with Real MXE Public Key
 * 
 * POST /api/encryption/encrypt-bid
 * Body: { bidAmount: number (in lamports) }
 */
router.post('/encrypt-bid', async (req, res) => {
  try {
    const { bidAmount, bidderPubkey } = req.body;
    
    if (!bidAmount || bidAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid bid amount'
      });
    }
    if (!bidderPubkey) {
      return res.status(400).json({
        success: false,
        error: 'Missing bidder pubkey'
      });
    }

    // Convert to BigInt
    const amount = BigInt(Math.floor(bidAmount));
    
    console.log('ðŸ“¡ Encrypting bid with deployed MXE...');
    console.log('   Amount:', amount.toString(), 'lamports');
    
    // Fetch real MXE public key
    const provider = buildArciumProvider();
    const arciumProgram = getArciumProgram(provider);
    const mxePDA = getMXEAccAddress(PROGRAM_ID);
    const mxe = await arciumProgram.account.mxeAccount.fetch(mxePDA);
    const mxePublicKeyBytes = new Uint8Array(extractMxeX25519Pubkey(mxe));
    
    // Generate ephemeral x25519 keypair
    const privateKey = x25519.utils.randomSecretKey();
    const publicKey = x25519.getPublicKey(privateKey);
    
    // Generate random nonce
    const nonce = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
      nonce[i] = Math.floor(Math.random() * 256);
    }
    
    // Perform x25519 key exchange with REAL MXE public key
    const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKeyBytes);
    
    // Initialize Rescue cipher
    const cipher = new RescueCipher(sharedSecret);
    
    // Convert bidder pubkey to two u128 values (LE)
    const bidderBytes = new PublicKey(bidderPubkey).toBytes();
    const toU128 = (bytes) => {
      let out = 0n;
      for (let i = 0; i < bytes.length; i++) {
        out += BigInt(bytes[i]) << (8n * BigInt(i));
      }
      return out;
    };
    const bidderLo = toU128(bidderBytes.slice(0, 16));
    const bidderHi = toU128(bidderBytes.slice(16, 32));

    // Encrypt [bidderLo, bidderHi, amount]
    const plaintext = [bidderLo, bidderHi, amount];
    const ciphertext = cipher.encrypt(plaintext, nonce);
    
    console.log('âœ… Bid encrypted with REAL MXE public key');
    console.log('   Algorithm: x25519 + Rescue');
    console.log('   MXE Cluster: Offset', CLUSTER_OFFSET);
    console.log('   Ciphertext length:', ciphertext.length);
    
    res.json({
      success: true,
      encrypted: {
        encryptedBidderLo: ciphertext[0],
        encryptedBidderHi: ciphertext[1],
        encryptedAmount: ciphertext[2],
        bidderPubkey: Array.from(bidderBytes),
        x25519PublicKey: Array.from(publicKey),
        nonce: Array.from(nonce),
        metadata: {
          algorithm: 'x25519-Rescue',
          sdk: '@arcium-hq/client',
          programId: PROGRAM_ID.toString(),
          clusterOffset: CLUSTER_OFFSET,
          mxePDA: mxePDA.toString(),
          timestamp: Date.now(),
          version: '1.0.0-mpc',
        },
      },
    });
    
  } catch (error) {
    console.error('âŒ Encryption error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Decrypt Bid (for testing/verification only)
 * 
 * In production MPC, only Arx nodes can decrypt during computation
 * POST /api/encryption/decrypt-bid
 */
router.post('/decrypt-bid', async (req, res) => {
  try {
    const { ciphertext, nonce, publicKey } = req.body;
    
    if (!ciphertext || !nonce || !publicKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // NOTE: In production MPC, this wouldn't work because we don't have MXE private key
    // Only Arx nodes can decrypt during computation
    console.log('âš ï¸  Decryption is for testing only');
    console.log('   In production MPC, only Arx nodes can decrypt');
    
    res.json({
      success: false,
      error: 'Decryption only available to Arx nodes during MPC computation',
      hint: 'Use arcium computation tracking to get results'
    });
    
  } catch (error) {
    console.error('Decryption error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Track MPC Computation Status
 * 
 * GET /api/encryption/computation/:auctionId
 */
router.get('/computation/:auctionId', async (req, res) => {
  try {
    const { auctionId } = req.params;
    
    // In production, this would query Arcium's computation tracking
    // For now, return status structure
    
    res.json({
      success: true,
      auctionId,
      status: 'pending', // pending | processing | finalized
      note: 'MPC computation tracking - integrate with Arcium SDK'
    });
    
  } catch (error) {
    console.error('Computation tracking error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;


