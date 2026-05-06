import type { Cluster } from "./api";

export type AppError =
  | { kind: "INVALID_INPUT"; field: string; message: string }
  | { kind: "INSUFFICIENT_BALANCE"; required: bigint; available: bigint }
  | { kind: "USER_REJECTED" }
  | { kind: "NULLIFIER_CONSUMED" }
  | { kind: "WRONG_CLUSTER"; expected: Cluster; got: Cluster }
  | { kind: "RPC"; message: string; retryable: boolean }
  | { kind: "PROOF_GENERATION_FAILED"; message: string }
  | { kind: "TICKET_DECODE_FAILED"; message: string }
  | { kind: "VIEWING_KEY_INVALID" }
  | { kind: "UNKNOWN"; message: string };
