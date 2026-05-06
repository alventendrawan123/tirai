import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const WALLET_PATH = resolve(
  SCRIPT_DIR,
  "..",
  "..",
  "test-wallets",
  "devnet.json",
);
const RPC_URL = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

async function main() {
  const kp = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(readFileSync(WALLET_PATH, "utf8"))),
  );
  const connection = new Connection(RPC_URL, "confirmed");
  const balance = await connection.getBalance(kp.publicKey);

  console.log("Pubkey:    ", kp.publicKey.toBase58());
  console.log(
    "Balance:   ",
    balance / LAMPORTS_PER_SOL,
    "SOL",
    `(${balance} lamports)`,
  );
  console.log(
    "Status:    ",
    balance >= 20_000_000
      ? "✅ Ready for smoke test (need ≥0.02 SOL)"
      : "⚠️  Not enough — need ≥0.02 SOL. Fund at https://faucet.solana.com",
  );
}

main().catch((err) => {
  console.error("Check failed:", err);
  process.exit(1);
});
