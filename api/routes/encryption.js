import express from 'express';
import { RescueCipher, x25519 } from '@arcium-hq/client';

const router = express.Router();

/**
 * Get MXE Public Key
 * 
 * In production, this would fetch from your deployed MXE program
 * For demo, using a deterministic test key
 */
router.get('/mxe-pubkey', async (req, res) => {
  try {
    // TODO: Replace with actual MXE public key fetch
    // const mxePublicKey = await getMXEPublicKeyWithRetry(provider, programId);
    
    // For now, generate deterministic test key
    const testPrivateKey = new Uint8Array(32).fill(1);
    const mxePublicKey = x25519.getPublicKey(testPrivateKey);
    
    res.json({
      success: true,
      publicKey: Array.from(mxePublicKey),
      note: 'Using test MXE public key. Replace with deployed MXE in production.'
    });
  } catch (error) {
    console.error('Error getting MXE public key:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Encrypt Bid
 * 
 * Uses real Arcium SDK to encrypt bid amounts
 * POST /api/encryption/encrypt-bid
 * Body: { bidAmount: number (in lamports) }
 */
router.post('/encrypt-bid', async (req, res) => {
  try {
    const { bidAmount } = req.body;
    
    if (!bidAmount || bidAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid bid amount'
      });
    }

    // Convert to BigInt
    const amount = BigInt(Math.floor(bidAmount));
    
    // Get MXE public key
    const testPrivateKey = new Uint8Array(32).fill(1);
    const mxePublicKey = x25519.getPublicKey(testPrivateKey);
    
    // Generate ephemeral x25519 keypair
    const privateKey = x25519.utils.randomSecretKey();
    const publicKey = x25519.getPublicKey(privateKey);
    
    // Generate random nonce
    const nonce = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
      nonce[i] = Math.floor(Math.random() * 256);
    }
    
    // Perform x25519 key exchange
    const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
    
    // Initialize Rescue cipher
    const cipher = new RescueCipher(sharedSecret);
    
    // Encrypt the bid
    const plaintext = [amount];
    const ciphertext = cipher.encrypt(plaintext, nonce);
    
    console.log('✅ Bid encrypted successfully');
    console.log('   Amount:', amount.toString());
    console.log('   Ciphertext length:', ciphertext.length);
    
    res.json({
      success: true,
      encrypted: {
        ciphertext: Array.from(ciphertext),
        publicKey: Array.from(publicKey),
        nonce: Array.from(nonce),
        metadata: {
          algorithm: 'x25519-Rescue',
          sdk: '@arcium-hq/client',
          timestamp: Date.now(),
          version: '1.0.0',
        },
      },
    });
    
  } catch (error) {
    console.error('❌ Encryption error:', error);
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
 * POST /api/encryption/decrypt-bid
 * Body: { ciphertext: number[], nonce: number[], publicKey: number[] }
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

    // Get MXE private key (test key)
    const mxePrivateKey = new Uint8Array(32).fill(1);
    
    // Convert arrays to Uint8Array
    const ciphertextBytes = new Uint8Array(ciphertext);
    const nonceBytes = new Uint8Array(nonce);
    const publicKeyBytes = new Uint8Array(publicKey);
    
    // Perform key exchange
    const sharedSecret = x25519.getSharedSecret(mxePrivateKey, publicKeyBytes);
    
    // Initialize cipher
    const cipher = new RescueCipher(sharedSecret);
    
    // Decrypt
    const plaintext = cipher.decrypt(ciphertextBytes, nonceBytes);
    
    res.json({
      success: true,
      decrypted: {
        amount: plaintext[0].toString(),
        lamports: Number(plaintext[0]),
        sol: Number(plaintext[0]) / 1e9,
      },
    });
    
  } catch (error) {
    console.error('Decryption error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;