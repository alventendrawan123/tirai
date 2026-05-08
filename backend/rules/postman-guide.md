# Postman Test Guide — Tirai Backend API

**Untuk:** Bima
**Dari:** Alven
**Last update:** 2026-05-08
**File collection:** [`postman-collection.json`](./postman-collection.json)

---

## TL;DR

Backend Tirai sekarang punya 2 jenis HTTP REST endpoint yang bisa di-test di Postman:

1. **Auth-server** (Railway) — `https://tirai-production.up.railway.app`
2. **Supabase REST** — `https://ahyezijhqlizwznhgnzh.supabase.co/rest/v1`

Catatan: **wallet signing flow tidak bisa full di Postman** (butuh Solana SDK ed25519 sign). Workaround: dapet JWT sekali via script kita, paste ke env Postman, baru test write endpoints.

---

## Setup (5 menit)

### 1. Import collection

Postman → **File → Import** → drag `postman-collection.json` (atau pilih file).

Akan otomatis bikin:
- Collection "Tirai Backend API"
- 4 folder requests
- 6 collection variables

### 2. Set environment variables

Di Postman, klik tab **Variables** di collection (atau ikon mata di pojok kanan atas).

Default values sudah ke-set:

| Variable | Default | Action |
|---|---|---|
| `AUTH_URL` | `https://tirai-production.up.railway.app` | ✅ leave |
| `SUPABASE_URL` | `https://ahyezijhqlizwznhgnzh.supabase.co` | ✅ leave |
| `SUPABASE_ANON_KEY` | `sb_publishable_m986...` | ✅ leave |
| `TIRAI_JWT` | `<paste later>` | ⏳ Step 3 |
| `BOUNTY_ID` | `<paste later>` | ⏳ after create |
| `APPLICATION_ID` | `<paste later>` | ⏳ after apply |

### 3. Get a JWT (one-time, manual)

Wallet signing requires Solana ed25519 sign — Postman tidak bisa. Workflow:

```powershell
$env:KEYPAIR_PATH="d:/tirai/test-wallets/devnet.json"
$env:SUPABASE_URL="https://ahyezijhqlizwznhgnzh.supabase.co"
$env:SUPABASE_ANON_KEY="sb_publishable_m986Yk1Qy86Zf2om4vD84g_wV0RNNOG"
$env:AUTH_VERIFIER_URL="https://tirai-production.up.railway.app"
pnpm -F @tirai/api test:bounty-flow
```

Script akan jalanin full e2e + print **Owner JWT** di Step 1 output. Cari baris:
```
   ✅ Owner JWT obtained (length 259)
```

⚠️ Script log JWT length doang, bukan value-nya. Untuk dapet JWT raw, ada 2 cara:

**Option A — Modify script sementara**: tambahin di test-bounty.ts setelah line 118:
```ts
console.log("JWT:", ownerSession.jwt);
```
Run script, copy JWT, hapus line.

**Option B — Use cURL/PowerShell langsung**: bypass script, panggil endpoint manual.

```powershell
# 1. Get challenge
$challenge = (irm -Method POST https://tirai-production.up.railway.app/auth/challenge).challenge

# 2. Sign challenge (PowerShell tidak bisa, butuh script Solana)
# Skip ini, pakai option A
```

Best for hackathon: **Option A — modify script print JWT, copy paste ke Postman**.

Setelah dapet JWT, paste ke env var `TIRAI_JWT` di Postman.

JWT TTL: 1 jam. Setelah expire, ulang Step 3.

---

## Test scenarios

### Scenario 1: Sanity check (no auth)

1. Open folder **"Health & Auth"**
2. Send request **`GET /health`** → expect 200, body `{ "status": "ok", "challenges": 0 }`
3. Send request **`POST /auth/challenge`** → expect 200, body `{ "challenge": "tirai-auth-...", "expiresAt": ... }`

Kalau 2 ini work = Railway server reachable.

