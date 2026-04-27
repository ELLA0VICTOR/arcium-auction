import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import anchor from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';

const { BorshCoder, EventParser } = anchor;

const router = express.Router();
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey(
  process.env.PROGRAM_ID || '7i63LBJjKScfBrNCqm1M4rj1ZP9cJKiQzgPDT1bTtGUd'
);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const METADATA_FILE = path.join(DATA_DIR, 'auction-metadata.json');
const IDL_PATH = path.resolve(__dirname, '..', '..', 'src', 'idl', 'auction.json');

let idlCache = null;
let coderCache = null;

async function ensureMetadataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(METADATA_FILE);
  } catch {
    await fs.writeFile(METADATA_FILE, '{}', 'utf8');
  }
}

async function readMetadataStore() {
  await ensureMetadataFile();
  const raw = await fs.readFile(METADATA_FILE, 'utf8');
  return JSON.parse(raw || '{}');
}

async function writeMetadataStore(store) {
  await ensureMetadataFile();
  await fs.writeFile(METADATA_FILE, JSON.stringify(store, null, 2), 'utf8');
}

async function getCoder() {
  if (coderCache) return coderCache;
  if (!idlCache) {
    const raw = await fs.readFile(IDL_PATH, 'utf8');
    idlCache = JSON.parse(raw);
  }
  coderCache = new BorshCoder(idlCache);
  return coderCache;
}

async function findResolvedAuctionEvent(auctionPda) {
  const connection = new Connection(RPC_URL, 'confirmed');
  const auctionAddress = new PublicKey(auctionPda);
  const coder = await getCoder();
  const parser = new EventParser(PROGRAM_ID, coder);

  const signatures = await connection.getSignaturesForAddress(auctionAddress, { limit: 20 });

  for (const sig of signatures) {
    const tx = await connection.getTransaction(sig.signature, {
      maxSupportedTransactionVersion: 0,
      commitment: 'confirmed',
    });

    const logs = tx?.meta?.logMessages ?? [];
    for (const event of parser.parseLogs(logs)) {
      if (event.name !== 'AuctionResolvedEvent') continue;

      const winnerBytes = event.data.winner;
      const winner = new PublicKey(Uint8Array.from(winnerBytes)).toBase58();

      return {
        signature: sig.signature,
        slot: tx?.slot ?? sig.slot,
        winner,
        paymentAmountLamports: Number(event.data.paymentAmount.toString()),
        paymentAmountSol: Number(event.data.paymentAmount.toString()) / 1e9,
        auctionType: event.data.auctionType,
      };
    }
  }

  return null;
}

router.get('/metadata', async (_req, res) => {
  try {
    const metadata = await readMetadataStore();
    res.json({ success: true, metadata });
  } catch (error) {
    console.error('Error reading auction metadata:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/metadata', async (req, res) => {
  try {
    const { auctionPDA, creator, itemName, description = '', imageUrl = '', createdAt = Date.now() } = req.body;

    if (!auctionPDA || !creator || !itemName) {
      return res.status(400).json({
        success: false,
        error: 'auctionPDA, creator, and itemName are required',
      });
    }

    const store = await readMetadataStore();
    store[auctionPDA] = {
      auctionPDA,
      creator,
      itemName,
      description,
      imageUrl,
      createdAt,
      updatedAt: Date.now(),
    };

    await writeMetadataStore(store);

    res.json({ success: true, metadata: store[auctionPDA] });
  } catch (error) {
    console.error('Error saving auction metadata:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/resolution/:auctionPda', async (req, res) => {
  try {
    const { auctionPda } = req.params;
    const resolution = await findResolvedAuctionEvent(auctionPda);

    if (!resolution) {
      return res.status(404).json({
        success: false,
        error: 'Resolved auction event not found yet',
      });
    }

    res.json({ success: true, resolution });
  } catch (error) {
    console.error('Error reading auction resolution:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

