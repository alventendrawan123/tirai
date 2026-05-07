import type { AppError } from "@/types/api";

export function appErrorMessage(error: AppError): string {
  switch (error.kind) {
    case "INVALID_INPUT":
      return `${error.field} is invalid.`;
    case "INSUFFICIENT_BALANCE":
      return "Wallet balance is too low to complete this action.";
    case "USER_REJECTED":
      return "Wallet signature was cancelled.";
    case "NULLIFIER_CONSUMED":
      return "This bounty ticket has already been claimed.";
    case "WRONG_CLUSTER":
      return `Wallet is on ${error.got} but Tirai is set to ${error.expected}.`;
    case "RPC":
      return error.retryable
        ? "Network is busy. Please retry in a moment."
        : "Network call failed.";
    case "PROOF_GENERATION_FAILED":
      return "Privacy proof generation failed. Please retry.";
    case "TICKET_DECODE_FAILED":
      return "This claim ticket is not in a recognised format.";
    case "VIEWING_KEY_INVALID":
      return "This viewing key is not valid.";
    case "UNKNOWN":
      return "Something went wrong. Please retry.";
  }
}

export function appErrorDetail(error: AppError): string | undefined {
  switch (error.kind) {
    case "INVALID_INPUT":
    case "PROOF_GENERATION_FAILED":
    case "TICKET_DECODE_FAILED":
    case "RPC":
    case "UNKNOWN":
      return error.message;
    case "WRONG_CLUSTER":
      return `expected ${error.expected}, got ${error.got}`;
    case "INSUFFICIENT_BALANCE":
      return `required ${error.required.toString()} lamports, available ${error.available.toString()}`;
    default:
      return undefined;
  }
}
