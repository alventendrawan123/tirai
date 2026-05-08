// Quick smoke test — verify Supabase connection works.
// Run: pnpm -F @tirai/indexer test:connection
//
// What this checks:
// - Can we reach the project URL?
// - Does anon key allow SELECT on chain_notes / indexer_cursor?
// - Does service key allow INSERT (only run if SUPABASE_SERVICE_KEY set)?

import { createSupabaseClient } from "./db";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY ?? "";

async function main(): Promise<void> {
  if (!SUPABASE_URL) throw new Error("SUPABASE_URL required");

  console.log("=".repeat(60));
  console.log("Supabase connection smoke test");
  console.log("=".repeat(60));
  console.log(`URL:           ${SUPABASE_URL}`);
  console.log();

  // Test 1: anon key can SELECT
  if (SUPABASE_ANON_KEY) {
    console.log("📖 Test 1: anon key SELECT chain_notes");
    const anonClient = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await anonClient
      .from("chain_notes")
      .select("signature, slot, block_time, tx_type, public_amount")
      .limit(5);
    if (error) {
      console.error("   ❌ FAIL:", error.message);
    } else {
      console.log(`   ✅ OK — ${data?.length ?? 0} rows visible`);
    }

    console.log("📖 Test 2: anon key SELECT indexer_cursor");
    const cursor = await anonClient.from("indexer_cursor").select("*").single();
    if (cursor.error) {
      console.error("   ❌ FAIL:", cursor.error.message);
    } else {
      console.log(`   ✅ OK — cursor row found`);
      console.log(
        `      last_signature: ${cursor.data?.last_signature ?? "(null)"}`,
      );
      console.log(
        `      last_slot:      ${cursor.data?.last_slot ?? "(null)"}`,
      );
    }
  } else {
    console.log("⚠️  SUPABASE_ANON_KEY not set — skipping anon tests");
  }

  console.log();

  // Test 3: anon key CANNOT INSERT (RLS check)
  if (SUPABASE_ANON_KEY) {
    console.log("🔒 Test 3: anon key INSERT should be REJECTED");
    const anonClient = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { error } = await anonClient.from("chain_notes").insert({
      signature: "test_should_fail",
      slot: 0,
      block_time: new Date().toISOString(),
      tx_type: 0,
      public_amount: "0",
      net_amount: "0",
      fee: "0",
    });
    if (error) {
      console.log(`   ✅ OK — insert rejected (${error.message})`);
    } else {
      console.error("   ❌ FAIL: insert succeeded — RLS misconfigured!");
    }
  }

  console.log();

  // Test 4: service key CAN INSERT + DELETE
  if (SUPABASE_SERVICE_KEY) {
    console.log("✏️  Test 4: service key INSERT + DELETE");
    const adminClient = createSupabaseClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_KEY,
    );
    const testSig = `test_smoke_${Date.now()}`;
    const { error: insertErr } = await adminClient.from("chain_notes").insert({
      signature: testSig,
      slot: 0,
      block_time: new Date().toISOString(),
      tx_type: 0,
      public_amount: "0",
      net_amount: "0",
      fee: "0",
    });
    if (insertErr) {
      console.error("   ❌ INSERT FAIL:", insertErr.message);
    } else {
      console.log("   ✅ INSERT OK");
      const { error: delErr } = await adminClient
        .from("chain_notes")
        .delete()
        .eq("signature", testSig);
      if (delErr) {
        console.error("   ⚠️  cleanup DELETE failed:", delErr.message);
      } else {
        console.log("   ✅ DELETE OK (cleanup)");
      }
    }
  } else {
    console.log("⚠️  SUPABASE_SERVICE_KEY not set — skipping service tests");
  }

  console.log();
  console.log("=".repeat(60));
  console.log("✅ Smoke test done");
  console.log("=".repeat(60));
}

main().catch((error) => {
  console.error("❌ Smoke test crashed:", error);
  process.exit(1);
});
