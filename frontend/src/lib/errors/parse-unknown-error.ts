import type { AppError, Result } from "@/types/api";

const USER_REJECTED_PATTERNS = [
  "user rejected",
  "user denied",
  "request rejected",
  "wallet not connected",
  "transaction was not signed",
];

const RPC_RETRYABLE_PATTERNS = [
  "blockhash not found",
  "block height exceeded",
  "transaction was not confirmed",
  "fetch failed",
  "failed to send transaction",
  "network request failed",
  "load failed",
  "timeout",
];

const NULLIFIER_PATTERNS = [
  "nullifier already exists",
  "nullifier consumed",
  "double spend",
];

const PROOF_PATTERNS = ["proof generation", "groth16", "circuit"];

const TICKET_PATTERNS = ["decode ticket", "ticket decode", "invalid ticket"];

const VK_PATTERNS = ["viewing key", "viewing-key", "invalid vk"];

function lowerMessage(err: unknown): string {
  if (err instanceof Error) return err.message.toLowerCase();
  if (typeof err === "string") return err.toLowerCase();
  if (typeof err === "object" && err !== null) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string") return m.toLowerCase();
  }
  return "";
}

function redact(input: string): string {
  return input
    .replace(/\bvk_[a-z0-9_]+/giu, "vk_••••")
    .replace(/\btk_[a-z0-9_]+/giu, "tk_••••")
    .replace(/\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/gu, "•••address•••")
    .replace(/\b[0-9a-f]{64}\b/giu, "0x••••");
}

function isAppError(err: unknown): err is AppError {
  if (typeof err !== "object" || err === null) return false;
  const k = (err as { kind?: unknown }).kind;
  if (typeof k !== "string") return false;
  return [
    "INVALID_INPUT",
    "INSUFFICIENT_BALANCE",
    "USER_REJECTED",
    "NULLIFIER_CONSUMED",
    "WRONG_CLUSTER",
    "RPC",
    "PROOF_GENERATION_FAILED",
    "TICKET_DECODE_FAILED",
    "VIEWING_KEY_INVALID",
    "UNKNOWN",
  ].includes(k);
}

export function parseUnknownError(err: unknown): AppError {
  if (isAppError(err)) return err;
  const msg = lowerMessage(err);
  if (!msg) return { kind: "UNKNOWN", message: "unknown error" };
  if (USER_REJECTED_PATTERNS.some((p) => msg.includes(p))) {
    return { kind: "USER_REJECTED" };
  }
  if (NULLIFIER_PATTERNS.some((p) => msg.includes(p))) {
    return { kind: "NULLIFIER_CONSUMED" };
  }
  if (PROOF_PATTERNS.some((p) => msg.includes(p))) {
    return { kind: "PROOF_GENERATION_FAILED", message: redact(msg) };
  }
  if (TICKET_PATTERNS.some((p) => msg.includes(p))) {
    return { kind: "TICKET_DECODE_FAILED", message: redact(msg) };
  }
  if (VK_PATTERNS.some((p) => msg.includes(p))) {
    return { kind: "VIEWING_KEY_INVALID" };
  }
  if (RPC_RETRYABLE_PATTERNS.some((p) => msg.includes(p))) {
    return { kind: "RPC", message: redact(msg), retryable: true };
  }
  return { kind: "UNKNOWN", message: redact(msg) };
}

export async function safeAdapter<T>(
  fn: () => Promise<Result<T, AppError>>,
): Promise<Result<T, AppError>> {
  try {
    const out = await fn();
    return out;
  } catch (err) {
    return { ok: false, error: parseUnknownError(err) };
  }
}
