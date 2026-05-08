import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface IndexerCursor {
  last_signature: string | null;
  last_slot: number | null;
  last_block_time: string | null;
}

export interface ChainNoteRow {
  signature: string;
  slot: number;
  block_time: string; // ISO timestamp
  tx_type: 0 | 1;
  public_amount: string; // bigint serialized
  net_amount: string;
  fee: string;
  output_commitments: string[];
  encrypted_notes: string[]; // base64
  pool_address: string | null;
  mint: string | null;
}

export function createSupabaseClient(
  url: string,
  serviceRoleKey: string,
): SupabaseClient {
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function readCursor(
  client: SupabaseClient,
): Promise<IndexerCursor> {
  const { data, error } = await client
    .from("indexer_cursor")
    .select("last_signature, last_slot, last_block_time")
    .eq("id", 1)
    .single();
  if (error) {
    throw new Error(`Failed to read cursor: ${error.message}`);
  }
  return data as IndexerCursor;
}

export async function writeCursor(
  client: SupabaseClient,
  cursor: { lastSignature: string; lastSlot: number; lastBlockTime: string },
): Promise<void> {
  const { error } = await client
    .from("indexer_cursor")
    .update({
      last_signature: cursor.lastSignature,
      last_slot: cursor.lastSlot,
      last_block_time: cursor.lastBlockTime,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) {
    throw new Error(`Failed to write cursor: ${error.message}`);
  }
}

export async function upsertChainNotes(
  client: SupabaseClient,
  rows: ChainNoteRow[],
): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await client
    .from("chain_notes")
    .upsert(rows, { onConflict: "signature" });
  if (error) {
    throw new Error(`Failed to upsert chain_notes: ${error.message}`);
  }
}
