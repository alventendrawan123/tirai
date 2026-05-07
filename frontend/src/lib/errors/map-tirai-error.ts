import type { AppError } from "@/types/api";
import { appErrorDetail, appErrorMessage } from "./messages";

export interface MappedTiraiError {
  kind: AppError["kind"];
  message: string;
  detail?: string;
  retryable: boolean;
  silent: boolean;
  field?: string;
}

export function mapTiraiError(error: AppError): MappedTiraiError {
  const detail = appErrorDetail(error);
  const base = {
    kind: error.kind,
    message: appErrorMessage(error),
    ...(detail !== undefined ? { detail } : {}),
  };
  switch (error.kind) {
    case "INVALID_INPUT":
      return { ...base, retryable: false, silent: false, field: error.field };
    case "USER_REJECTED":
      return { ...base, retryable: true, silent: true };
    case "RPC":
      return { ...base, retryable: error.retryable, silent: false };
    case "NULLIFIER_CONSUMED":
    case "WRONG_CLUSTER":
    case "INSUFFICIENT_BALANCE":
    case "TICKET_DECODE_FAILED":
    case "VIEWING_KEY_INVALID":
      return { ...base, retryable: false, silent: false };
    case "PROOF_GENERATION_FAILED":
    case "UNKNOWN":
      return { ...base, retryable: true, silent: false };
  }
}
