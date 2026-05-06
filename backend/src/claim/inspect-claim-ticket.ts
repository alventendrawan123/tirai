import type { Connection } from "@solana/web3.js";
import type { Cluster, Result } from "../types/api";
import type { AppError } from "../types/errors";

export interface InspectContext {
  connection: Connection;
  cluster: Cluster;
}

export interface ClaimTicketPreview {
  amountLamports: bigint;
  tokenMint: string | null;
  label: string;
  expiresAt?: number;
  isClaimable: boolean;
}

export async function inspectClaimTicket(
  _ticket: string,
  _ctx: InspectContext,
): Promise<Result<ClaimTicketPreview, AppError>> {
  return { ok: false, error: { kind: "UNKNOWN", message: "not implemented" } };
}
