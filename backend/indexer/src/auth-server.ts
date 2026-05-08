// Minimal HTTP server embedded in indexer process for Solana wallet
// signature → Supabase JWT auth flow.
//
// Endpoints:
//   POST /auth/challenge → returns { challenge, expiresAt }
//   POST /auth/verify    → body { walletPubkey, signature, challenge }
//                       → returns { jwt }
//
// JWT signed with HS256 + SUPABASE_JWT_SECRET (from Supabase dashboard
// Settings → API → JWT Settings → JWT Secret). Payload includes:
//   - sub: walletPubkey
//   - role: "authenticated"
//   - exp: now + 1 hour

import { createHmac, randomBytes } from "node:crypto";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import * as nacl from "tweetnacl";

const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const JWT_TTL_SECONDS = 60 * 60; // 1 hour

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

function base64UrlEncode(input: string | Buffer): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
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
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  setCorsHeaders(res);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

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

  // One-time use
  challenges.delete(challenge);

  const jwt = signJwt(walletPubkey, jwtSecret);
  sendJson(res, 200, { jwt });
}

export interface AuthServerOptions {
  port: number;
  jwtSecret: string;
}

export function startAuthServer(opts: AuthServerOptions): void {
  const server = createServer(async (req, res) => {
    if (req.method === "OPTIONS") {
      setCorsHeaders(res);
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.method === "POST" && req.url === "/auth/challenge") {
      await handleChallenge(res);
      return;
    }

    if (req.method === "POST" && req.url === "/auth/verify") {
      await handleVerify(req, res, opts.jwtSecret);
      return;
    }

    if (req.method === "GET" && req.url === "/health") {
      sendJson(res, 200, { status: "ok", challenges: challenges.size });
      return;
    }

    sendJson(res, 404, { error: "not found" });
  });

  server.listen(opts.port, () => {
    console.log(`[auth-server] listening on port ${opts.port}`);
  });
}
