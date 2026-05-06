/**
 * ⚠️  SAFETY BOUNDARY — DEVNET ONLY
 *
 * This script generates a fresh keypair and writes the secret key to disk
 * at ../test-wallets/devnet.json. This pattern is ONLY safe because:
 *
 *   1. The file is written to a path matched by `.gitignore` (`test-wallets/`)
 *   2. The wallet is for Solana **devnet** only (fake SOL, no market value)
 *   3. The wallet is never funded above 2 SOL (cap exposure)
 *   4. The script refuses to overwrite an existing wallet without explicit consent
 *
 * NEVER copy this pattern into:
 *   - Any code under `src/` (production library code path)
 *   - Any wallet that touches mainnet SOL or real assets
 *   - CI/CD secrets handling (use a secret manager instead)
 *
 * For mainnet/production, the only acceptable signing flow is the wallet
 * adapter (`Signer` interface in src/types/api.ts) — Phantom/Solflare/etc
 * sign in the browser; raw private keys are never read by Tirai code.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  type PublicKey,
} from "@solana/web3.js";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const FORCE = process.argv.includes("--force");
const RPC_URL = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const TARGET_LAMPORTS = LAMPORTS_PER_SOL; // 1 SOL — capped exposure
const WALLET_PATH = resolve(
  SCRIPT_DIR,
  "..",
  "..",
  "test-wallets",
  "devnet.json",
);

async function pollForBalance(
  connection: Connection,
  pubkey: PublicKey,
  minLamports: number,
  timeoutMs = 60_000,
): Promise<number> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const balance = await connection.getBalance(pubkey, "confirmed");
    if (balance >= minLamports) return balance;
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(
    `Airdrop did not confirm within ${timeoutMs / 1000}s. Devnet faucet may be rate-limited — try again in a few minutes, or fund manually via https://faucet.solana.com`,
  );
}

async function main() {
  console.log("=".repeat(60));
  console.log("TIRAI — Devnet test wallet setup");
  console.log("⚠️  DEVNET ONLY — fake SOL, zero market value");
  console.log("=".repeat(60));
  console.log();

  if (!RPC_URL.includes("devnet")) {
    throw new Error(
      `Refusing to run: SOLANA_RPC_URL must point to devnet. Got: ${RPC_URL}`,
    );
  }

  if (existsSync(WALLET_PATH) && !FORCE) {
    throw new Error(
      `Wallet already exists at ${WALLET_PATH}\n` +
        `If you really want to overwrite it (you'll lose access to the old wallet), re-run with --force`,
    );
  }

  console.log("RPC:               ", RPC_URL);
  console.log("Wallet path:       ", WALLET_PATH);
  console.log("(this path is gitignored — secret key won't be committed)");
  console.log();

  console.log("🔑 Generating fresh keypair...");
  const kp = Keypair.generate();
  console.log("Pubkey:            ", kp.publicKey.toBase58());

  mkdirSync(dirname(WALLET_PATH), { recursive: true });
  writeFileSync(WALLET_PATH, JSON.stringify(Array.from(kp.secretKey)), {
    mode: 0o600,
  });
  console.log("✓ Secret key written to disk (mode 0600 where supported)");
  console.log();

  const connection = new Connection(RPC_URL, "confirmed");

  console.log(
    `💧 Requesting airdrop (${TARGET_LAMPORTS / LAMPORTS_PER_SOL} SOL)...`,
  );
  let signature: string;
  try {
    signature = await connection.requestAirdrop(kp.publicKey, TARGET_LAMPORTS);
    console.log("Airdrop tx:        ", signature);
  } catch (error) {
    console.error("❌ Airdrop request failed:");
    console.error(error instanceof Error ? error.message : error);
    console.error();
    console.error(
      "Devnet faucet may be rate-limited. Fund manually:\n" +
        `  https://faucet.solana.com  (paste pubkey: ${kp.publicKey.toBase58()})\n` +
        "Then re-run this script — it will skip generation since the wallet exists.",
    );
    process.exit(1);
  }

  console.log("⏳ Waiting for airdrop confirmation...");
  const balance = await pollForBalance(
    connection,
    kp.publicKey,
    TARGET_LAMPORTS,
  );

  console.log();
  console.log("✅ WALLET READY");
  console.log("Pubkey:            ", kp.publicKey.toBase58());
  console.log(
    "Balance:           ",
    balance / LAMPORTS_PER_SOL,
    "SOL (",
    balance,
    "lamports)",
  );
  console.log();
  console.log("Next step — run the bounty smoke test:");
  console.log();
  console.log(`  KEYPAIR_PATH="${WALLET_PATH}" pnpm test:bounty`);
  console.log();
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error();
  console.error("❌ Setup failed:");
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
