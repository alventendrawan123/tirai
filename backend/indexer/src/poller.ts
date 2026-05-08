import {
  bytesToHex,
  calculateFeeBigint,
  CLOAK_PROGRAM_ID,
} from "@cloak.dev/sdk-devnet";
import {
  type ConfirmedSignatureInfo,
  type Connection,
  PublicKey,
  type TransactionResponse,
  type VersionedTransactionResponse,
} from "@solana/web3.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type ChainNoteRow,
  readCursor,
  upsertChainNotes,
  writeCursor,
} from "./db";
import {
  parseChainNotesFromIx,
  parseTransactIxContext,
} from "./parser";

const SIGNATURE_PAGE_SIZE = 250;

type AnyTx = TransactionResponse | VersionedTransactionResponse;

function bufferToBase64(bytes: Uint8Array): string {
  // Node + browser-safe base64 encoding.
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i] ?? 0);
  }
  return btoa(binary);
}

function decodeIxData(data: unknown): Uint8Array | null {
  if (data instanceof Uint8Array) return data;
  if (typeof data === "string") {
    // base58 (top-level instruction) or base64 (inner instruction)
    // Solana web3 returns base58 for legacy, base64 for v0. Try both.
    try {
      const buf = Buffer.from(data, "base64");
      if (buf.length > 0) return new Uint8Array(buf);
    } catch {
      // fall through
    }
  }
  return null;
}

function accountKeyToBase58(key: unknown): string | null {
  if (key instanceof PublicKey) return key.toBase58();
  if (typeof key === "string") return key;
  if (key && typeof key === "object" && "toBase58" in key) {
    const obj = key as { toBase58: () => string };
    return obj.toBase58();
  }
  return null;
}

function getAllAccountKeys(tx: AnyTx): string[] {
  const message = tx.transaction.message;
  const staticKeys =
    "staticAccountKeys" in message
      ? message.staticAccountKeys
      : (message as unknown as { accountKeys: PublicKey[] }).accountKeys;
  const loadedAddresses = tx.meta?.loadedAddresses;
  const all: string[] = [];
  for (const k of staticKeys) {
    const s = accountKeyToBase58(k);
    if (s !== null) all.push(s);
  }
  if (loadedAddresses) {
    for (const k of loadedAddresses.writable ?? []) {
      const s = accountKeyToBase58(k);
      if (s !== null) all.push(s);
    }
    for (const k of loadedAddresses.readonly ?? []) {
      const s = accountKeyToBase58(k);
      if (s !== null) all.push(s);
    }
  }
  return all;
}

interface CloakIxRaw {
  data: Uint8Array;
  accountIndexes: number[];
}

function findCloakInstructions(
  tx: AnyTx,
  programIdStr: string,
  accountKeys: string[],
): CloakIxRaw[] {
  const message = tx.transaction.message;
  const result: CloakIxRaw[] = [];

  const topLevel =
    "compiledInstructions" in message
      ? message.compiledInstructions
      : (message as unknown as { instructions: unknown[] }).instructions;

  if (Array.isArray(topLevel)) {
    for (const ix of topLevel) {
      const ixObj = ix as {
        programIdIndex: number;
        data: unknown;
        accountKeyIndexes?: number[];
        accounts?: number[];
      };
      const programIdx = ixObj.programIdIndex;
      if (programIdx == null || programIdx < 0 || programIdx >= accountKeys.length) continue;
      if (accountKeys[programIdx] !== programIdStr) continue;
      const data = decodeIxData(ixObj.data);
      if (!data || data.length === 0) continue;
      const accountIndexes = (ixObj.accountKeyIndexes ?? ixObj.accounts ?? [])
        .map(Number)
        .filter((n) => Number.isInteger(n) && n >= 0);
      result.push({ data, accountIndexes });
    }
  }

  const innerBlocks = tx.meta?.innerInstructions;
  if (Array.isArray(innerBlocks)) {
    for (const block of innerBlocks) {
      if (!Array.isArray(block.instructions)) continue;
      for (const ix of block.instructions) {
        const ixObj = ix as {
          programIdIndex: number;
          data: unknown;
          accountKeyIndexes?: number[];
          accounts?: number[];
        };
        const programIdx = ixObj.programIdIndex;
        if (programIdx == null || programIdx < 0 || programIdx >= accountKeys.length) continue;
        if (accountKeys[programIdx] !== programIdStr) continue;
        const data = decodeIxData(ixObj.data);
        if (!data || data.length === 0) continue;
        const accountIndexes = (ixObj.accountKeyIndexes ?? ixObj.accounts ?? [])
          .map(Number)
          .filter((n) => Number.isInteger(n) && n >= 0);
        result.push({ data, accountIndexes });
      }
    }
  }

  return result;
}

export interface PollerOptions {
  connection: Connection;
  programId: PublicKey;
  supabase: SupabaseClient;
  pollIntervalMs: number;
  batchSize: number;
}

export interface PollResult {
  scannedSignatures: number;
  insertedRows: number;
  newCursor: string | null;
}

