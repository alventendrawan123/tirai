-- Tirai Indexer schema for Supabase
-- Run this in Supabase SQL Editor after creating project.

-- =====================================================================
-- Table: chain_notes
-- One row per Cloak Transact / TransactSwap instruction we've indexed.
-- Stores public chain data + encrypted notes (PRIVACY-SAFE: nothing here
-- requires viewing key to extract; we never store decrypted contents).
-- =====================================================================

CREATE TABLE IF NOT EXISTS chain_notes (
  signature       TEXT PRIMARY KEY,
  slot            BIGINT NOT NULL,
  block_time      TIMESTAMPTZ NOT NULL,
  tx_type         SMALLINT NOT NULL,        -- 0=transact, 1=transactSwap
  public_amount   BIGINT NOT NULL,          -- signed: positive=deposit, negative=withdraw
  net_amount      BIGINT NOT NULL,          -- |public_amount| - fee for withdraw, public_amount for deposit
  fee             BIGINT NOT NULL DEFAULT 0,
  output_commitments JSONB NOT NULL DEFAULT '[]'::jsonb,  -- array of hex strings
  encrypted_notes    JSONB NOT NULL DEFAULT '[]'::jsonb,  -- array of base64 strings
  pool_address    TEXT,                     -- shielded pool PDA (frontend can derive mint)
  mint            TEXT,                     -- best-effort mint base58, NULL if unknown
  scanned_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chain_notes_block_time ON chain_notes(block_time DESC);
CREATE INDEX IF NOT EXISTS idx_chain_notes_tx_type ON chain_notes(tx_type);

-- =====================================================================
-- Table: indexer_cursor
-- Single-row table tracking the latest processed signature.
-- Indexer reads this on startup to resume; commits after successful batch.
-- =====================================================================

CREATE TABLE IF NOT EXISTS indexer_cursor (
  id              SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_signature  TEXT,
  last_slot       BIGINT,
  last_block_time TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO indexer_cursor (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- =====================================================================
-- Row Level Security
-- Public READ via anon key (frontend queries directly).
-- INSERT / UPDATE / DELETE only via service role key (indexer worker).
-- =====================================================================

ALTER TABLE chain_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE indexer_cursor ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "chain_notes public read" ON chain_notes;
DROP POLICY IF EXISTS "indexer_cursor public read" ON indexer_cursor;

CREATE POLICY "chain_notes public read"
  ON chain_notes FOR SELECT
  USING (true);

CREATE POLICY "indexer_cursor public read"
  ON indexer_cursor FOR SELECT
  USING (true);

-- Note: INSERT/UPDATE/DELETE intentionally have NO policy → only service_role
-- key (which bypasses RLS) can write. anon key can only read.

-- =====================================================================
-- Sanity check queries (run in SQL Editor to verify setup):
--
-- SELECT count(*) FROM chain_notes;
-- SELECT * FROM indexer_cursor;
-- SELECT block_time, tx_type, public_amount, net_amount FROM chain_notes
--   ORDER BY block_time DESC LIMIT 10;
-- =====================================================================
