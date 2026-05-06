import type { Connection } from "@solana/web3.js";
import type {
  ClaimTicket,
  Cluster,
  ProgressEmitter,
  Result,
  Signer,
} from "../types/api";
import type { AppError } from "../types/errors";

export interface CreateBountyPaymentInput {
  amountBaseUnits: bigint;
  tokenMint?: string;
  label: string;
  memo?: string;
}

export interface BountyContext {
  connection: Connection;
  payer: Signer;
  cluster: Cluster;
  onProgress?: ProgressEmitter;
}

export interface BountyPaymentResult {
  ticket: ClaimTicket;
  viewingKey: string;
  signature: string;
  feeLamports: bigint;
}

export async function createBountyPayment(
  _input: CreateBountyPaymentInput,
  _ctx: BountyContext,
): Promise<Result<BountyPaymentResult, AppError>> {
  return { ok: false, error: { kind: "UNKNOWN", message: "not implemented" } };
}
