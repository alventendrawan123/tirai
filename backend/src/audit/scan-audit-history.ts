import {
  type ChainNoteTxType,
  hexToBytes,
  NATIVE_SOL_MINT,
  type ScannedTransaction,
  scanTransactions,
} from "@cloak.dev/sdk-devnet";
import type { Connection } from "@solana/web3.js";
import { getProgramId } from "../config/cloak-program";
import { parseSdkError } from "../errors/parse-sdk-error";
import { err, ok } from "../lib/result";
import type { Cluster, Result } from "../types/api";
import type { AppError } from "../types/errors";

export interface ScanAuditInput {
  viewingKey: string;
}

export interface AuditContext {
  connection: Connection;
  cluster: Cluster;
  limit?: number;
  afterTimestamp?: number;
  untilSignature?: string;
  batchSize?: number;
  onProgress?: (processed: number, total: number) => void;
  onStatus?: (status: string) => void;
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
  lastSignature?: string;
}

const VIEWING_KEY_HEX_LENGTH = 64;
const VIEWING_KEY_HEX_PATTERN = /^[0-9a-fA-F]{64}$/;
const NATIVE_SOL_MINT_BASE58 = NATIVE_SOL_MINT.toBase58();

function statusFromTxType(
  txType: ChainNoteTxType,
): "deposited" | "claimed" | null {
  if (txType === "deposit") return "deposited";
  if (txType === "withdraw") return "claimed";
  return null;
}

function toAuditEntry(tx: ScannedTransaction): AuditEntry | null {
  const status = statusFromTxType(tx.txType);
  if (status === null) return null;

  return {
    timestamp: Number(tx.timestamp),
    amountLamports: tx.amount,
    tokenMint: tx.mint === NATIVE_SOL_MINT_BASE58 ? null : tx.mint,
    label: "",
    status,
    signature: tx.signature,
  };
}

function summarize(entries: ReadonlyArray<AuditEntry>): AuditSummary {
  let totalVolumeLamports = 0n;
  let latestActivityAt: number | null = null;
  for (const entry of entries) {
    totalVolumeLamports += entry.amountLamports;
    if (latestActivityAt === null || entry.timestamp > latestActivityAt) {
      latestActivityAt = entry.timestamp;
    }
  }
  return {
    totalPayments: entries.length,
    totalVolumeLamports,
    latestActivityAt,
  };
}

export async function scanAuditHistory(
  input: ScanAuditInput,
  ctx: AuditContext,
): Promise<Result<AuditHistory, AppError>> {
  if (
    input.viewingKey.length !== VIEWING_KEY_HEX_LENGTH ||
    !VIEWING_KEY_HEX_PATTERN.test(input.viewingKey)
  ) {
    return err({ kind: "VIEWING_KEY_INVALID" });
  }

  let nk: Uint8Array;
  try {
    nk = hexToBytes(input.viewingKey);
  } catch {
    return err({ kind: "VIEWING_KEY_INVALID" });
  }

  let scanResult: Awaited<ReturnType<typeof scanTransactions>>;
  try {
    scanResult = await scanTransactions({
      connection: ctx.connection,
      programId: getProgramId(ctx.cluster),
      viewingKeyNk: nk,
      ...(ctx.limit !== undefined ? { limit: ctx.limit } : {}),
      ...(ctx.afterTimestamp !== undefined
        ? { afterTimestamp: ctx.afterTimestamp }
        : {}),
      ...(ctx.untilSignature !== undefined
        ? { untilSignature: ctx.untilSignature }
        : {}),
      batchSize: ctx.batchSize ?? 50,
    });
  } catch (error) {
    return err(parseSdkError(error));
  }

  const entries: AuditEntry[] = [];
  for (const tx of scanResult.transactions) {
    const entry = toAuditEntry(tx);
    if (entry !== null) entries.push(entry);
  }

  return ok({
    entries,
    summary: summarize(entries),
    ...(scanResult.lastSignature !== undefined
      ? { lastSignature: scanResult.lastSignature }
      : {}),
  });
}
