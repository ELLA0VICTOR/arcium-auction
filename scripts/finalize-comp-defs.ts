import * as anchor from "@coral-xyz/anchor";
import { readFileSync } from "node:fs";
import {
  buildFinalizeCompDefTx,
  getCompDefAccOffset,
  uploadCircuit,
} from "@arcium-hq/client";
import { Auction } from "../target/types/auction.js";

function toU32LE(bytes: Uint8Array): number {
  return ((bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24)) >>> 0);
}

async function run(): Promise<void> {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Auction as anchor.Program<Auction>;

  const circuits = [
    { name: "init_auction_state", file: "build/init_auction_state.arcis" },
    { name: "place_bid", file: "build/place_bid.arcis" },
    { name: "determine_winner_first_price", file: "build/determine_winner_first_price.arcis" },
    { name: "determine_winner_vickrey", file: "build/determine_winner_vickrey.arcis" },
  ];
  const onlyRaw = process.env.ARCIUM_CIRCUITS;
  const only =
    onlyRaw
      ? new Set(
          onlyRaw
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
        )
      : null;

  for (const c of circuits) {
    if (only && !only.has(c.name)) {
      console.log(`[skip] ${c.name}: not in ARCIUM_CIRCUITS`);
      continue;
    }
    const raw = readFileSync(c.file);
    const compDefOffset = toU32LE(getCompDefAccOffset(c.name));

    try {
      await uploadCircuit(
        provider,
        c.name,
        program.programId,
        new Uint8Array(raw),
        true
      );
      console.log(`[ok] uploaded ${c.name}`);
    } catch (err) {
      const msg = String(err);
      if (
        msg.includes("already") ||
        msg.includes("exists") ||
        msg.includes("AccountAlreadyInitialized")
      ) {
        console.log(`[skip] upload ${c.name}: already present`);
      } else {
        throw err;
      }
    }

    try {
      const tx = await buildFinalizeCompDefTx(provider, compDefOffset, program.programId);
      const sig = await provider.sendAndConfirm(tx, []);
      console.log(`[ok] finalized ${c.name}: ${sig}`);
    } catch (err) {
      const msg = String(err);
      if (
        msg.includes("already") ||
        msg.includes("completed") ||
        msg.includes("AccountAlreadyInitialized")
      ) {
        console.log(`[skip] finalize ${c.name}: already completed`);
      } else {
        throw err;
      }
    }
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
