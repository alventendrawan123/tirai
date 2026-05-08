// E2E smoke test for bounty management feature.
// Run: pnpm -F @tirai/api test:bounty-flow
//
// Required env vars:
//   KEYPAIR_PATH       — path to test wallet (owner)
//   SUPABASE_URL       — https://xxx.supabase.co
//   SUPABASE_ANON_KEY  — sb_publishable_xxx
//   AUTH_VERIFIER_URL  — https://tirai-production.up.railway.app
//
// Flow:
//   1. Auth flow for owner (load devnet wallet, sign challenge, get JWT)
//   2. createBounty
//   3. listBounties → verify our bounty in list
//   4. getBountyById → verify shape
//   5. Auth flow for applicant (fresh keypair, sign, get JWT)
//   6. applyToBounty
//   7. listApplications → verify our application
//   8. updateApplicationStatus("accepted") with owner JWT
//   9. updateBountyStatus("paid", fakeSig) with owner JWT
//   10. Final getBountyById → verify status="paid"

import { readFileSync } from "node:fs";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";
import {
  applyToBounty,
  createBounty,
  getBountyById,
  listApplications,
  listBounties,
  requestAuthChallenge,
  updateApplicationStatus,
  updateBountyStatus,
  verifyAuthChallenge,
} from "../src/index";

const KEYPAIR_PATH = process.env.KEYPAIR_PATH;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const AUTH_VERIFIER_URL = process.env.AUTH_VERIFIER_URL;

function require_(name: string, value: string | undefined): string {
  if (!value) {
    console.error(`❌ Missing env var: ${name}`);
    process.exit(1);
  }
  return value;
}

async function signInWith(
  keypair: Keypair,
  authVerifierUrl: string,
): Promise<{ jwt: string; walletPubkey: string }> {
  const challengeResult = await requestAuthChallenge({ authVerifierUrl });
  if (!challengeResult.ok) {
    throw new Error(`requestAuthChallenge failed: ${JSON.stringify(challengeResult.error)}`);
  }
  const { challenge } = challengeResult.value;

  const messageBytes = new TextEncoder().encode(challenge);
  const signedBytes = nacl.sign.detached(messageBytes, keypair.secretKey);
  const signatureBase58 = bs58.encode(signedBytes);

  const verifyResult = await verifyAuthChallenge(
    {
      walletPubkey: keypair.publicKey.toBase58(),
      signature: signatureBase58,
      challenge,
    },
    { authVerifierUrl },
  );
  if (!verifyResult.ok) {
    throw new Error(`verifyAuthChallenge failed: ${JSON.stringify(verifyResult.error)}`);
  }
  return {
    jwt: verifyResult.value.jwt,
    walletPubkey: verifyResult.value.walletPubkey,
  };
}

