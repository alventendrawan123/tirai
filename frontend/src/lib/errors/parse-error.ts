import type { AppError } from "@/types/api";

const USER_REJECTED_PATTERNS = [
  "user rejected",
  "user denied",
  "wallet not connected",
  "request rejected",
];

const RPC_RETRYABLE_PATTERNS = [
  "blockhash not found",
  "block height exceeded",
  "transaction was not confirmed",
  "fetch failed",
  "failed to send transaction",
];

const NULLIFIER_PATTERNS = [
  "nullifier already exists",
  "nullifier consumed",
  "double spend",
];

const PROOF_PATTERNS = ["proof generation", "groth16", "circuit"];

const TICKET_PATTERNS = ["decode ticket", "ticket decode", "invalid ticket"];

function lowerMessage(err: unknown): string {
  if (err instanceof Error) return err.message.toLowerCase();
  if (typeof err === "string") return err.toLowerCase();
  return "";
}

export function parseSdkError(err: unknown): AppError {
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
  if (RPC_RETRYABLE_PATTERNS.some((p) => msg.includes(p))) {
    return { kind: "RPC", message: redact(msg), retryable: true };
  }
  return { kind: "UNKNOWN", message: redact(msg) };
}

function redact(input: string): string {
  return input
    .replace(/vk_[a-z0-9_]+/gi, "vk_••••")
    .replace(/tk_[a-z0-9_]+/gi, "tk_••••")
    .replace(/[1-9A-HJ-NP-Za-km-z]{32,44}/g, "•••address•••");
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