### Scenario 2: Read public data (no auth needed)

Open folder **"Reads (Supabase REST direct — anon key)"**:

1. **`GET bounties (all open)`** → expect 200, array of bounty objects (atau `[]` kalau belum ada)
2. **`GET chain_notes (audit data)`** → expect 200, array of indexed Cloak transactions

Kalau ini work = Supabase + RLS public read OK.

### Scenario 3: Write bounty (need JWT)

1. Pastiin `TIRAI_JWT` env var udah ke-set (lihat Setup Step 3)
2. Open folder **"Bounty Writes"**
3. Send **`POST /bounties — create`**
   - Body sudah ada example, edit kalau perlu
   - Expected: 201 Created, body = bounty row dengan `id` UUID
4. **Copy `id` field** dari response → paste ke env var `BOUNTY_ID`
5. Send **`PATCH /bounties/:id — update status`** → expected 200, status berubah ke "paid"

### Scenario 4: Application flow

1. Send **`POST /bounties/:id/applications — apply`** dengan `BOUNTY_ID` yang udah di-set
   - Note: applicant_wallet auto-set dari JWT.sub. Kalau pakai JWT yang sama dengan owner, bakal tetep work (allowed apply ke own bounty for testing)
   - Untuk realistic test (different wallet apply), perlu JWT dari second wallet
2. **Copy `id` dari response** → paste ke env var `APPLICATION_ID`
3. Send **`PATCH /applications/:id — accept/reject`** → expected 200, status berubah

### Scenario 5: RLS security check

Open folder **"RLS Security Check (should FAIL with anon)"**:

1. Send **`POST bounty via Supabase anon (should 401)`**
2. Expected: **401 Unauthorized** dengan message "new row violates row-level security policy"

Kalau status 201 atau 200 = RLS BREACH, security hole. Kalau 401 = ✅ RLS bekerja, anon key memang gak boleh write.

---

## Common issues + fixes

### "JWT invalid or expired" (401 dari /bounties POST)

JWT 1 jam TTL habis. Re-run script untuk dapet JWT baru.

### "owner_wallet must equal auth.jwt() ->> sub" (saat update bounty)

JWT.sub kamu (wallet pubkey) bukan owner bounty itu. Kamu cuma boleh update bounty yang ke-create dengan JWT dari wallet sama.

### "duplicate key value violates unique constraint" (saat apply)

Wallet kamu sudah pernah apply ke bounty ini. UNIQUE constraint enforce 1 application per (bounty, applicant). Pakai wallet beda.

### Connection refused / timeout

Cek Railway dashboard — service `tirai` masih running? Cek logs `/health`.

---

## Postman collection structure

```
Tirai Backend API/
├── Health & Auth/
│   ├── GET /health
│   ├── POST /auth/challenge
│   └── POST /auth/verify (cannot test in Postman alone)
├── Bounty Writes/
│   ├── POST /bounties — create
│   ├── PATCH /bounties/:id — update status
│   ├── POST /bounties/:id/applications — apply
│   └── PATCH /applications/:id — accept/reject
├── Reads (Supabase REST direct)/
│   ├── GET bounties (all open)
│   ├── GET bounty by ID
│   ├── GET applications for bounty
│   └── GET chain_notes (audit data)
└── RLS Security Check (should FAIL)/
    └── POST bounty via Supabase anon (should 401)
```

---

## Faster alternative: smoke script

Kalau Postman setup terlalu ribet, **`pnpm -F @tirai/api test:bounty-flow`** udah cover semua 11 step e2e dalam 1 command, dengan output detailed. Postman cocok untuk debugging individual endpoint atau iterate body shapes.

---

## Pertanyaan?

Tag Alven di chat. Backend code references:
- Auth server: `backend/indexer/src/auth-server.ts`
- HTTP client: `backend/src/bounty/http-client.ts`
- Schema: `backend/indexer/schema-bounties.sql`
- Smoke script: `backend/scripts/test-bounty.ts`
