import { readFileSync } from "node:fs";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import { createBountyPayment } from "../src/bounty/create-bounty-payment";
import { claimBounty } from "../src/claim/claim-bounty";
import { inspectClaimTicket } from "../src/claim/inspect-claim-ticket";
import { keypairToSigner } from "../src/lib/keypair-signer";

async function main() {
  const rpcUrl = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
  const keypairPath = process.env.KEYPAIR_PATH;
  const mode = (process.env.CLAIM_MODE ?? "fresh") as "fresh" | "existing";

  if (!keypairPath) {
    throw new Error(
      "Set KEYPAIR_PATH env var to a funded devnet wallet (e.g. test-wallets/devnet.json)",
    );
  }
  if (mode !== "fresh" && mode !== "existing") {
    throw new Error("CLAIM_MODE must be 'fresh' or 'existing'");
  }

  console.log("=".repeat(60));
  console.log("TIRAI — inspect + claim devnet smoke test");
  console.log("=".repeat(60));
  console.log();
  console.log("RPC:               ", rpcUrl);
  console.log("Mode:              ", mode);
  console.log();

  const connection = new Connection(rpcUrl, "confirmed");
  const payerKp = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(readFileSync(keypairPath, "utf8"))),
  );
  const balance = await connection.getBalance(payerKp.publicKey);
  console.log("Payer pubkey:      ", payerKp.publicKey.toBase58());
  console.log("Payer balance:     ", balance / LAMPORTS_PER_SOL, "SOL");

  const amountLamports = BigInt(Math.floor(0.01 * LAMPORTS_PER_SOL));
  if (BigInt(balance) < amountLamports + 5_500_000n) {
    throw new Error(
      `Insufficient balance. Need at least ${(Number(amountLamports) + 5_500_000) / LAMPORTS_PER_SOL} SOL on payer wallet.`,
    );
  }

  console.log();
  console.log("📝 STEP 1: createBountyPayment");
  console.log();
  const payResult = await createBountyPayment(
    {
      amountBaseUnits: amountLamports,
      label: "claim-smoke",
      memo: "Hari 4 e2e test",
    },
    {
      connection,
      payer: keypairToSigner(payerKp),
      cluster: "devnet",
      onProgress: (step) => console.log(`  pay → ${step}`),
    },
  );

  if (!payResult.ok) {
    console.error("❌ createBountyPayment FAILED:", payResult.error);
    process.exit(1);
  }

  const ticketRaw = payResult.value.ticket.raw;
  console.log();
  console.log("✅ Bounty deposited.");
  console.log("Tx (deposit):      ", payResult.value.signature);
  console.log(
    "Solscan:           ",
    `https://solscan.io/tx/${payResult.value.signature}?cluster=devnet`,
  );

  console.log();
  console.log(
    "🔍 STEP 2: inspectClaimTicket (before claim — expect claimable)",
  );
  console.log();
  const inspectBefore = await inspectClaimTicket(ticketRaw, {
    connection,
    cluster: "devnet",
  });
  if (!inspectBefore.ok) {
    console.error("❌ inspectClaimTicket FAILED:", inspectBefore.error);
    process.exit(1);
  }
  console.log("amountLamports:    ", inspectBefore.value.amountLamports);
  console.log("tokenMint:         ", inspectBefore.value.tokenMint);
  console.log("label:             ", inspectBefore.value.label);
  console.log("isClaimable:       ", inspectBefore.value.isClaimable);
  if (!inspectBefore.value.isClaimable) {
    console.error(
      "❌ ticket reported NOT claimable right after deposit — unexpected.",
    );
    process.exit(1);
  }

  console.log();
  console.log("💸 STEP 3: claimBounty");
  console.log();

  let claimResult: Awaited<ReturnType<typeof claimBounty>>;
  if (mode === "fresh") {
    claimResult = await claimBounty(
      { ticket: ticketRaw, mode: { kind: "fresh" } },
      {
        connection,
        cluster: "devnet",
        onProgress: (step) => console.log(`  claim → ${step}`),
      },
    );
  } else {
    claimResult = await claimBounty(
      {
        ticket: ticketRaw,
        mode: { kind: "existing", signer: keypairToSigner(payerKp) },
      },
      {
        connection,
        cluster: "devnet",
        onProgress: (step) => console.log(`  claim → ${step}`),
      },
    );
  }

  if (!claimResult.ok) {
    console.error("❌ claimBounty FAILED:", claimResult.error);
    process.exit(1);
  }

  console.log();
  console.log("✅ Claim succeeded.");
  console.log("Mode:              ", claimResult.value.mode);
  console.log("Destination:       ", claimResult.value.destination);
  console.log("Tx (withdraw):     ", claimResult.value.signature);
  console.log(
    "Solscan:           ",
    `https://solscan.io/tx/${claimResult.value.signature}?cluster=devnet`,
  );
  if (claimResult.value.mode === "fresh") {
    console.log(
      "Fresh secretKey:   ",
      `<Uint8Array len=${claimResult.value.secretKey.length}> (NOT logged)`,
    );
    claimResult.value.secretKey.fill(0);
  }

  const destBalance = await connection.getBalance(
    new PublicKey(claimResult.value.destination),
    "confirmed",
  );
  console.log(
    "Destination bal:   ",
    destBalance / LAMPORTS_PER_SOL,
    "SOL",
    `(${destBalance} lamports)`,
  );

  console.log();
  console.log(
    "🔍 STEP 4: inspectClaimTicket (after claim — expect NOT claimable)",
  );
  console.log();
  const inspectAfter = await inspectClaimTicket(ticketRaw, {
    connection,
    cluster: "devnet",
  });
  if (!inspectAfter.ok) {
    console.error(
      "❌ inspectClaimTicket FAILED post-claim:",
      inspectAfter.error,
    );
    process.exit(1);
  }
  console.log("isClaimable:       ", inspectAfter.value.isClaimable);
  if (inspectAfter.value.isClaimable) {
    console.error(
      "❌ ticket still reports claimable after claim — nullifier check broken.",
    );
    process.exit(1);
  }

  console.log();
  console.log("=".repeat(60));
  console.log("✅ Hari 4 deliverable verified end-to-end on devnet.");
  console.log("=".repeat(60));
}

main().catch((error) => {
  console.error();
  console.error("❌ SMOKE TEST CRASHED:");
  console.error(error);
  process.exit(1);
});
