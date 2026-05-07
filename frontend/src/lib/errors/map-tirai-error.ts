import type { AppError } from "@/types/api";
import { appErrorMessage } from "./messages";

export interface MappedTiraiError {
  kind: AppError["kind"];
  message: string;
  retryable: boolean;
  silent: boolean;
  field?: string;
}

export function mapTiraiError(error: AppError): MappedTiraiError {
  switch (error.kind) {
    case "INVALID_INPUT":
      return {
        kind: error.kind,
        message: appErrorMessage(error),
        retryable: false,
        silent: false,
        field: error.field,
      };
    case "USER_REJECTED":
      return {
        kind: error.kind,
        message: appErrorMessage(error),
        retryable: true,
        silent: true,
      };
    case "RPC":
      return {
        kind: error.kind,
        message: appErrorMessage(error),
        retryable: error.retryable,
        silent: false,
      };
    case "NULLIFIER_CONSUMED":
    case "WRONG_CLUSTER":
    case "INSUFFICIENT_BALANCE":
    case "TICKET_DECODE_FAILED":
    case "VIEWING_KEY_INVALID":
      return {
        kind: error.kind,
        message: appErrorMessage(error),
        retryable: false,
        silent: false,
      };
    case "PROOF_GENERATION_FAILED":
    case "UNKNOWN":
      return {
        kind: error.kind,
        message: appErrorMessage(error),
        retryable: true,
        silent: false,
      };
  }
}
