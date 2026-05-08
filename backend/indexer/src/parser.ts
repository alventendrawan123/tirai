// Replication of internal SDK helpers (parseChainNotesFromIx +
// parseTransactIxContext, simplified for indexer use).
//
// What we parse from a Cloak Transact instruction's data bytes:
//   - tag (transact / transactSwap)
//   - publicAmount (signed i64)  → derives txType + gross amount
//   - outputCommitments (up to 2 hex strings)
//   - encryptedNotes (variable count, base64-encoded blobs)
//
// We DELIBERATELY skip:
//   - recipient extraction (privacy: indexer must never store recipient)
//   - swap-specific fields (parseSwapRecipientAta / parseSwapOutputMint)
//
// Reference: SDK index.js lines 6617-6702 (v0.1.5-devnet.1)

import { bytesToHex } from "@cloak.dev/sdk-devnet";
import {
  CHAIN_NOTE_HASH_OFFSET,
  CHAIN_NOTES_OFFSET_TRANSACT,
  CHAIN_NOTES_OFFSET_TRANSACT_SWAP,
  EXT_DATA_HASH_OFFSET,
  OUTPUT_COMMITMENT_0_OFFSET,
  OUTPUT_COMMITMENT_1_OFFSET,
  PUBLIC_AMOUNT_OFFSET,
  PUBLIC_INPUTS_LEN,
  PUBLIC_INPUTS_OFFSET,
  TRANSACT_SWAP_TAG,
  TRANSACT_TAG,
} from "./constants";

export type ParsedTxType = "deposit" | "withdraw" | "transfer" | "swap";

export interface ParsedTransactIx {
  tag: 0 | 1;
  txType: ParsedTxType;
  publicAmount: bigint;
  amount: bigint;
  outputCommitments: string[];
  extDataHash: Uint8Array;
  chainNoteHash: Uint8Array;
}

function readI64LE(bytes: Uint8Array, offset: number): bigint {
  let lo = 0n;
  let hi = 0n;
  for (let i = 0; i < 4; i++) {
    lo |= BigInt(bytes[offset + i] ?? 0) << BigInt(i * 8);
  }
  for (let i = 0; i < 4; i++) {
    hi |= BigInt(bytes[offset + 4 + i] ?? 0) << BigInt(i * 8);
  }
  let unsigned = (hi << 32n) | lo;
  // Sign-extend 64-bit
  if (unsigned >= 1n << 63n) {
    unsigned -= 1n << 64n;
  }
  return unsigned;
}

function isAllZero(bytes: Uint8Array): boolean {
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] !== 0) return false;
  }
  return true;
}

export function parseTransactIxContext(
  data: Uint8Array,
): ParsedTransactIx | null {
  if (!data || data.length === 0) return null;
  const tag = data[0];
  if (tag !== TRANSACT_TAG && tag !== TRANSACT_SWAP_TAG) return null;

  const minLen =
    tag === TRANSACT_SWAP_TAG
      ? CHAIN_NOTES_OFFSET_TRANSACT_SWAP
      : CHAIN_NOTES_OFFSET_TRANSACT;
  if (data.length < minLen) return null;

  const pi = data.slice(
    PUBLIC_INPUTS_OFFSET,
    PUBLIC_INPUTS_OFFSET + PUBLIC_INPUTS_LEN,
  );

  const publicAmount = readI64LE(pi, PUBLIC_AMOUNT_OFFSET);
  const extDataHash = pi.slice(EXT_DATA_HASH_OFFSET, EXT_DATA_HASH_OFFSET + 32);
  const chainNoteHash = pi.slice(
    CHAIN_NOTE_HASH_OFFSET,
    CHAIN_NOTE_HASH_OFFSET + 32,
  );

  let txType: ParsedTxType;
  if (tag === TRANSACT_SWAP_TAG) {
    txType = "swap";
  } else if (publicAmount > 0n) {
    txType = "deposit";
  } else if (publicAmount < 0n) {
    txType = "withdraw";
  } else {
    txType = "transfer";
  }

  const amount = publicAmount < 0n ? -publicAmount : publicAmount;

  const c0 = pi.slice(
    OUTPUT_COMMITMENT_0_OFFSET,
    OUTPUT_COMMITMENT_0_OFFSET + 32,
  );
  const c1 = pi.slice(
    OUTPUT_COMMITMENT_1_OFFSET,
    OUTPUT_COMMITMENT_1_OFFSET + 32,
  );
  const outputCommitments: string[] = [];
  if (!isAllZero(c0)) outputCommitments.push(bytesToHex(c0));
  if (!isAllZero(c1)) outputCommitments.push(bytesToHex(c1));

  return {
    tag: tag as 0 | 1,
    txType,
    publicAmount,
    amount,
    outputCommitments,
    extDataHash,
    chainNoteHash,
  };
}

// =====================================================================
// parseChainNotesFromIx — extract encrypted note blobs from instruction.
// Layout (after CHAIN_NOTES_OFFSET):
//   tail[0] = 2 (version magic)
//   tail[1] = note count
//   tail[2..]: sequence of [noteLen: u8][noteBytes] pairs
// =====================================================================

export function parseChainNotesFromIx(data: Uint8Array): Uint8Array[] {
  if (!data || data.length === 0) return [];
  const tag = data[0];
  if (tag !== TRANSACT_TAG && tag !== TRANSACT_SWAP_TAG) return [];

  const notesOffset =
    tag === TRANSACT_SWAP_TAG
      ? CHAIN_NOTES_OFFSET_TRANSACT_SWAP
      : CHAIN_NOTES_OFFSET_TRANSACT;
  if (data.length <= notesOffset) return [];

  const tail = data.slice(notesOffset);
  if (tail.length < 2 || tail[0] !== 2) return [];

  const count = tail[1] ?? 0;
  let offset = 2;
  const notes: Uint8Array[] = [];
  for (let i = 0; i < count; i++) {
    if (offset + 1 > tail.length) break;
    const noteLen = tail[offset] ?? 0;
    offset += 1;
    if (offset + noteLen > tail.length) break;
    notes.push(tail.slice(offset, offset + noteLen));
    offset += noteLen;
  }
  return notes;
}
