import {
  chainNoteFromBase64,
  decryptCompactChainNote,
  hexToBytes,
  NATIVE_SOL_MINT,
} from "@cloak.dev/sdk-devnet";
import type { Connection } from "@solana/web3.js";
import { createClient } from "@supabase/supabase-js";
import { err, ok } from "../lib/result";
import type { Cluster, Result } from "../types/api";
import type { AppError } from "../types/errors";

export interface ScanAuditInput {
  viewingKey: string;
}

export interface AuditContext {
  connection: Connection;
  cluster: Cluster;
  supabaseUrl: string;
  supabaseAnonKey: string;
  limit?: number;
  afterTimestamp?: number;
  untilSignature?: string;
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
const DEFAULT_FETCH_LIMIT = 500;

interface ChainNoteRow {
  signature: string;
  slot: number;
  block_time: string;
  tx_type: number;
  public_amount: string;
  net_amount: string;
  fee: string;
  output_commitments: string[];
  encrypted_notes: string[];
  pool_address: string | null;
  mint: string | null;
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

function statusFromRow(row: ChainNoteRow): "deposited" | "claimed" | null {
  if (row.tx_type !== 0) return null;
  const amt = BigInt(row.public_amount);
  if (amt > 0n) return "deposited";
  if (amt < 0n) return "claimed";
  return null;
}

async function tryDecryptRow(
  row: ChainNoteRow,
  nk: Uint8Array,
): Promise<{ timestamp: bigint } | null> {
  if (row.encrypted_notes.length === 0) return null;
  if (row.output_commitments.length === 0) return null;

  for (const noteBase64 of row.encrypted_notes) {
    try {
      const noteBytes = chainNoteFromBase64(noteBase64);
      const decoded = await decryptCompactChainNote(
        noteBytes,
        nk,
        row.output_commitments,
      );
      return { timestamp: decoded.timestamp };
    } catch {
      // Decryption failed — note doesn't belong to this VK. Try next.
    }
  }
  return null;
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

  ctx.onStatus?.("Fetching cached chain notes…");

  const supabase = createClient(ctx.supabaseUrl, ctx.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const limit = ctx.limit ?? DEFAULT_FETCH_LIMIT;

  let query = supabase
    .from("chain_notes")
    .select(
      "signature, slot, block_time, tx_type, public_amount, net_amount, fee, output_commitments, encrypted_notes, pool_address, mint",
    )
    .order("block_time", { ascending: false })
    .limit(limit);

  if (ctx.afterTimestamp !== undefined) {
    query = query.gte("block_time", new Date(ctx.afterTimestamp).toISOString());
  }

  const { data: rows, error: queryError } = await query;
  if (queryError) {
    return err({
      kind: "RPC",
      message: `Supabase query failed: ${queryError.message}`,
      retryable: true,
    });
  }

  const allRows = (rows ?? []) as ChainNoteRow[];
  ctx.onStatus?.(`Trial-decrypting ${allRows.length} cached entries…`);

  const entries: AuditEntry[] = [];
  let processed = 0;
  for (const row of allRows) {
    processed++;
    ctx.onProgress?.(processed, allRows.length);

    if (
      ctx.untilSignature !== undefined &&
      row.signature === ctx.untilSignature
    ) {
      break;
    }

    const status = statusFromRow(row);
    if (status === null) continue;

    const decrypted = await tryDecryptRow(row, nk);
    if (decrypted === null) continue;

    const grossAmount = BigInt(row.public_amount);
    const amountLamports = grossAmount < 0n ? -grossAmount : grossAmount;

    entries.push({
      timestamp: Number(decrypted.timestamp),
      amountLamports,
      tokenMint:
        row.mint && row.mint !== NATIVE_SOL_MINT_BASE58 ? row.mint : null,
      label: "",
      status,
      signature: row.signature,
    });
  }

  ctx.onStatus?.("Done");

  const lastSignature = allRows[0]?.signature;
  return ok({
    entries,
    summary: summarize(entries),
    ...(lastSignature !== undefined ? { lastSignature } : {}),
  });
}