async function main(): Promise<void> {
  const keypairPath = require_("KEYPAIR_PATH", KEYPAIR_PATH);
  const supabaseUrl = require_("SUPABASE_URL", SUPABASE_URL);
  const supabaseAnonKey = require_("SUPABASE_ANON_KEY", SUPABASE_ANON_KEY);
  const authVerifierUrl = require_("AUTH_VERIFIER_URL", AUTH_VERIFIER_URL);

  console.log("=".repeat(60));
  console.log("TIRAI — bounty management e2e smoke test");
  console.log("=".repeat(60));
  console.log();
  console.log("Supabase URL:    ", supabaseUrl);
  console.log("Auth verifier:   ", authVerifierUrl);
  console.log();

  const ownerKp = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(readFileSync(keypairPath, "utf8"))),
  );
  const applicantKp = Keypair.generate();

  console.log("Owner pubkey:     ", ownerKp.publicKey.toBase58());
  console.log("Applicant pubkey: ", applicantKp.publicKey.toBase58(), "(fresh keypair)");
  console.log();

  // ====================================================================
  // 1. Owner sign-in
  // ====================================================================
  console.log("🔐 STEP 1: Owner sign-in (challenge → sign → JWT)");
  const ownerSession = await signInWith(ownerKp, authVerifierUrl);
  console.log(`   ✅ Owner JWT obtained (length ${ownerSession.jwt.length})`);
  console.log();

  const readCtx = { supabaseUrl, supabaseAnonKey };
  const ownerCtx = { supabaseUrl, jwt: ownerSession.jwt };

  // ====================================================================
  // 2. Create bounty
  // ====================================================================
  console.log("📝 STEP 2: createBounty");
  const createResult = await createBounty(
    {
      title: `Smoke test bounty ${Date.now()}`,
      description: "E2E smoke test — auto-created by test:bounty-flow.",
      rewardLamports: 10_000_000n, // 0.01 SOL
      deadline: Date.now() + 7 * 24 * 60 * 60 * 1000,
      eligibility: "Smoke test only",
    },
    ownerCtx,
  );
  if (!createResult.ok) {
    console.error("   ❌ createBounty FAILED:", createResult.error);
    process.exit(1);
  }
  const bounty = createResult.value;
  console.log("   ✅ Bounty created");
  console.log(`      id:           ${bounty.id}`);
  console.log(`      title:        ${bounty.title}`);
  console.log(`      reward:       ${bounty.rewardLamports} lamports`);
  console.log(`      ownerWallet:  ${bounty.ownerWallet}`);
  console.log(`      status:       ${bounty.status}`);
  console.log();

  // ====================================================================
  // 3. List bounties
  // ====================================================================
  console.log("🔍 STEP 3: listBounties (filter: status=open)");
  const listResult = await listBounties({ status: "open", limit: 50 }, readCtx);
  if (!listResult.ok) {
    console.error("   ❌ listBounties FAILED:", listResult.error);
    process.exit(1);
  }
  const found = listResult.value.find((b) => b.id === bounty.id);
  if (!found) {
    console.error("   ❌ Bounty not found in listBounties result");
    process.exit(1);
  }
  console.log(`   ✅ Listed ${listResult.value.length} bounties — ours found at top`);
  console.log();

  // ====================================================================
  // 4. Get bounty by ID
  // ====================================================================
  console.log("🔍 STEP 4: getBountyById");
  const getResult = await getBountyById(bounty.id, readCtx);
  if (!getResult.ok || getResult.value === null) {
    console.error("   ❌ getBountyById FAILED:", getResult);
    process.exit(1);
  }
  console.log(`   ✅ Got bounty — title matches: ${getResult.value.title === bounty.title}`);
  console.log();

  // ====================================================================
  // 5. Applicant sign-in
  // ====================================================================
  console.log("🔐 STEP 5: Applicant sign-in (fresh wallet)");
  const applicantSession = await signInWith(applicantKp, authVerifierUrl);
  console.log(`   ✅ Applicant JWT obtained (sub matches: ${applicantSession.walletPubkey === applicantKp.publicKey.toBase58()})`);
  console.log();

  const applicantCtx = { supabaseUrl, jwt: applicantSession.jwt };

  // ====================================================================
  // 6. Apply to bounty
  // ====================================================================
  console.log("📤 STEP 6: applyToBounty");
  const applyResult = await applyToBounty(
    {
      bountyId: bounty.id,
      submissionText: "Smoke test application — auto-generated.",
      contactHandle: "@smoketest",
    },
    applicantCtx,
  );
  if (!applyResult.ok) {
    console.error("   ❌ applyToBounty FAILED:", applyResult.error);
    process.exit(1);
  }
  const application = applyResult.value;
  console.log(`   ✅ Application created`);
  console.log(`      id:               ${application.id}`);
  console.log(`      applicantWallet:  ${application.applicantWallet}`);
  console.log(`      status:           ${application.status}`);
  console.log();

  // ====================================================================
  // 7. List applications
  // ====================================================================
  console.log("🔍 STEP 7: listApplications");
  const appsResult = await listApplications(bounty.id, readCtx);
  if (!appsResult.ok) {
    console.error("   ❌ listApplications FAILED:", appsResult.error);
    process.exit(1);
  }
  const foundApp = appsResult.value.find((a) => a.id === application.id);
  if (!foundApp) {
    console.error("   ❌ Application not found in listApplications result");
    process.exit(1);
  }
  console.log(`   ✅ Listed ${appsResult.value.length} applications — ours found`);
  console.log();

  // ====================================================================
  // 8. Owner accept application
  // ====================================================================
  console.log("✅ STEP 8: updateApplicationStatus to 'accepted' (owner JWT)");
  const acceptResult = await updateApplicationStatus(
    application.id,
    "accepted",
    ownerCtx,
  );
  if (!acceptResult.ok) {
    console.error("   ❌ updateApplicationStatus FAILED:", acceptResult.error);
    process.exit(1);
  }
  console.log(`   ✅ Application status now: ${acceptResult.value.status}`);
  console.log();

  // ====================================================================
  // 9. Owner mark bounty as paid (with fake sig)
  // ====================================================================
  console.log("💰 STEP 9: updateBountyStatus to 'paid' (owner JWT, fake sig)");
  const fakeSignature = "FAKE_SIG_SMOKE_TEST_" + Date.now();
  const payResult = await updateBountyStatus(
    bounty.id,
    "paid",
    fakeSignature,
    ownerCtx,
  );
  if (!payResult.ok) {
    console.error("   ❌ updateBountyStatus FAILED:", payResult.error);
    process.exit(1);
  }
  console.log(`   ✅ Bounty status now: ${payResult.value.status}`);
  console.log(`      payment_signature: ${payResult.value.paymentSignature}`);
  console.log();

  // ====================================================================
  // 10. Final verify
  // ====================================================================
  console.log("🔍 STEP 10: Final getBountyById to verify state");
  const finalResult = await getBountyById(bounty.id, readCtx);
  if (!finalResult.ok || finalResult.value === null) {
    console.error("   ❌ Final getBountyById FAILED");
    process.exit(1);
  }
  if (finalResult.value.status !== "paid") {
    console.error(`   ❌ Status mismatch: expected 'paid', got '${finalResult.value.status}'`);
    process.exit(1);
  }
  console.log(`   ✅ Final state: status=${finalResult.value.status}, paymentSignature=${finalResult.value.paymentSignature}`);
  console.log();

  // ====================================================================
  // RLS check: applicant cannot update other people's bounty
  // ====================================================================
  console.log("🔒 STEP 11: RLS check — applicant CANNOT update bounty (should fail)");
  const sneakyResult = await updateBountyStatus(
    bounty.id,
    "cancelled",
    undefined,
    applicantCtx,
  );
  if (sneakyResult.ok) {
    console.error("   ❌ RLS BREACH: applicant successfully updated bounty owned by someone else!");
    process.exit(1);
  }
  console.log(`   ✅ RLS rejected applicant update (error: ${sneakyResult.error.kind})`);
  console.log();

  // ====================================================================
  // Done
  // ====================================================================
  console.log("=".repeat(60));
  console.log("✅ ALL 11 STEPS PASSED — bounty management e2e verified");
  console.log("=".repeat(60));
  console.log();
  console.log(`Test bounty id:       ${bounty.id}`);
  console.log(`Test application id:  ${application.id}`);
  console.log("(Test data left in Supabase — cleanup manually via SQL if needed.)");
}

main().catch((error) => {
  console.error();
  console.error("❌ SMOKE TEST CRASHED:");
  console.error(error);
  process.exit(1);
});
