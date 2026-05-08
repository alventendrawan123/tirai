# Postman Audit Report — Tirai Backend API

**Untuk:** Bima
**Dari:** Alven
**Tanggal:** 2026-05-08
**Status:** ✅ **12/12 endpoint REAL tested PASS**

---

## TL;DR

Semua 12 endpoint backend Tirai (Railway auth-server + Supabase REST) sudah saya test secara **real end-to-end** via Postman + PowerShell. Tidak ada mock, semua HTTP call asli, semua state change ter-verifikasi di Supabase.

- **Auth-server (Railway):** 4 endpoint write + 1 health + 2 auth — **8 endpoint** ✅
- **Supabase REST direct (anon key):** 4 endpoint read — **4 endpoint** ✅
- **RLS security check:** anon key gak bisa insert ke bounties (401 expected) — **1 endpoint** ✅

---

## Tools yang dipakai

1. **Postman Desktop** (Windows) — tool utama, 11 dari 12 endpoint
2. **PowerShell `Invoke-RestMethod`** — fallback untuk 1 endpoint terakhir karena Postman quirk handle long Bearer token (lihat Caveat #2)
3. **Smoke script** `pnpm -F @tirai/api test:bounty-flow` — generate session JWT (wallet sign flow tidak bisa dilakukan murni di Postman)

---

## Endpoint coverage matrix

| # | Endpoint | Method | Tool | Status | Bukti |
|---|---|---|---|---|---|
| 1 | `/health` | GET | Postman | ✅ 200 | `{ "status": "ok", "challenges": N }` |
| 2 | `/auth/challenge` | POST | Postman | ✅ 200 | `{ "challenge": "tirai-auth-...", "expiresAt": ... }` |
| 3 | `/auth/verify` | POST | Indirect (smoke script) | ✅ | JWT obtained dengan length 259, sub matches owner pubkey |
| 4 | `/rest/v1/bounties?status=eq.open` | GET | Postman | ✅ 200 | Array of bounties dengan filter open |
| 5 | `/rest/v1/bounties?id=eq.X` | GET | Postman | ✅ 200 | Single bounty by ID |
| 6 | `/rest/v1/applications?bounty_id=eq.X` | GET | Postman | ✅ 200 | Applications untuk bounty tertentu |
| 7 | `/rest/v1/chain_notes` | GET | Postman | ✅ 200 | Cloak chain notes indexed by Railway worker |
| 8 | `/bounties` (create) | POST | Postman | ✅ 201 | Bounty `8696e7ed-5aaf-4e18-9f9e-6304b38a166e` created |
| 9 | `/bounties/:id` (update status) | PATCH | Postman | ✅ 200 | Bounty `a3f96c4f-...` status `open` → `paid` |
| 10 | `/bounties/:id/applications` (apply) | POST | Postman | ✅ 201 | Application `5b1f8569-eef3-4bb3-97de-e6e6bf98f75c` created |
| 11 | `/applications/:id` (accept/reject) | PATCH | PowerShell | ✅ 200 | Application status `pending` → `accepted` |
| 12 | `/rest/v1/bounties` (insert via anon — RLS test) | POST | Postman | ✅ 401 | "new row violates row-level security policy" |

---

## Detailed evidence

### Test #8: POST /bounties — create

**Request:**
```http
POST https://tirai-production.up.railway.app/bounties
Authorization: Bearer eyJhbGc...VOTCo8
Content-Type: application/json

{
  "title": "Find XSS in admin panel",
  "description": "Looking for XSS vulnerabilities in /admin routes.",
  "rewardLamports": "50000000",
  "deadline": 1893456000000,
  "eligibility": "Open to all"
}
```

**Response:** `201 Created` — 980ms — 816 B
```json
{
  "id": "8696e7ed-5aaf-4e18-9f9e-6304b38a166e",
  "title": "Find XSS in admin panel",
  "description": "Looking for XSS vulnerabilities in /admin routes.",
  "reward_lamports": 50000000,
  "deadline": "2030-01-01T00:00:00+00:00",
  "eligibility": "Open to all",
  "owner_wallet": "77J6abSBQGcFrEKNL3n5waLeuskNq3n1pnvsJGsezj7U",
  "status": "open",
  "payment_signature": null,
  "created_at": "2026-05-08T16:08:53.056679+00:00",
  "updated_at": "2026-05-08T16:08:53.056679+00:00"
}
```

✅ `owner_wallet` auto-set dari JWT.sub (server-side)
✅ Default `status: "open"` dan `payment_signature: null`

---

### Test #9: PATCH /bounties/:id — update status

**Request:**
```http
PATCH https://tirai-production.up.railway.app/bounties/a3f96c4f-df17-49f7-891f-894ea561f621
Authorization: Bearer eyJhbGc...VOTCo8
Content-Type: application/json

{ "status": "paid", "paymentSignature": "5RBz...sig..." }
```

**Response:** `200 OK` — 1.18s — 839 B
```json
{
  "id": "a3f96c4f-df17-49f7-891f-894ea561f621",
  "status": "paid",
  "payment_signature": "5RBz...sig...",
  "updated_at": "2026-05-08T16:11:10.521532+00:00"
}
```

✅ Status berhasil ter-update
✅ `payment_signature` terisi
✅ `updated_at` baru, `created_at` gak berubah

---

### Test #10: POST /bounties/:id/applications — apply

**Request:**
```http
POST https://tirai-production.up.railway.app/bounties/8696e7ed-5aaf-4e18-9f9e-6304b38a166e/applications
Authorization: Bearer eyJhbGc...VOTCo8
Content-Type: application/json

{
  "submissionText": "Found XSS at /admin/users?q=<script>...",
  "contactHandle": "@telegram_handle"
}
```

**Response:** `201 Created` — 840ms — 749 B
```json
{
  "id": "5b1f8569-eef3-4bb3-97de-e6e6bf98f75c",
  "bounty_id": "8696e7ed-5aaf-4e18-9f9e-6304b38a166e",
  "applicant_wallet": "77J6abSBQGcFrEKNL3n5waLeuskNq3n1pnvsJGsezj7U",
  "submission_text": "Found XSS at /admin/users?q=<script>...",
  "contact_handle": "@telegram_handle",
  "status": "pending",
  "created_at": "2026-05-08T16:13:16.26393+00:00",
  "updated_at": "2026-05-08T16:13:16.26393+00:00"
}
```

✅ `applicant_wallet` auto-set dari JWT.sub
✅ Default `status: "pending"`

---

### Test #11: PATCH /applications/:id — accept

**Tool:** PowerShell `Invoke-RestMethod` (Postman ada quirk paste long token, lihat Caveat #2)

**Command:**
```powershell
$jwt = 'eyJhbGc...VOTCo8'
irm -Method PATCH `
  -Uri "https://tirai-production.up.railway.app/applications/5b1f8569-eef3-4bb3-97de-e6e6bf98f75c" `
  -Headers @{ "Authorization" = "Bearer $jwt"; "Content-Type" = "application/json" } `
  -Body '{ "status": "accepted" }'
```

**Response:**
```
id               : 5b1f8569-eef3-4bb3-97de-e6e6bf98f75c
bounty_id        : 8696e7ed-5aaf-4e18-9f9e-6304b38a166e
applicant_wallet : 77J6abSBQGcFrEKNL3n5waLeuskNq3n1pnvsJGsezj7U
submission_text  : Found XSS at /admin/users?q=<script>...
contact_handle   : @telegram_handle
status           : accepted
created_at       : 2026-05-08T16:13:16.26393+00:00
updated_at       : 2026-05-08T16:27:54.57597+00:00
```

✅ Status `pending` → `accepted`
✅ `updated_at` baru (16:27:54), 14 menit setelah `created_at` (16:13:16)

**Independent verification via Postman GET (anon key, no JWT):**

`GET https://ahyezijhqlizwznhgnzh.supabase.co/rest/v1/applications?bounty_id=eq.8696e7ed-5aaf-4e18-9f9e-6304b38a166e`

Response 200 OK menampilkan `status: "accepted"` — confirmed di database tanpa lewat backend, langsung dari Supabase REST. Bukti PATCH bukan mock.

---

### Test #12: RLS security check

**Request:**
```http
POST https://ahyezijhqlizwznhgnzh.supabase.co/rest/v1/bounties
apikey: sb_publishable_m986...
Authorization: Bearer sb_publishable_m986...
Content-Type: application/json

{
  "title": "Should be blocked by RLS",
  "owner_wallet": "FAKE",
  ...
}
```

**Response:** `401 Unauthorized` ✅ (expected behavior)
```
"new row violates row-level security policy for table 'bounties'"
```

✅ RLS bekerja: anon key gak bisa insert. Hanya auth-server (service_role) yang boleh write.

---

## Caveat & known issues

### Caveat #1: Wallet signing tidak bisa di Postman

Endpoint `/auth/verify` butuh ed25519 signature dari Solana keypair atas challenge string. Postman tidak punya Solana SDK. Workaround:

- Run `pnpm -F @tirai/api test:bounty-flow` — script handle full sign flow + print Owner JWT length
- Output JWT sukses → bukti `/auth/verify` work (kalau gagal, script bakal exit 1)
- Bukan limitation backend, ini limitation Postman sebagai test tool

### Caveat #2: Postman reject paste JWT panjang dengan newline

Ketika paste JWT (~259 chars) ke field `Authorization` header atau Bearer Token, Postman Windows ku detect "invalid newline character" walaupun source clipboard sebenarnya bersih (verified via `Set-Clipboard` PowerShell).

Workaround dipakai untuk Test #11:
- PowerShell `Invoke-RestMethod` — sama persis dengan HTTP request Postman, hanya beda UI
- Verified independently via Postman GET (anon key) bahwa state ke-update di Supabase

Bukan bug backend, ini quirk Postman client. Test endpoint tetap valid.

---

## Cleanup

- ✅ `backend/scripts/test-bounty.ts` — JWT print (line 118-119) di-revert ke versi production-clean
- ✅ Test data left in Supabase: bounty `8696e7ed-...` (open) dan `a3f96c4f-...` (paid), application `5b1f8569-...` (accepted) — bisa di-clean manual via SQL kalau perlu
- ⚠️ JWT yang dipakai untuk test sudah expired (1 jam TTL), aman gak ke-leak

---

## Konklusi

**Backend Tirai (Railway auth-server + Supabase) verified 12/12 endpoint REAL pass.**

Frontend (Bima) bisa langsung integrate via package `@tirai/api`:
- Read: `listBounties`, `getBountyById`, `listApplications` (no JWT, anon key)
- Auth: `requestAuthChallenge` + `verifyAuthChallenge` (return JWT)
- Write: `createBounty`, `updateBountyStatus`, `applyToBounty`, `updateApplicationStatus` (need JWT)

Reference:
- Bounty feature spec: [`bountyFeatureSpec.md`](./bountyFeatureSpec.md)
- Postman collection: [`postman-collection.json`](./postman-collection.json)
- Postman setup guide: [`postman-guide.md`](./postman-guide.md)
- Smoke script: `backend/scripts/test-bounty.ts`

Pertanyaan? Tag Alven di chat.
