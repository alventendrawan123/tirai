import { CloakError, UtxoAlreadySpentError } from "@cloak.dev/sdk-devnet";
import type { AppError } from "../types/errors";

const INSUFFICIENT_LAMPORTS_RE =
  /insufficient\s+lamports\s+(\d+)\s*,?\s*need\s+(\d+)/i;

function detectInsufficientBalance(message: string): AppError | null {
  const match = INSUFFICIENT_LAMPORTS_RE.exec(message);
  if (!match) return null;
  const available = BigInt(match[1] ?? "0");
  const required = BigInt(match[2] ?? "0");
  return { kind: "INSUFFICIENT_BALANCE", required, available };
}

export function parseSdkError(error: unknown): AppError {
  if (error instanceof UtxoAlreadySpentError) {
    return { kind: "NULLIFIER_CONSUMED" };
  }
  const rawMessage = error instanceof Error ? error.message : String(error);
  const insufficient = detectInsufficientBalance(rawMessage);
  if (insufficient) return insufficient;

  if (error instanceof CloakError) {
    if (error.category === "wallet") {
      return { kind: "USER_REJECTED" };
    }
    if (error.category === "prover") {
      return { kind: "PROOF_GENERATION_FAILED", message: error.message };
    }
    return {
      kind: "RPC",
      message: error.message,
      retryable: error.retryable,
    };
  }
  if (error instanceof Error) {
    return { kind: "UNKNOWN", message: error.message };
  }
  return { kind: "UNKNOWN", message: String(error) };
}
