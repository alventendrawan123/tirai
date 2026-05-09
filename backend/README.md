# Tirai Backend (`@tirai/api`)

The TypeScript wrapper around the Cloak SDK. Despite the directory name, this is **a library**, not a server — it ships as a workspace package consumed by `frontend/` over a pnpm symlink. The only piece that actually runs as a server is the `indexer/` subdirectory, which doubles as the Tirai auth-server on Railway.

Repo: https://github.com/alventendrawan123/tirai · Root README: [`../README.md`](../README.md)

---

## What lives here

```
backend/
├── src/                    @tirai/api — the library
│   ├── audit/              scanAuditHistory, exportAuditReport
│   ├── auth/               requestAuthChallenge, verifyAuthChallenge, jwt helpers
│   ├── bounty/             createBountyPayment, listBounties, applications, ...
│   ├── claim/              inspectClaimTicket, claimBounty
│   ├── ticket/             ticket encode/decode
│   ├── config/             Cloak program IDs, default RPC URLs
│   ├── lib/                Result helpers, error mapping, http client
│   ├── types/              shared API + error types
│   └── index.ts            single public entry point
│
├── indexer/                @tirai/indexer — the Railway worker
│   ├── src/
│   │   ├── index.ts        process entry — runs poller + auth-server in one process
│   │   ├── poller.ts       reads Cloak program tx history, writes to Supabase
│   │   ├── parser.ts       extracts public chain data from Cloak instructions
│   │   ├── auth-server.ts  HTTP server: /auth/*, /bounties/*, /applications/*, /health
│   │   ├── db.ts           Supabase client (service-role)
│   │   ├── constants.ts    program IDs, instruction discriminators
│   │   └── test-connection.ts
│   ├── schema.sql          chain_notes + indexer_cursor
│   ├── schema-bounties.sql bounties + applications tables (RLS public read)
│   └── Dockerfile          deployed to Railway
│
├── scripts/                ad-hoc runners (devnet wallet setup, smoke tests)
├── tests/                  vitest suites (unit-level, no real RPC)
├── rules/                  Postman collection + feature specs
├── package.json
└── README.md               ← you are here
```

> **Why two packages?** `@tirai/api` is pure library code — no I/O, no server. It can run anywhere a browser or Node process imports it. The `indexer/` subpackage is what actually has a process: it polls Solana, writes Supabase, and exposes the auth-server HTTP endpoints the frontend needs for bounty board mutations.

---

## Stack

- **TypeScript 5** · **Node ≥ 20** · **tsx** for direct .ts execution
- **`@cloak.dev/sdk-devnet`** — the cryptography
- **`@solana/web3.js`** + **`@solana/spl-token`** — chain interaction
- **`@supabase/supabase-js`** — bounty board metadata (server-side only)
- **`tweetnacl`** + **`bs58`** — Ed25519 signature verification on auth
- **`zod`** — runtime input validation
- **`pdf-lib`** — auditor report rendering
- **`vitest`** + **`biome`** — tests, lint, format

---

## Prerequisites

- **Node** ≥ 20 (Node 24 LTS fine)
- **pnpm** ≥ 9
- A **Supabase project** (Singapore region recommended; free tier is enough)
- A **Solana devnet RPC** — public works, Helius is faster
- *Only for indexer deploy:* a **Railway** account

---

## Install

The whole repo is one pnpm workspace. From the **repo root** (not from `backend/`):

```bash
git clone https://github.com/alventendrawan123/tirai.git
cd tirai
pnpm install   # installs frontend, backend, backend/indexer
```

`@tirai/api` is consumed by the frontend via the workspace symlink in `pnpm-workspace.yaml` — no build step is required for the frontend to pick up changes.

---

## Local dev (library only)

The library is exercised either through the frontend, through unit tests, or through the smoke scripts under `scripts/`.

```bash
# from backend/
pnpm typecheck       # tsc --noEmit
pnpm lint            # biome check
pnpm format          # biome format --write
pnpm test            # vitest run (audit, bounty, claim, ticket suites)
pnpm test:watch      # vitest watch mode
```

### Smoke / integration scripts

These talk to real Solana devnet. They write a fresh keypair to `../test-wallets/` (gitignored) and airdrop ≤ 2 SOL.

