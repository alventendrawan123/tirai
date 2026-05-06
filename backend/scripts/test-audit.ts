import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { exportAuditReport } from "../src/audit/export-audit-report";
import { scanAuditHistory } from "../src/audit/scan-audit-history";
import { createBountyPayment } from "../src/bounty/create-bounty-payment";
import { keypairToSigner } from "../src/lib/keypair-signer";

async function main() {
  const rpcUrl = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
  const keypairPath = process.env.KEYPAIR_PATH;
  const skipDeposit = process.env.SKIP_DEPOSIT === "1";
  const externalVk = process.env.VIEWING_KEY;
  const outDir = process.env.OUT_DIR ?? "tmp/audit";
  const scanLimit = Number.parseInt(process.env.SCAN_LIMIT ?? "200", 10);
  const batchSize = Number.parseInt(process.env.SCAN_BATCH ?? "3", 10);
  const logFullVk = process.env.LOG_FULL_VK === "1";

  if (!keypairPath) {
    throw new Error(
      "Set KEYPAIR_PATH env var to a funded devnet wallet (e.g. test-wallets/devnet.json)",
    );
  }

  console.log("=".repeat(60));
  console.log("TIRAI — scan + export audit devnet smoke test");
  console.log("=".repeat(60));
  console.log();
  console.log("RPC:               ", rpcUrl);
  console.log("Skip deposit:      ", skipDeposit);
  console.log("Scan limit:        ", scanLimit);
  console.log("Batch size:        ", batchSize);
  console.log("Out dir:           ", outDir);
  console.log();

  const connection = new Connection(rpcUrl, "confirmed");
  const payerKp = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(readFileSync(keypairPath, "utf8"))),
  );
  console.log("Payer pubkey:      ", payerKp.publicKey.toBase58());
  const balance = await connection.getBalance(payerKp.publicKey);
  console.log("Payer balance:     ", balance / LAMPORTS_PER_SOL, "SOL");
  console.log();

  let viewingKey: string;
  if (skipDeposit) {
    if (!externalVk) {
      throw new Error(
        "SKIP_DEPOSIT=1 requires VIEWING_KEY env var (64 hex chars from prior deposit).",
      );
    }
    viewingKey = externalVk;
    console.log("Using existing viewing key:", `${viewingKey.slice(0, 16)}...`);
    console.log();
  } else {
    const amountLamports = BigInt(Math.floor(0.01 * LAMPORTS_PER_SOL));
    if (BigInt(balance) < amountLamports + 5_500_000n) {
      throw new Error(
        `Insufficient balance. Need ≥${(Number(amountLamports) + 5_500_000) / LAMPORTS_PER_SOL} SOL.`,
      );
    }
    console.log(
      "📝 STEP 1: createBountyPayment (so we have something to scan)",
    );
    console.log();
    const payResult = await createBountyPayment(
      {
        amountBaseUnits: amountLamports,
        label: "audit-smoke",
        memo: "Hari 5 audit test",
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
    viewingKey = payResult.value.viewingKey;
    console.log();
    console.log("✅ Bounty deposited.");
    console.log("Tx (deposit):      ", payResult.value.signature);
    if (logFullVk) {
      console.log("Viewing key (FULL):", viewingKey);
      console.log(
        "  ↑ to retry without depositing again, run with:",
        `SKIP_DEPOSIT=1 VIEWING_KEY=${viewingKey}`,
      );
    } else {
      console.log(
        "Viewing key:       ",
        `${viewingKey.slice(0, 16)}... (64 chars, full hidden — set LOG_FULL_VK=1 to dump for SKIP_DEPOSIT reuse)`,
      );
    }
    console.log();
  }

  console.log("🔍 STEP 2: scanAuditHistory");
  console.log();
  const scanResult = await scanAuditHistory(
    { viewingKey },
    { connection, cluster: "devnet", limit: scanLimit, batchSize },
  );
  if (!scanResult.ok) {
    console.error("❌ scanAuditHistory FAILED:", scanResult.error);
    process.exit(1);
  }

  const { entries, summary } = scanResult.value;
  console.log("Total payments:    ", summary.totalPayments);
  console.log(
    "Total volume:      ",
    summary.totalVolumeLamports.toString(),
    "lamports",
  );
  console.log(
    "Latest activity:   ",
    summary.latestActivityAt === null
      ? "—"
      : new Date(summary.latestActivityAt).toISOString(),
  );
  console.log();
  console.log(`Entries (${entries.length}):`);
  for (const entry of entries.slice(0, 5)) {
    console.log(
      `  ${new Date(entry.timestamp).toISOString()}  ${entry.status.padEnd(9)}  ${entry.amountLamports
        .toString()
        .padStart(12)}  ${entry.signature.slice(0, 12)}...`,
    );
  }
  if (entries.length > 5) console.log(`  ... and ${entries.length - 5} more`);

  // Privacy check: AuditEntry shape has no recipient field
  for (const entry of entries) {
    if ("recipient" in (entry as unknown as Record<string, unknown>)) {
      console.error(
        "❌ PRIVACY VIOLATION: AuditEntry contains 'recipient' field!",
      );
      process.exit(1);
    }
  }
  console.log();
  console.log("✅ Privacy invariant: no 'recipient' field in any entry.");

  console.log();
  console.log("📦 STEP 3: exportAuditReport (CSV + PDF)");
  console.log();

  const csvResult = await exportAuditReport(scanResult.value, "csv");
  if (!csvResult.ok) {
    console.error("❌ exportAuditReport CSV failed:", csvResult.error);
    process.exit(1);
  }
  const csvText = await csvResult.value.text();
  const csvPath = `${outDir}/audit.csv`;
  mkdirSync(dirname(csvPath), { recursive: true });
  writeFileSync(csvPath, csvText);
  console.log(
    "CSV written:       ",
    csvPath,
    `(${csvResult.value.size} bytes)`,
  );
  console.log("CSV header line:   ", csvText.split("\n")[0]);

  const pdfResult = await exportAuditReport(scanResult.value, "pdf");
  if (!pdfResult.ok) {
    console.error("❌ exportAuditReport PDF failed:", pdfResult.error);
    process.exit(1);
  }
  const pdfBytes = new Uint8Array(await pdfResult.value.arrayBuffer());
  const pdfPath = `${outDir}/audit.pdf`;
  writeFileSync(pdfPath, pdfBytes);
  console.log(
    "PDF written:       ",
    pdfPath,
    `(${pdfResult.value.size} bytes)`,
  );
  const pdfHeader = new TextDecoder().decode(pdfBytes.slice(0, 8));
  console.log("PDF magic:         ", JSON.stringify(pdfHeader));

  console.log();
  console.log("=".repeat(60));
  console.log("✅ Hari 5 deliverable verified end-to-end on devnet.");
  console.log("=".repeat(60));
}

main().catch((error) => {
  console.error();
  console.error("❌ SMOKE TEST CRASHED:");
  console.error(error);
  process.exit(1);
});
