import { CLOAK_PROGRAM_ID } from "@cloak.dev/sdk-devnet";
import { Connection, PublicKey } from "@solana/web3.js";
import { createSupabaseClient } from "./db";
import { startPollLoop } from "./poller";

const DEFAULT_PROGRAM_ID = "Zc1kHfp4rajSMeASFDwFFgkHRjv7dFQuLheJoQus27h"; // devnet
const DEFAULT_POLL_INTERVAL_MS = 30_000;
const DEFAULT_BATCH_SIZE = 10;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

async function main(): Promise<void> {
  const supabaseUrl = requireEnv("SUPABASE_URL");
  const supabaseServiceKey = requireEnv("SUPABASE_SERVICE_KEY");
  const rpcUrl = requireEnv("SOLANA_RPC_URL");

  const programIdStr = process.env.CLOAK_PROGRAM_ID ?? DEFAULT_PROGRAM_ID;
  const pollIntervalMs = Number.parseInt(
    process.env.POLL_INTERVAL_MS ?? `${DEFAULT_POLL_INTERVAL_MS}`,
    10,
  );
  const batchSize = Number.parseInt(
    process.env.BATCH_SIZE ?? `${DEFAULT_BATCH_SIZE}`,
    10,
  );

  const programId = new PublicKey(programIdStr);
  const connection = new Connection(rpcUrl, "confirmed");
  const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey);

  console.log("=".repeat(60));
  console.log("TIRAI INDEXER — starting");
  console.log("=".repeat(60));
  console.log(`RPC:         ${rpcUrl.replace(/api-key=[^&]+/, "api-key=***")}`);
  console.log(`Program ID:  ${programIdStr}`);
  console.log(`Supabase:    ${supabaseUrl}`);
  console.log(`Interval:    ${pollIntervalMs}ms`);
  console.log(`Batch size:  ${batchSize}`);
  console.log(`SDK default: ${CLOAK_PROGRAM_ID.toBase58()}`);
  console.log();

  await startPollLoop({
    connection,
    programId,
    supabase,
    pollIntervalMs,
    batchSize,
  });
}

main().catch((error) => {
  console.error("[indexer] fatal:", error);
  process.exit(1);
});
