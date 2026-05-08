# Tirai Indexer

Long-running worker that polls the Cloak shield-pool program on Solana, extracts public chain data (encrypted notes + commitments + amounts), and writes to Supabase. The frontend's `/audit` page queries Supabase instead of doing a slow O(N) RPC scan.

## Privacy guarantees

- **Never receives viewing keys.** All decryption happens client-side in the browser.
- **Stores only public chain data**: signatures, slots, timestamps, encrypted ciphertext, commitments, public amounts. Anyone could derive these from chain themselves.
- **No recipient field stored.** The receiver of a withdraw is dropped during parsing.

## Architecture

```
[Solana devnet]
    ↑ getSignaturesForAddress + getTransaction
[Indexer (this code, runs on Railway)]
    ↓ INSERT
[Supabase Postgres]
    ↑ SELECT (anon key, RLS public read)
[@tirai/api scanAuditHistory in browser]
    → trial-decrypt with VK → AuditEntry[]
```

## Local dev

```bash
cd backend/indexer
pnpm install
cp .env.example .env
# fill .env with real values
pnpm dev
```

## Deploy to Railway

1. Push repo to GitHub (already done).
2. Railway → New Project → Deploy from GitHub Repo → select Tirai repo.
3. **Root directory**: `backend/indexer`.
4. Railway auto-detects Dockerfile.
5. Add env vars in Variables tab:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `SOLANA_RPC_URL`
   - (optional) `CLOAK_PROGRAM_ID`, `POLL_INTERVAL_MS`, `BATCH_SIZE`
6. Deploy. Logs should show `[indexer] cycle done` every 30s.

## Setup Supabase

1. Create project at supabase.com (Singapore region recommended).
2. SQL Editor → paste `schema.sql` → Run.
3. Settings → API:
   - Copy `Project URL` → `SUPABASE_URL`
   - Copy `anon public` → frontend env var (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - Copy `service_role` → indexer env var (`SUPABASE_SERVICE_KEY`) — **NEVER ship to frontend**

## Schema

See `schema.sql`. Two tables:
- `chain_notes` — one row per Cloak Transact instruction (public data)
- `indexer_cursor` — single-row resume cursor

RLS: `chain_notes` public READ, writes only via service role.

## Operations

- **Logs**: Railway dashboard → Deployments → Logs.
- **Metrics**: cycle duration, scanned signatures, inserted rows logged each tick.
- **Restart**: Railway auto-restarts on crash; cursor persists in DB so resume is automatic.
- **Reset**: To re-index from scratch, run in Supabase SQL Editor:
  ```sql
  TRUNCATE chain_notes;
  UPDATE indexer_cursor SET last_signature = NULL, last_slot = NULL, last_block_time = NULL WHERE id = 1;
  ```

## Caveats / known limitations

- Currently SOL pool only; SPL mint detection TBD (`mint` column null for now).
- Skip swap-specific recipient parsing (Tirai bounty model = deposit + withdraw only).
- If SDK updates instruction binary format, `src/parser.ts` and `src/constants.ts` must be re-synced. Ref: SDK index.js v0.1.5-devnet.1.
