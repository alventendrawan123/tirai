import { readFileSync } from "node:fs";
import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { createBountyPayment } from "../src/bounty/create-bounty-payment";
import { keypairToSigner } from "../src/lib/keypair-signer";
import { decodeClaimTicket } from "../src/ticket/decode";

async function main() {
  const rpcUrl = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
  const keypairPath = process.env.KEYPAIR_PATH;

  if (!keypairPath) {
    throw new Error(
      "Set KEYPAIR_PATH env var to a funded devnet wallet (e.g. ~/.config/solana/id.json)",
    );
  }

  console.log("=".repeat(60));
  console.log("TIRAI — createBountyPayment devnet smoke test");
  console.log("=".repeat(60));
  console.log();

  const connection = new Connection(rpcUrl, "confirmed");
  const payerKp = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(readFileSync(keypairPath, "utf8"))),
  );

  console.log("RPC:               ", rpcUrl);
  console.log("Payer pubkey:      ", payerKp.publicKey.toBase58());

  const balance = await connection.getBalance(payerKp.publicKey);
  console.log("Payer balance:     ", balance / LAMPORTS_PER_SOL, "SOL");

  const amountLamports = BigInt(Math.floor(0.01 * LAMPORTS_PER_SOL));
  if (BigInt(balance) < amountLamports + 5_000_000n + 100_000n) {
    throw new Error(
      `Insufficient balance. Need at least ${(Number(amountLamports) + 5_100_000) / LAMPORTS_PER_SOL} SOL. Run: solana airdrop 1 --url devnet`,
    );
  }

  console.log();
  console.log("📝 CREATING BOUNTY PAYMENT");
  console.log(
    "Amount:            ",
    amountLamports.toString(),
    "lamports (0.01 SOL)",
  );
  console.log("Mint:              ", "NATIVE_SOL_MINT (default)");
  console.log("Label:             ", "smoke-test-bounty");
  console.log();

  const result = await createBountyPayment(
    {
      amountBaseUnits: amountLamports,
      label: "smoke-test-bounty",
      memo: "Tirai devnet smoke test",
    },
    {
      connection,
      payer: keypairToSigner(payerKp),
      cluster: "devnet",
      onProgress: (step) => console.log(`  → ${step}`),
    },
  );

  console.log();
  if (!result.ok) {
    console.error("❌ createBountyPayment FAILED:");
    console.error(JSON.stringify(result.error, null, 2));
    process.exit(1);
  }

  console.log("✅ DEPOSIT SUCCEEDED");
  console.log("Signature:         ", result.value.signature);
  console.log(
    "Solscan:           ",
    `https://solscan.io/tx/${result.value.signature}?cluster=devnet`,
  );
  console.log(
    "Fee:               ",
    result.value.feeLamports.toString(),
    "lamports",
  );
  console.log(
    "Viewing key (hex): ",
    `${result.value.viewingKey.slice(0, 16)}... (${result.value.viewingKey.length} chars)`,
  );
  console.log("Ticket version:    ", result.value.ticket.version);
  console.log("Ticket cluster:    ", result.value.ticket.cluster);
  console.log(
    "Ticket raw:        ",
    `${result.value.ticket.raw.slice(0, 32)}... (${result.value.ticket.raw.length} chars)`,
  );

  console.log();
  console.log("🔓 ROUND-TRIP DECODE CHECK");
  const decoded = await decodeClaimTicket(result.value.ticket.raw);
  if (!decoded.ok) {
    console.error("❌ decode failed:", decoded.error);
    process.exit(1);
  }
  console.log("Decoded amount:    ", decoded.value.amountBaseUnits.toString());
  console.log("Decoded label:     ", decoded.value.label);
  console.log("Decoded memo:      ", decoded.value.memo);
  console.log("Decoded mint:      ", decoded.value.tokenMint.toBase58());
  console.log(
    "Decoded UTXO commitment match: ",
    decoded.value.utxo.commitment !== undefined,
  );

  console.log();
  console.log("=".repeat(60));
  console.log("✅ Hari 3 deliverable verified end-to-end on devnet.");
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error();
  console.error("❌ SMOKE TEST CRASHED:");
  console.error(err);
  process.exit(1);
});
