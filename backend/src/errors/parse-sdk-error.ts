import { CloakError, UtxoAlreadySpentError } from "@cloak.dev/sdk-devnet";
import type { AppError } from "../types/errors";

export function parseSdkError(error: unknown): AppError {
  if (error instanceof UtxoAlreadySpentError) {
    return { kind: "NULLIFIER_CONSUMED" };
  }
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
