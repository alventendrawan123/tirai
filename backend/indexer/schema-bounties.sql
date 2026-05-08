-- Tirai Bounty Feature schema migration
-- Run this in Supabase SQL Editor (separate from schema.sql which is for indexer).
-- Idempotent — safe to re-run.

-- =====================================================================
-- Table: bounties
-- Public bounty metadata. Created by owner via wallet JWT auth.
-- =====================================================================

CREATE TABLE IF NOT EXISTS bounties (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  description       TEXT NOT NULL CHECK (length(description) BETWEEN 1 AND 5000),
  reward_lamports   BIGINT NOT NULL CHECK (reward_lamports > 0),
  deadline          TIMESTAMPTZ NOT NULL,
  eligibility       TEXT,
  owner_wallet      TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'paid', 'expired', 'cancelled')),
  payment_signature TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bounties_status ON bounties(status);
CREATE INDEX IF NOT EXISTS idx_bounties_owner ON bounties(owner_wallet);
CREATE INDEX IF NOT EXISTS idx_bounties_deadline ON bounties(deadline);
CREATE INDEX IF NOT EXISTS idx_bounties_created ON bounties(created_at DESC);

-- =====================================================================
-- Table: applications
-- Researcher submissions to bounties. 1 application per researcher per bounty.
-- =====================================================================

CREATE TABLE IF NOT EXISTS applications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bounty_id         UUID NOT NULL REFERENCES bounties(id) ON DELETE CASCADE,
  applicant_wallet  TEXT NOT NULL,
  submission_text   TEXT NOT NULL CHECK (length(submission_text) BETWEEN 1 AND 5000),
  contact_handle    TEXT,
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(bounty_id, applicant_wallet)
);

CREATE INDEX IF NOT EXISTS idx_applications_bounty ON applications(bounty_id);
CREATE INDEX IF NOT EXISTS idx_applications_applicant ON applications(applicant_wallet);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

-- =====================================================================
-- Auto-update `updated_at` on row update
-- =====================================================================

CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bounties_set_updated_at ON bounties;
CREATE TRIGGER bounties_set_updated_at
  BEFORE UPDATE ON bounties
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS applications_set_updated_at ON applications;
CREATE TRIGGER applications_set_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

-- =====================================================================
-- Row Level Security
-- =====================================================================

ALTER TABLE bounties ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "bounties public read" ON bounties;
DROP POLICY IF EXISTS "bounties owner insert" ON bounties;
DROP POLICY IF EXISTS "bounties owner update" ON bounties;

DROP POLICY IF EXISTS "applications public read" ON applications;
DROP POLICY IF EXISTS "applications applicant insert" ON applications;
DROP POLICY IF EXISTS "applications applicant update own pending" ON applications;
DROP POLICY IF EXISTS "applications bounty owner update status" ON applications;

-- bounties: public can read, only owner (via JWT sub claim) can write
CREATE POLICY "bounties public read"
  ON bounties FOR SELECT
  USING (true);

CREATE POLICY "bounties owner insert"
  ON bounties FOR INSERT
  WITH CHECK (owner_wallet = (auth.jwt() ->> 'sub'));

CREATE POLICY "bounties owner update"
  ON bounties FOR UPDATE
  USING (owner_wallet = (auth.jwt() ->> 'sub'));

-- applications: public can read, applicant can insert + update own pending,
-- bounty owner can update status of applications to their bounty
CREATE POLICY "applications public read"
  ON applications FOR SELECT
  USING (true);

CREATE POLICY "applications applicant insert"
  ON applications FOR INSERT
  WITH CHECK (applicant_wallet = (auth.jwt() ->> 'sub'));

CREATE POLICY "applications applicant update own pending"
  ON applications FOR UPDATE
  USING (
    applicant_wallet = (auth.jwt() ->> 'sub')
    AND status = 'pending'
  );

CREATE POLICY "applications bounty owner update status"
  ON applications FOR UPDATE
  USING (
    bounty_id IN (
      SELECT id FROM bounties
      WHERE owner_wallet = (auth.jwt() ->> 'sub')
    )
  );

-- =====================================================================
-- Sanity check queries (run to verify):
--
-- SELECT count(*) FROM bounties;
-- SELECT count(*) FROM applications;
-- INSERT INTO bounties (title, description, reward_lamports, deadline, owner_wallet)
--   VALUES ('Test', 'Test desc', 10000000, now() + interval '7 days', '11111111111111111111111111111111');
--   ↑ Should FAIL with anon key (RLS blocks insert without JWT)
--   ↑ Should SUCCEED with service_role key
-- =====================================================================