```bash
# Verify @cloak.dev/sdk-devnet exports + constants are reachable
pnpm test:install

# Generate ../test-wallets/devnet.json (1 SOL airdrop, capped exposure)
pnpm setup:devnet

# Check the funded wallet's balance
pnpm check:devnet

# End-to-end smoke tests (each is one Cloak interaction)
pnpm test:bounty           # transact() deposit
pnpm test:claim            # fullWithdraw() against an existing ticket
pnpm test:audit            # scanAuditHistory() against a viewing key
pnpm test:bounty-flow      # full create → claim → audit pipeline
```

> **Safety**: the devnet keypair is intentionally written to disk because devnet SOL has no value. The `setup-devnet-wallet.ts` script refuses to overwrite without `--force`. Never copy that pattern into anything that touches mainnet.

---

## Indexer / auth-server (the only actual server)

`backend/indexer/` runs **two things in one Node process**:

1. **Indexer poller** — every 30s, reads new transactions hitting the Cloak Shield Pool program, parses them with `src/parser.ts`, and inserts the public chain data into Supabase (`chain_notes` table). Never touches viewing keys.
2. **Auth-server HTTP** — Hono-style HTTP routes under `src/auth-server.ts`:
   - `POST /auth/challenge` → returns a 5-min challenge string
   - `POST /auth/verify` → verifies the wallet-signed challenge, returns a JWT (HS256, 1h TTL)
   - `POST /bounties` (auth required)
   - `PATCH /bounties/:id` (owner only)
   - `POST /bounties/:id/applications` (auth required)
   - `PATCH /applications/:id` (applicant for own; owner for any)
   - `GET /health`

> **Why the auth-server exists**: Supabase migrated their built-in auth to asymmetric ECDSA JWTs, which makes our wallet-signed HS256 JWTs incompatible with Supabase RLS. We bypass that by writing through a server that holds the **service-role** key and verifies caller identity itself. Public reads still go straight from the browser to Supabase via the anon key — only writes go through this server.

### Local dev (indexer)

```bash
cd backend/indexer
cp .env.example .env
# Fill in:
#   SUPABASE_URL=https://YOUR_PROJECT.supabase.co
#   SUPABASE_SERVICE_KEY=eyJ... (service_role key — NEVER ship to frontend)
#   SOLANA_RPC_URL=https://api.devnet.solana.com
#   AUTH_JWT_SECRET=<64+ random bytes>
#   PORT=8080
#   POLL_INTERVAL_MS=30000   (optional, default 30s)
#   BATCH_SIZE=100           (optional, default 100 sigs per tick)
#   CLOAK_PROGRAM_ID=...     (optional, defaults to devnet)

pnpm dev          # tsx watch — recompiles on save
pnpm start        # tsx without watch
pnpm test:connection   # one-shot Supabase + RPC reachability check
```

Logs you should see on a healthy startup:

```
[auth-server] listening on :8080
[indexer] cycle done — scanned 0 sigs, inserted 0 rows in 412ms
```

### Supabase setup

1. Create a project at https://supabase.com (Singapore region recommended).
2. **SQL Editor** → paste **both** schemas, in order:
   - `backend/indexer/schema.sql` — `chain_notes` + `indexer_cursor`
   - `backend/indexer/schema-bounties.sql` — `bounties` + `applications` (with RLS public-read policies)
3. **Settings → API**, copy:
   - `Project URL` → `SUPABASE_URL` (used by indexer **and** frontend proxy)
   - `anon public` → frontend's server-only `SUPABASE_ANON_KEY` (frontend reads through `/api/supabase/*` proxy)
   - `service_role` → indexer's `SUPABASE_SERVICE_KEY` — **NEVER ship to frontend**

### Deploying to Railway

The indexer ships with a Dockerfile and is deployed at https://tirai-production.up.railway.app for the shared dev environment.

1. **Railway → New Project → Deploy from GitHub Repo** → pick the Tirai repo.
2. **Service settings**:
   - **Root Directory**: `backend/indexer`
   - Railway auto-detects the `Dockerfile` — no buildpack needed.
3. **Variables** tab — paste in:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `SOLANA_RPC_URL`
   - `AUTH_JWT_SECRET` (generate with `openssl rand -hex 64`)
   - `PORT=8080`
   - *Optional*: `CLOAK_PROGRAM_ID`, `POLL_INTERVAL_MS`, `BATCH_SIZE`
