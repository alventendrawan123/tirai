// HTTP server embedded in indexer process. Provides:
//   - Wallet auth: challenge + verify → session JWT (HS256, our own)
//   - Bounty CRUD: trusted writer for Supabase using service_role
//
// Why "trusted writer" pattern: modern Supabase migrated to asymmetric
// JWT signing keys (ECDSA), so HS256 JWTs we sign with the legacy
// secret are rejected by Supabase's RLS auth check ("No suitable key
// or wrong key type"). We bypass this by performing writes server-side
// via service_role and verifying caller identity here via session JWT.
//
// Endpoints:
//   POST   /auth/challenge          → { challenge, expiresAt }
//   POST   /auth/verify             → body { walletPubkey, signature, challenge }
//                                   → { jwt }
//   POST   /bounties                → create bounty (auth required)
//   PATCH  /bounties/:id            → update bounty status (owner only)
//   POST   /bounties/:id/applications → apply (auth required)
//   PATCH  /applications/:id        → update application status
//                                     (applicant for own; bounty owner for any)
//   GET    /health                  → liveness probe

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { PublicKey } from "@solana/web3.js";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import bs58 from "bs58";
import nacl from "tweetnacl";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const JWT_TTL_SECONDS = 60 * 60;

interface ChallengeRecord {
  expiresAt: number;
}
const challenges = new Map<string, ChallengeRecord>();

function gcChallenges(): void {
  const now = Date.now();
  for (const [k, v] of challenges) {
    if (v.expiresAt < now) challenges.delete(k);
  }
}

// ====================================================================
// JWT helpers (HS256)
// ====================================================================

function base64UrlEncode(input: string | Buffer): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (padded.length % 4)) % 4);
  return Buffer.from(padded + padding, "base64");
}

function signJwt(walletPubkey: string, secret: string): string {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64UrlEncode(
    JSON.stringify({
      sub: walletPubkey,
      role: "authenticated",
      iss: "tirai-indexer",
      iat: now,
      exp: now + JWT_TTL_SECONDS,
    }),
  );
  const signingInput = `${header}.${payload}`;
  const signature = base64UrlEncode(
    createHmac("sha256", secret).update(signingInput).digest(),
  );
  return `${signingInput}.${signature}`;
}

interface JwtPayload {
  sub: string;
  role: string;
  exp: number;
  iat: number;
}

function verifyJwt(jwt: string, secret: string): JwtPayload | null {
  const parts = jwt.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = parts;
  if (!headerB64 || !payloadB64 || !signatureB64) return null;

  const expected = base64UrlEncode(
    createHmac("sha256", secret).update(`${headerB64}.${payloadB64}`).digest(),
  );
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signatureB64);
  if (
    expectedBuf.length !== actualBuf.length ||
    !timingSafeEqual(expectedBuf, actualBuf)
  ) {
    return null;
  }

  let payload: JwtPayload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadB64).toString("utf-8"));
  } catch {
    return null;
  }

  if (typeof payload.sub !== "string" || payload.sub.length === 0) return null;
  if (typeof payload.exp !== "number") return null;
  if (Math.floor(Date.now() / 1000) >= payload.exp) return null;

  return payload;
}

function extractAuthJwt(req: IncomingMessage): string | null {
  const auth = req.headers.authorization;
  if (typeof auth !== "string") return null;
  const match = /^Bearer\s+(.+)$/i.exec(auth);
  return match?.[1] ?? null;
}

// ====================================================================
// Wallet signature verification
// ====================================================================

function verifyWalletSignature(
  walletPubkey: string,
  signature: string,
  challenge: string,
): boolean {
  try {
    const pubkey = new PublicKey(walletPubkey);
    const sigBytes = bs58.decode(signature);
    const msgBytes = new TextEncoder().encode(challenge);
    return nacl.sign.detached.verify(msgBytes, sigBytes, pubkey.toBytes());
  } catch {
    return false;
  }
}

// ====================================================================
// HTTP helpers
// ====================================================================

