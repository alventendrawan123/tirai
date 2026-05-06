import type { Connection } from "@solana/web3.js";
import type { Cluster, Result } from "../types/api";
import type { AppError } from "../types/errors";

export interface ScanAuditInput {
  viewingKey: string;
}

export interface AuditContext {
  connection: Connection;
  cluster: Cluster;
}

export interface AuditEntry {
  timestamp: number;
  amountLamports: bigint;
  tokenMint: string | null;
  label: string;
  status: "deposited" | "claimed" | "expired";
  signature: string;
}

export interface AuditSummary {
  totalPayments: number;
  totalVolumeLamports: bigint;
  latestActivityAt: number | null;
}

export interface AuditHistory {
  entries: ReadonlyArray<AuditEntry>;
  summary: AuditSummary;
}

export async function scanAuditHistory(
  _input: ScanAuditInput,
  _ctx: AuditContext,
): Promise<Result<AuditHistory, AppError>> {
  return { ok: false, error: { kind: "UNKNOWN", message: "not implemented" } };
}