export async function pollOnce(opts: PollerOptions): Promise<PollResult> {
  const { connection, programId, supabase, batchSize } = opts;
  const programIdStr = programId.toBase58();

  const cursor = await readCursor(supabase);
  const untilSig = cursor.last_signature ?? undefined;

  // FIRST-RUN OPTIMIZATION: if cursor is null, skip historical backfill.
  // Set cursor to the latest signature so subsequent polls only catch NEW
  // transactions. Demo use case doesn't need historical data; backfill
  // from genesis would take 5-30 minutes on devnet (thousands of tx).
  if (!untilSig) {
    console.log("[indexer] first run detected — initializing cursor to latest signature (skipping historical backfill)");
    const initialPage = await connection.getSignaturesForAddress(programId, {
      limit: 1,
    });
    const latest = initialPage[0];
    if (latest && latest.blockTime != null) {
      await writeCursor(supabase, {
        lastSignature: latest.signature,
        lastSlot: latest.slot,
        lastBlockTime: new Date(latest.blockTime * 1000).toISOString(),
      });
      console.log(`[indexer] cursor initialized at ${latest.signature.slice(0, 16)}…`);
      return { scannedSignatures: 0, insertedRows: 0, newCursor: latest.signature };
    }
    console.log("[indexer] no signatures yet on program — waiting next cycle");
    return { scannedSignatures: 0, insertedRows: 0, newCursor: null };
  }

  const sigInfos: ConfirmedSignatureInfo[] = [];
  let beforeSig: string | undefined;
  let reachedCursor = false;

  while (!reachedCursor) {
    const page = await connection.getSignaturesForAddress(programId, {
      ...(beforeSig !== undefined ? { before: beforeSig } : {}),
      limit: SIGNATURE_PAGE_SIZE,
    });
    if (page.length === 0) break;

    const idx = page.findIndex((s) => s.signature === untilSig);
    if (idx >= 0) {
      sigInfos.push(...page.slice(0, idx));
      reachedCursor = true;
      break;
    }

    sigInfos.push(...page);
    const last = page[page.length - 1];
    beforeSig = last?.signature;
    if (page.length < SIGNATURE_PAGE_SIZE) break;
  }

  if (sigInfos.length === 0) {
    return { scannedSignatures: 0, insertedRows: 0, newCursor: null };
  }

  // Process newest-first signatures, but we want to process in chronological
  // order (oldest first) so cursor moves forward correctly.
  sigInfos.reverse();

  const rows: ChainNoteRow[] = [];
  let newCursor: string | null = null;
  let newCursorSlot = 0;
  let newCursorBlockTime = "";

  for (let i = 0; i < sigInfos.length; i += batchSize) {
    const slice = sigInfos.slice(i, i + batchSize);
    const txs = await Promise.all(
      slice.map((info) =>
        connection
          .getTransaction(info.signature, {
            commitment: "confirmed",
            maxSupportedTransactionVersion: 0,
          })
          .catch(() => null),
      ),
    );

    for (let j = 0; j < slice.length; j++) {
      const info = slice[j];
      const tx = txs[j];
      if (!info || !tx || tx.meta?.err) continue;
      if (info.blockTime == null) continue;

      const accountKeys = getAllAccountKeys(tx);
      const cloakIxs = findCloakInstructions(tx, programIdStr, accountKeys);

      for (const ix of cloakIxs) {
        const ctx = parseTransactIxContext(ix.data);
        if (!ctx) continue;

        const notes = parseChainNotesFromIx(ix.data);
        const fee = calculateFeeBigint(ctx.amount);
        const netAmount = ctx.txType === "deposit" ? ctx.amount : ctx.amount - fee;

        // Pool address: typically accountIndexes[1] for Cloak Transact, but
        // we record best-effort. Frontend can derive mint from this.
        let poolAddress: string | null = null;
        if (ix.accountIndexes.length >= 2) {
          const poolIdx = ix.accountIndexes[1];
          if (poolIdx !== undefined && poolIdx < accountKeys.length) {
            poolAddress = accountKeys[poolIdx] ?? null;
          }
        }

        rows.push({
          signature: info.signature,
          slot: info.slot,
          block_time: new Date(info.blockTime * 1000).toISOString(),
          tx_type: ctx.tag,
          public_amount: ctx.publicAmount.toString(),
          net_amount: netAmount.toString(),
          fee: fee.toString(),
          output_commitments: ctx.outputCommitments,
          encrypted_notes: notes.map(bufferToBase64),
          pool_address: poolAddress,
          mint: null,
        });

        newCursor = info.signature;
        newCursorSlot = info.slot;
        newCursorBlockTime = new Date(info.blockTime * 1000).toISOString();
      }
    }
  }

  if (rows.length > 0) {
    await upsertChainNotes(supabase, rows);
  }

  if (newCursor) {
    await writeCursor(supabase, {
      lastSignature: newCursor,
      lastSlot: newCursorSlot,
      lastBlockTime: newCursorBlockTime,
    });
  }

  return {
    scannedSignatures: sigInfos.length,
    insertedRows: rows.length,
    newCursor,
  };
}

export async function startPollLoop(opts: PollerOptions): Promise<void> {
  const programIdStr = opts.programId.toBase58();
  console.log(`[indexer] starting poll loop for ${programIdStr}`);
  console.log(`[indexer] interval: ${opts.pollIntervalMs}ms, batch: ${opts.batchSize}`);

  // Suppress unused-import warnings — referenced for documentation.
  void CLOAK_PROGRAM_ID;
  void bytesToHex;

  while (true) {
    const startedAt = Date.now();
    try {
      const result = await pollOnce(opts);
      const elapsed = Date.now() - startedAt;
      console.log(
        `[indexer] cycle done in ${elapsed}ms — scanned=${result.scannedSignatures} inserted=${result.insertedRows} cursor=${result.newCursor ?? "(unchanged)"}`,
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[indexer] poll cycle failed:`, msg);
    }
    await new Promise((resolve) => setTimeout(resolve, opts.pollIntervalMs));
  }
}
