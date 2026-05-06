import {
  CLOAK_PROGRAM_ID,
  calculateFeeBigint,
  DEVNET_MOCK_USDC_MINT,
  FIXED_FEE_LAMPORTS,
  generateUtxoKeypair,
  getDistributableAmount,
  getNkFromUtxoPrivateKey,
  isWithdrawAmountSufficient,
  MIN_DEPOSIT_LAMPORTS,
  NATIVE_SOL_MINT,
} from "@cloak.dev/sdk-devnet";
import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";

async function main() {
  console.log("=".repeat(60));
  console.log("TIRAI — Cloak SDK Smoke Test");
  console.log("=".repeat(60));
  console.log();

  // ========================================
  // 1. Constants — verify SDK exports
  // ========================================
  console.log("📦 SDK CONSTANTS");
  console.log("Program ID (devnet):", CLOAK_PROGRAM_ID.toBase58());
  console.log("Native SOL mint:    ", NATIVE_SOL_MINT.toBase58());
  console.log("Mock USDC mint:     ", DEVNET_MOCK_USDC_MINT.toBase58());
  console.log("Fixed fee:          ", FIXED_FEE_LAMPORTS, "lamports");
  console.log("Min deposit:        ", MIN_DEPOSIT_LAMPORTS, "lamports");
  console.log();

  // ========================================
  // 2. UTXO keypair generation
  // NOTE: privateKey and publicKey are bigint (Poseidon field elements),
  // not Uint8Array. Display as hex string.
  // ========================================
  console.log("🔑 UTXO KEYPAIR GENERATION");
  const utxoKp = await generateUtxoKeypair();
  const pkHex = utxoKp.privateKey.toString(16).padStart(64, "0");
  const pubkHex = utxoKp.publicKey.toString(16).padStart(64, "0");
  console.log("UTXO private key (bigint, 252-bit field element)");
  console.log("  hex:              ", `${pkHex.slice(0, 16)}...`);
  console.log("UTXO public key    (Poseidon(privateKey, 0))");
  console.log("  hex:              ", `${pubkHex.slice(0, 16)}...`);
  console.log();

  // ========================================
  // 3. Viewing key derivation
  // getNkFromUtxoPrivateKey takes bigint, returns Uint8Array (32 bytes)
  // ========================================
  console.log("👁️  VIEWING KEY DERIVATION");
  const nk = getNkFromUtxoPrivateKey(utxoKp.privateKey);
  console.log("Viewing key (nk):   ", nk.length, "bytes");
  console.log(
    "nk (hex):           ",
    `${Buffer.from(nk).toString("hex").slice(0, 16)}...`,
  );
  console.log();

  // ========================================
  // 4. Fee helpers
  // NOTE: SDK exports calculateFeeBigint(bigint): bigint
  //       and getDistributableAmount(number): number
  //       (not calculateSolFeeLamports / calculateSolNetAmountLamports)
  // ========================================
  console.log("💰 FEE CALCULATION");
  const bountyAmount = BigInt(0.05 * LAMPORTS_PER_SOL); // 0.05 SOL test amount
  const fee = calculateFeeBigint(bountyAmount);
  const net = BigInt(getDistributableAmount(Number(bountyAmount)));
  const sufficient = isWithdrawAmountSufficient(bountyAmount);

  console.log(
    `Gross amount:        ${bountyAmount} lamports (${Number(bountyAmount) / LAMPORTS_PER_SOL} SOL)`,
  );
  console.log(
    `Fee:                 ${fee} lamports (${Number(fee) / LAMPORTS_PER_SOL} SOL)`,
  );
  console.log(
    `Net to recipient:    ${net} lamports (${Number(net) / LAMPORTS_PER_SOL} SOL)`,
  );
  console.log(`Sufficient amount?:  ${sufficient}`);
  console.log();

  // ========================================
  // 5. Solana RPC connection
  // ========================================
  console.log("🌐 SOLANA DEVNET CONNECTION");
  const connection = new Connection(
    "https://api.devnet.solana.com",
    "confirmed",
  );
  const slot = await connection.getSlot();
  const blockhash = await connection.getLatestBlockhash();
  console.log("Current slot:       ", slot);
  console.log("Latest blockhash:   ", `${blockhash.blockhash.slice(0, 16)}...`);
  console.log();

  // ========================================
  // 6. Generate test wallet (untuk testing nanti)
  // ========================================
  console.log("👛 TEST WALLET GENERATION");
  const testWallet = Keypair.generate();
  console.log("Test wallet pubkey: ", testWallet.publicKey.toBase58());
  console.log("(Untuk fund pakai: solana airdrop 2 --url devnet)");
  console.log();

  console.log("=".repeat(60));
  console.log("✅ SEMUA SMOKE TEST PASS — SDK ready untuk development");
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error();
  console.error("❌ SMOKE TEST FAILED:");
  console.error(err);
  process.exit(1);
});