4. **Networking** → enable a public domain. Use that domain as `AUTH_VERIFIER_URL` in the frontend's `.env.local`.
5. **Deploy**. Logs should show the same "auth-server listening" + "cycle done" pair within ~10 seconds.

### Operating the indexer

| Action | How |
|---|---|
| Logs | Railway dashboard → Deployments → Logs |
| Restart | Auto on crash. Cursor is persisted in `indexer_cursor` so resume is automatic. |
| Re-index from zero | `TRUNCATE chain_notes; UPDATE indexer_cursor SET last_signature=NULL, last_slot=NULL, last_block_time=NULL WHERE id=1;` |
| Bump RPC | Change `SOLANA_RPC_URL` in Railway → redeploy |
| Rotate JWT secret | New `AUTH_JWT_SECRET` → redeploy → all existing JWTs invalidated |

---

## How `@tirai/api` is consumed by the frontend

The frontend's adapters import from this package directly via the workspace name:

```ts
// frontend/src/features/bounty-board/adapters/bounty.adapter.ts
import { listBounties, createBounty, /* ... */ } from "@tirai/api";
```

Two boundaries to remember:

- **Pure SDK calls** (`listBounties`, `getBountyById`, `listApplications`, `scanAuditHistory`, `inspectClaimTicket`) take a Supabase URL + anon key and run client-side. The frontend points them at `/api/supabase/*` so the upstream URL never reaches the bundle.
- **Auth-required mutations** (`createBounty`, `applyToBounty`, `updateBountyStatus`, `updateApplicationStatus`) take an `authVerifierUrl` + JWT. The frontend points them at `/api/auth/*`.
- **Cloak-signing flows** (`createBountyPayment`, `claimBounty`) take a `Signer` interface implemented by `@solana/wallet-adapter-react`. The user's wallet signs, the SDK builds the proof, the chain confirms.

Adapters in the frontend wrap each of these in `safeAdapter()` to convert thrown errors into the discriminated `Result<T, AppError>` type.

---

## Privacy invariants this package enforces

- **Viewing keys never reach `indexer/` or any server.** All trial-decryption happens in the browser inside `scanAuditHistory`. The indexer only stores public ciphertext.
- **Recipient wallets are not stored anywhere.** The withdraw-side parser intentionally drops the receiver field. `chain_notes` has no recipient column.
- **Service-role key stays server-side.** Only the indexer process holds `SUPABASE_SERVICE_KEY`. The frontend uses the public anon key (and even that is hidden behind the proxy).
- **JWT is HS256, 1h TTL, scoped to a wallet pubkey.** The auth-server is the only verifier. Supabase RLS is configured to public-read; writes are gated by the auth-server, not by Supabase RLS.

---

## Tests + reference material

- `backend/tests/` — vitest suites for `audit`, `bounty`, `claim`, `ticket`. Run with `pnpm test`.
- `backend/rules/postman-collection.json` — importable Postman collection for the auth-server + Supabase reads.
- `backend/rules/postman-guide.md` — step-by-step guide for using the collection.
- `backend/rules/auditPostman.md` — full endpoint reference (12 endpoints).
- `backend/rules/bountyFeatureSpec.md` — bounty board feature spec.

---

## Common issues

- **`Supabase RLS error: No suitable key or wrong key type`** — you tried to write to Supabase with the auth-server's HS256 JWT. Writes have to go through the auth-server's service-role pathway, not directly. Double-check the frontend hook is hitting `/api/auth/*` and not `/api/supabase/*`.
- **`indexer cycle done — scanned 0 sigs` forever** — `SOLANA_RPC_URL` is unreachable, or `CLOAK_PROGRAM_ID` is wrong. `pnpm test:connection` from `backend/indexer/` will tell you which.
- **`401 invalid signature` on `/auth/verify`** — the wallet signed the wrong challenge string. The frontend posts the exact challenge from `/auth/challenge` — make sure no whitespace was added.
- **`Cannot find module '@tirai/api'` in frontend** — `pnpm install` from the **repo root**, not from `frontend/`. The workspace symlink only resolves from root.

---

## License

MIT