function readJsonBody<T>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        const text = Buffer.concat(chunks).toString("utf-8");
        resolve(JSON.parse(text) as T);
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function setCorsHeaders(res: ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  setCorsHeaders(res);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

// ====================================================================
// Auth handlers
// ====================================================================

async function handleChallenge(res: ServerResponse): Promise<void> {
  gcChallenges();
  const challenge = `tirai-auth-${randomBytes(16).toString("hex")}-${Date.now()}`;
  const expiresAt = Date.now() + CHALLENGE_TTL_MS;
  challenges.set(challenge, { expiresAt });
  sendJson(res, 200, { challenge, expiresAt });
}

interface VerifyBody {
  walletPubkey?: unknown;
  signature?: unknown;
  challenge?: unknown;
}

async function handleVerify(
  req: IncomingMessage,
  res: ServerResponse,
  jwtSecret: string,
): Promise<void> {
  let body: VerifyBody;
  try {
    body = await readJsonBody<VerifyBody>(req);
  } catch {
    sendJson(res, 400, { error: "invalid JSON body" });
    return;
  }

  const walletPubkey =
    typeof body.walletPubkey === "string" ? body.walletPubkey : null;
  const signature = typeof body.signature === "string" ? body.signature : null;
  const challenge = typeof body.challenge === "string" ? body.challenge : null;

  if (!walletPubkey || !signature || !challenge) {
    sendJson(res, 400, { error: "missing fields" });
    return;
  }

  const challengeRecord = challenges.get(challenge);
  if (!challengeRecord) {
    sendJson(res, 401, { error: "challenge unknown or expired" });
    return;
  }
  if (challengeRecord.expiresAt < Date.now()) {
    challenges.delete(challenge);
    sendJson(res, 401, { error: "challenge expired" });
    return;
  }

  if (!verifyWalletSignature(walletPubkey, signature, challenge)) {
    sendJson(res, 401, { error: "invalid signature" });
    return;
  }

  challenges.delete(challenge);
  const jwt = signJwt(walletPubkey, jwtSecret);
  sendJson(res, 200, { jwt });
}

// ====================================================================
// Bounty handlers (require auth)
// ====================================================================

interface CreateBountyBody {
  title?: unknown;
  description?: unknown;
  rewardLamports?: unknown;
  deadline?: unknown;
  eligibility?: unknown;
}

async function handleCreateBounty(
  req: IncomingMessage,
  res: ServerResponse,
  supabase: SupabaseClient,
  payload: JwtPayload,
): Promise<void> {
  let body: CreateBountyBody;
  try {
    body = await readJsonBody<CreateBountyBody>(req);
  } catch {
    sendJson(res, 400, { error: "invalid JSON body" });
    return;
  }

  if (
    typeof body.title !== "string" ||
    body.title.length === 0 ||
    body.title.length > 120
  ) {
    sendJson(res, 400, { error: "title must be 1-120 chars" });
    return;
  }
  if (
    typeof body.description !== "string" ||
    body.description.length === 0 ||
    body.description.length > 5000
  ) {
    sendJson(res, 400, { error: "description must be 1-5000 chars" });
    return;
  }
  if (
    typeof body.rewardLamports !== "string" &&
    typeof body.rewardLamports !== "number"
  ) {
    sendJson(res, 400, { error: "rewardLamports must be string or number" });
    return;
  }
  let rewardLamports: bigint;
  try {
    rewardLamports = BigInt(body.rewardLamports as string | number);
  } catch {
    sendJson(res, 400, { error: "rewardLamports invalid" });
    return;
  }
  if (rewardLamports <= 0n) {
    sendJson(res, 400, { error: "rewardLamports must be > 0" });
    return;
  }
  if (typeof body.deadline !== "number" || body.deadline <= Date.now()) {
    sendJson(res, 400, { error: "deadline must be future unix ms" });
    return;
  }

  const insert: Record<string, unknown> = {
    title: body.title,
    description: body.description,
    reward_lamports: rewardLamports.toString(),
    deadline: new Date(body.deadline).toISOString(),
    owner_wallet: payload.sub,
  };
  if (typeof body.eligibility === "string") {
    insert.eligibility = body.eligibility;
  }

  const { data, error } = await supabase
    .from("bounties")
    .insert(insert)
    .select("*")
    .single();

  if (error) {
    sendJson(res, 500, { error: error.message });
    return;
  }
  sendJson(res, 201, data);
}

interface UpdateBountyBody {
  status?: unknown;
  paymentSignature?: unknown;
}

async function handleUpdateBounty(
  req: IncomingMessage,
  res: ServerResponse,
  supabase: SupabaseClient,
  payload: JwtPayload,
  bountyId: string,
): Promise<void> {
  let body: UpdateBountyBody;
  try {
    body = await readJsonBody<UpdateBountyBody>(req);
  } catch {
    sendJson(res, 400, { error: "invalid JSON body" });
    return;
  }

  const status = body.status;
  if (
    typeof status !== "string" ||
    !["open", "paid", "expired", "cancelled"].includes(status)
  ) {
    sendJson(res, 400, { error: "invalid status" });
    return;
  }

  // Verify ownership
  const { data: existing, error: fetchErr } = await supabase
    .from("bounties")
    .select("owner_wallet")
    .eq("id", bountyId)
    .maybeSingle();
  if (fetchErr) {
    sendJson(res, 500, { error: fetchErr.message });
    return;
  }
  if (!existing) {
    sendJson(res, 404, { error: "bounty not found" });
    return;
  }
  if (existing.owner_wallet !== payload.sub) {
    sendJson(res, 403, { error: "not bounty owner" });
    return;
  }

  const update: Record<string, unknown> = { status };
  if (typeof body.paymentSignature === "string") {
    update.payment_signature = body.paymentSignature;
  }

  const { data, error } = await supabase
    .from("bounties")
    .update(update)
    .eq("id", bountyId)
    .select("*")
    .single();

  if (error) {
    sendJson(res, 500, { error: error.message });
    return;
  }
  sendJson(res, 200, data);
}

interface ApplyBody {
  submissionText?: unknown;
  contactHandle?: unknown;
}

async function handleApply(
  req: IncomingMessage,
  res: ServerResponse,
  supabase: SupabaseClient,
  payload: JwtPayload,
  bountyId: string,
): Promise<void> {
  let body: ApplyBody;
  try {
    body = await readJsonBody<ApplyBody>(req);
  } catch {
    sendJson(res, 400, { error: "invalid JSON body" });
    return;
  }

  if (
    typeof body.submissionText !== "string" ||
    body.submissionText.length === 0 ||
    body.submissionText.length > 5000
  ) {
    sendJson(res, 400, { error: "submissionText must be 1-5000 chars" });
    return;
  }

  const insert: Record<string, unknown> = {
    bounty_id: bountyId,
    applicant_wallet: payload.sub,
    submission_text: body.submissionText,
  };
  if (typeof body.contactHandle === "string") {
    insert.contact_handle = body.contactHandle;
  }

  const { data, error } = await supabase
    .from("applications")
    .insert(insert)
    .select("*")
    .single();

  if (error) {
    sendJson(res, 500, { error: error.message });
    return;
  }
  sendJson(res, 201, data);
}

interface UpdateApplicationBody {
  status?: unknown;
}

async function handleUpdateApplication(
  req: IncomingMessage,
  res: ServerResponse,
  supabase: SupabaseClient,
  payload: JwtPayload,
  applicationId: string,
): Promise<void> {
  let body: UpdateApplicationBody;
  try {
    body = await readJsonBody<UpdateApplicationBody>(req);
  } catch {
    sendJson(res, 400, { error: "invalid JSON body" });
    return;
  }

  const status = body.status;
  if (
    typeof status !== "string" ||
    !["pending", "accepted", "rejected"].includes(status)
  ) {
    sendJson(res, 400, { error: "invalid status" });
    return;
  }

  // Verify caller is either applicant OR bounty owner
  const { data: existing, error: fetchErr } = await supabase
    .from("applications")
    .select("applicant_wallet, bounty_id, bounties!inner(owner_wallet)")
    .eq("id", applicationId)
    .maybeSingle();
  if (fetchErr) {
    sendJson(res, 500, { error: fetchErr.message });
    return;
  }
  if (!existing) {
    sendJson(res, 404, { error: "application not found" });
    return;
  }

  const ownerWallet = Array.isArray(existing.bounties)
    ? (existing.bounties[0]?.owner_wallet as string | undefined)
    : (existing.bounties as { owner_wallet?: string } | null)?.owner_wallet;

  const isApplicant = existing.applicant_wallet === payload.sub;
  const isBountyOwner = ownerWallet === payload.sub;
  if (!isApplicant && !isBountyOwner) {
    sendJson(res, 403, { error: "not authorized to update this application" });
    return;
  }

  const { data, error } = await supabase
    .from("applications")
    .update({ status })
    .eq("id", applicationId)
    .select("*")
    .single();

  if (error) {
    sendJson(res, 500, { error: error.message });
    return;
  }
  sendJson(res, 200, data);
}

// ====================================================================
// Server entry
// ====================================================================

export interface AuthServerOptions {
  port: number;
  jwtSecret: string;
  supabaseUrl: string;
  supabaseServiceKey: string;
}

function matchPath(pathname: string, pattern: RegExp): RegExpExecArray | null {
  return pattern.exec(pathname);
}

export function startAuthServer(opts: AuthServerOptions): void {
  const supabase = createClient(opts.supabaseUrl, opts.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const server = createServer(async (req, res) => {
    if (req.method === "OPTIONS") {
      setCorsHeaders(res);
      res.statusCode = 204;
      res.end();
      return;
    }

    const url = req.url ?? "";
    const pathname = url.split("?")[0] ?? "";

    // Public auth routes
    if (req.method === "POST" && pathname === "/auth/challenge") {
      await handleChallenge(res);
      return;
    }
    if (req.method === "POST" && pathname === "/auth/verify") {
      await handleVerify(req, res, opts.jwtSecret);
      return;
    }
    if (req.method === "GET" && pathname === "/health") {
      sendJson(res, 200, { status: "ok", challenges: challenges.size });
      return;
    }

    // Routes below require auth
    const jwt = extractAuthJwt(req);
    if (!jwt) {
      sendJson(res, 401, { error: "Authorization Bearer JWT required" });
      return;
    }
    const payload = verifyJwt(jwt, opts.jwtSecret);
    if (!payload) {
      sendJson(res, 401, { error: "invalid or expired JWT" });
      return;
    }

    if (req.method === "POST" && pathname === "/bounties") {
      await handleCreateBounty(req, res, supabase, payload);
      return;
    }

    const updateBountyMatch = matchPath(
      pathname,
      /^\/bounties\/([0-9a-f-]+)$/i,
    );
    if (req.method === "PATCH" && updateBountyMatch) {
      await handleUpdateBounty(
        req,
        res,
        supabase,
        payload,
        updateBountyMatch[1] as string,
      );
      return;
    }

    const applyMatch = matchPath(
      pathname,
      /^\/bounties\/([0-9a-f-]+)\/applications$/i,
    );
    if (req.method === "POST" && applyMatch) {
      await handleApply(req, res, supabase, payload, applyMatch[1] as string);
      return;
    }

    const updateAppMatch = matchPath(
      pathname,
      /^\/applications\/([0-9a-f-]+)$/i,
    );
    if (req.method === "PATCH" && updateAppMatch) {
      await handleUpdateApplication(
        req,
        res,
        supabase,
        payload,
        updateAppMatch[1] as string,
      );
      return;
    }

    sendJson(res, 404, { error: "not found" });
  });

  server.listen(opts.port, () => {
    console.log(`[auth-server] listening on port ${opts.port}`);
  });
}
