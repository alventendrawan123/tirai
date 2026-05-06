# Update untuk Bima — backend `@tirai/api` ready (Hari 1–3)

**Dari:** Alven · **Update terakhir:** 2026-05-07 · **Status backend:** Hari 1–5 done, semua fungsi public real (no more stubs)

---

## TL;DR

Backend full implementation complete. Semua 5 fungsi public real, no more stubs. End-to-end devnet test PASS untuk `/audit`: deposit → `scanAuditHistory` (recover entry via viewing key) → `exportAuditReport` (CSV + PDF rendered). Privacy invariant verified: `recipient` field di-strip dari output, no leak ke caller. Sekarang **all 3 halaman frontend (`/pay`, `/claim`, `/audit`)** punya real backend behind them.

---

## 1. Install ke frontend

Pastikan `pnpm-workspace.yaml` di root sudah include `backend`:

```yaml
packages:
  - frontend
  - backend
```

Lalu di `frontend/`:

```bash
cd frontend
pnpm add @tirai/api@workspace:*
```

Re-run `pnpm install` dari root kalau workspace belum ke-link.

---

## 2. Import surface

```ts
// Functions
import {
  createBountyPayment,
  inspectClaimTicket,
  claimBounty,
  scanAuditHistory,
  exportAuditReport,
} from "@tirai/api";

// Types — semua sesuai instruction.md §5
import type {
  Cluster,
  ClaimTicket,
  Result,
  Signer,
  ProgressStep,
  ProgressEmitter,
  AppError,
  CreateBountyPaymentInput,
  BountyContext,
  BountyPaymentResult,
  ClaimBountyInput,
  ClaimBountyResult,
  ClaimContext,
  ClaimWalletMode,
  ClaimTicketPreview,
  InspectContext,
  AuditEntry,
  AuditHistory,
  AuditSummary,
  AuditContext,
  ScanAuditInput,
} from "@tirai/api";

// Atau pakai subpath
import type { AppError } from "@tirai/api/types";
```

---

## 3. Status per fungsi

| Fungsi                | Status               | Behavior sekarang                                                              |
| --------------------- | -------------------- | ------------------------------------------------------------------------------ |
| `createBountyPayment` | ✅ **REAL** (Hari 3) | Hit Cloak devnet, return signature + ticket + viewing key                      |
| `inspectClaimTicket`  | ✅ **REAL** (Hari 4) | Decode + `verifyUtxos` nullifier check, returns `isClaimable` boolean          |
| `claimBounty`         | ✅ **REAL** (Hari 4) | Decode + `fullWithdraw`, fresh + existing modes (relay submits, no signing)    |
| `scanAuditHistory`    | ✅ **REAL** (Hari 5) | Decode VK + `scanTransactions`, **drop `recipient` field**, return AuditHistory |
| `exportAuditReport`   | ✅ **REAL** (Hari 5) | CSV (hand-built, no `recipient`) + PDF (pdf-lib, paginated)                    |

**Action untuk kamu:** wire **all 5 adapter** sekarang dengan signature persis di atas. Tidak ada stub yang tersisa — frontend `/pay` + `/claim` + `/audit` semua bisa dipanggil dengan real chain interaction.

---

## 4. Contoh wiring `/pay` (real, sudah bisa test)

```ts
// frontend/src/features/bounty/adapters/bounty.adapter.ts
import { createBountyPayment } from "@tirai/api";
import type { Connection } from "@solana/web3.js";
import type { WalletContextState } from "@solana/wallet-adapter-react";

export async function payBountyAdapter(
  connection: Connection,
  wallet: WalletContextState,
  input: { amountSol: number; label: string; memo?: string },
) {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error("Wallet not connected");
  }

  return createBountyPayment(
    {
      amountBaseUnits: BigInt(Math.floor(input.amountSol * 1_000_000_000)),
      label: input.label,
      ...(input.memo !== undefined ? { memo: input.memo } : {}),
    },
    {
      connection,
      payer: {
        publicKey: wallet.publicKey,
        signTransaction: wallet.signTransaction,
      },
      cluster: "devnet",
      onProgress: (step, detail) => {
        // Emit ke ProgressDialog: "validate" | "generate-proof" | "submit" | "confirm" | "done"
        console.log(step, detail);
      },
    },
  );
}
```

**Catatan:**

- `amountBaseUnits` selalu `bigint` — jangan kirim `number`. Multiply di boundary.
- `payer` cuma butuh `publicKey` + `signTransaction` — wallet adapter compatible.
- `cluster: "devnet"` selama hackathon. Mainnet baru di Hari 6.
- `onProgress` opsional tapi **wajib** untuk UX — proof gen ~3-5s (atau ~30s tanpa native bindings).

Return shape (kalau `ok: true`):

```ts
{
  ticket: {
    raw: "eyJ2IjoxLCJjIjoi...",  // ~447 chars base64url, render ke QR
    version: 1,
    cluster: "devnet",
    createdAt: 1715000000000,    // unix ms
  },
  viewingKey: "5a63592b8b938026...",  // 64 hex chars, share ke auditor off-chain
  signature: "46BExTo5gRky...",        // Solana tx, link ke Solscan
  feeLamports: 5030000n,               // bigint, render via formatLamports
}
```

---

## 4b. Contoh wiring `/claim` (real, baru ship di Hari 4)

`/claim` punya **dua mode**: `fresh` (researcher belum punya wallet — kita generate satu) dan `existing` (researcher pakai wallet adapter yang sudah connected). Public surface sama persis dengan stub sebelumnya — tinggal swap behavior di adapter.

### Step 1: inspect (preview)

```ts
// frontend/src/features/claim/adapters/inspect.adapter.ts
import { inspectClaimTicket } from "@tirai/api";
import type { Connection } from "@solana/web3.js";

export async function inspectTicketAdapter(
  connection: Connection,
  ticketRaw: string,
) {
  return inspectClaimTicket(ticketRaw, { connection, cluster: "devnet" });
}
```

Return (`ok: true`):

```ts
{
  amountLamports: 10_000_000n,  // bigint
  tokenMint: null,              // null = native SOL, else base58
  label: "claim-smoke",
  isClaimable: true,            // false kalau nullifier sudah consumed
}
```

**Pakai `isClaimable` untuk gate UI:** disable tombol "Claim" + tampilkan "Already claimed" kalau `false`. Function ini pure read-only — tidak ada signing.

### Step 2: claim (fresh mode — researcher tanpa wallet)

```ts
// frontend/src/features/claim/adapters/claim.adapter.ts
import { claimBounty } from "@tirai/api";
import type { Connection } from "@solana/web3.js";

export async function claimFreshAdapter(
  connection: Connection,
  ticketRaw: string,
) {
  return claimBounty(
    { ticket: ticketRaw, mode: { kind: "fresh" } },
    {
      connection,
      cluster: "devnet",
      onProgress: (step) => console.log(step),
    },
  );
}
```

Return (`ok: true`, `mode: "fresh"`):

```ts
{
  mode: "fresh",
  destination: "6VBr1nXVzVbEeBToDHf2PFDPEK15yHeCa7xDHWH1NFY4",  // base58
  secretKey: Uint8Array(64),  // ⚠ HANYA expose ke SaveKeyDialog, jangan log/persist
  signature: "2LcuAyJ5...",   // withdraw tx, link ke Solscan
}
```

### Step 3: claim (existing mode — researcher punya wallet)

```ts
export async function claimExistingAdapter(
  connection: Connection,
  wallet: WalletContextState,
  ticketRaw: string,
) {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error("Wallet not connected");
  }

  return claimBounty(
    {
      ticket: ticketRaw,
      mode: {
        kind: "existing",
        signer: {
          publicKey: wallet.publicKey,
          signTransaction: wallet.signTransaction,
        },
      },
    },
    { connection, cluster: "devnet" },
  );
}
```

Return (`ok: true`, `mode: "existing"`):

```ts
{
  mode: "existing",
  destination: "<wallet-pubkey-base58>",
  signature: "...",
}
```

**Catatan penting `claimBounty`:**

- **No signing happens.** Cloak relay submits the tx and pays gas — `signTransaction` di mode `existing` bukan dipanggil saat ini, kita cuma butuh `publicKey`. Tetap accept full Signer interface biar konsisten dengan `/pay`.
- **`signer.publicKey` jadi destination address.** Researcher receives unshielded SOL/SPL di alamat itu.
- **Fee dipotong dari amount.** User deposit 0.01 SOL → researcher receive ~0.00497 SOL (fixed 5M + variable 0.3% × amount).
- **Fresh mode `secretKey` lifecycle:** lihat §5 — display sekali, copy ke password manager, zero-out. Jangan masuk localStorage / Sentry / state global.

---

## 4c. Contoh wiring `/audit` (real, baru ship di Hari 5)

`/audit` punya 2 fungsi: `scanAuditHistory` (auditor kasih VK, dapat list AuditEntry) + `exportAuditReport` (download CSV/PDF). Semua read-only, no signing.

### Step 1: scan via viewing key

```ts
// frontend/src/features/audit/adapters/audit.adapter.ts
import { scanAuditHistory } from "@tirai/api";
import type { Connection } from "@solana/web3.js";

export async function scanAuditAdapter(
  connection: Connection,
  viewingKey: string,
) {
  return scanAuditHistory(
    { viewingKey },
    {
      connection,
      cluster: "devnet",
      // Optional perf knobs (default sudah safe untuk free-tier RPC):
      // limit: 200,           // max signatures to scan
      // batchSize: 3,         // RPC parallelism — default 3 fits Helius/QuickNode free tier
      // untilSignature: ...,  // resume from last scan for incremental updates
      // afterTimestamp: ...,  // filter older than X ms
    },
  );
}
```

Return (`ok: true`):

```ts
{
  entries: [
    {
      timestamp: 1715000000000,
      amountLamports: 10_000_000n,
      tokenMint: null,           // null = native SOL, base58 = SPL
      label: "",                 // ⚠ empty — tidak on-chain (lihat catatan)
      status: "deposited",       // "deposited" | "claimed" | "expired"
      signature: "3bdWnz3LpkbP...",
    },
    // ... more entries
  ],
  summary: {
    totalPayments: 1,
    totalVolumeLamports: 10_000_000n,
    latestActivityAt: 1715000000000,
  },
}
```

### Step 2: export ke CSV/PDF

```ts
import { exportAuditReport } from "@tirai/api";

export async function exportAuditCsv(history: AuditHistory) {
  const result = await exportAuditReport(history, "csv");
  if (!result.ok) throw new Error(result.error.kind);
  // result.value adalah Blob — trigger download:
  const url = URL.createObjectURL(result.value);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tirai-audit-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
```

PDF flow sama, tinggal ganti `"csv"` → `"pdf"` dan ekstensi file.

**Catatan penting `scanAuditHistory`:**

- **`label` selalu empty.** Label hanya ada di ticket envelope (off-chain), tidak di-embed ke chain note. Auditor tidak bisa recover label dari chain. Frontend bisa correlate signature ↔ label via project's local bookkeeping kalau diperlukan.
- **`AuditEntry.recipient` TIDAK ADA.** Sengaja di-strip dari SDK output (privacy boundary 3 — auditor tidak boleh tau alamat researcher). CSV header juga gak punya kolom `recipient`.
- **Free-tier RPC bisa lambat.** Default `batchSize: 3` fit Helius/QuickNode free tier (~10 RPS). Smoke test devnet dengan 200 sig limit selesai ~60-90s. Untuk paid RPC (Helius Developer $49/mo), set `batchSize: 20-50` untuk speedup.
- **Status enum:** `"deposited"` (deposit ke pool) atau `"claimed"` (withdraw dari pool). `"expired"` reserved tapi belum di-emit (UTXO gak expire on-chain — kalau project mau decorate "expired", lakukan client-side berdasarkan policy off-chain).
- **Empty result OK.** Kalau VK belum pernah dipakai deposit, `entries: []` + `summary.totalPayments: 0` — `exportAuditReport` tetap bisa generate PDF/CSV dengan summary "0 entries".

---

## 5. Privacy invariants — JANGAN DILANGGAR (rules.md §0, §12, §15)

Saat wire adapter/UI, hindari:

| ❌ Jangan                                                   | ✅ Lakukan                                                        |
| ----------------------------------------------------------- | ----------------------------------------------------------------- |
| `localStorage.setItem("ticket", ...)`                       | Tampilkan ticket di QR + copy button, biarkan user yang persist   |
| `console.log(viewingKey)` di prod                           | Redact ke `vk_••••` di logger, atau jangan log sama sekali        |
| Sentry breadcrumb yang carry `secretKey` (claim fresh mode) | Filter di `services/logger.ts`, never send                        |
| Render alamat tujuan researcher di `/audit`                 | `AuditEntry` memang **tidak punya** field destination — by design |
| Submit ticket/VK ke server kita                             | Tidak ada server. Cuma RPC ke Solana via `@solana/web3.js`        |

`Uint8Array` `secretKey` dari `claimBounty` mode `fresh` cuma boleh:

- Render di `<SaveKeyDialog>` sebagai mnemonic/base58 untuk user copy ke password manager
- Setelah dialog ditutup → zero out (`secretKey.fill(0)`)
- Tidak masuk state global, tidak masuk URL, tidak masuk telemetry

---

## 6. Devnet smoke evidence

### Hari 3 — `createBountyPayment` (deposit only)

```
Wallet pubkey:    77J6abSBQGcFrEKNL3n5waLeuskNq3n1pnvsJGsezj7U
Deposit tx:       46BExTo5gRkyCMixFDFxExH6ipQCGiExYPLwgMrEWrxuFEWMuk4GdcyiArzsDbaWRLbmRju3NumGeynqJgxATfZo
Solscan:          https://solscan.io/tx/46BExTo5gRkyCMixFDFxExH6ipQCGiExYPLwgMrEWrxuFEWMuk4GdcyiArzsDbaWRLbmRju3NumGeynqJgxATfZo?cluster=devnet
Cloak program:    Zc1kHfp4rajSMeASFDwFFgkHRjv7dFQuLheJoQus27h
Amount:           0.01 SOL
Fee:              0.00503 SOL (5M fixed + 0.3% × 10M = 30k variable)
Viewing key len:  64 hex chars (32 bytes nk)
Ticket raw len:   447 chars base64url
```

### Hari 4 — full e2e (`pay → inspect → claim → re-inspect`)

```
Deposit tx:       5eyfGuC9SPKbmbZqebvSiUZUo3vKpgQuboWsHGGamNogDGgAxc4jGyZDzzmHw1HuEiDiG784cp5QkQMRrdh3Ev52
                  https://solscan.io/tx/5eyfGuC9SPKbmbZqebvSiUZUo3vKpgQuboWsHGGamNogDGgAxc4jGyZDzzmHw1HuEiDiG784cp5QkQMRrdh3Ev52?cluster=devnet

Inspect (pre):    isClaimable: true   ← nullifier belum consumed

Withdraw tx:      2LcuAyJ5mFZ31EUAuU5kQR3BwTBXm1C8BRK4Yzj82iFFPuafhfrn8ZhK7pYEuEUqAHNvLrk7gVXtzyobwX1KM1dd
                  https://solscan.io/tx/2LcuAyJ5mFZ31EUAuU5kQR3BwTBXm1C8BRK4Yzj82iFFPuafhfrn8ZhK7pYEuEUqAHNvLrk7gVXtzyobwX1KM1dd?cluster=devnet
Mode:             fresh
Destination:      6VBr1nXVzVbEeBToDHf2PFDPEK15yHeCa7xDHWH1NFY4 (fresh keypair)
Net received:     0.00497 SOL (= 0.01 deposit − 0.00503 fee)

Inspect (post):   isClaimable: false  ← nullifier consumed, ticket dead
```

### Hari 5 — full e2e (`pay → scan → export CSV+PDF`)

```
Deposit tx:       3bdWnz3LpkbP8VsQb4QduKdV7mwBTY86hhDK6hacC8vA11tPvH17LWUKxGrTenqfKHHdpDrsZwR13wqW26t4utNd
                  https://solscan.io/tx/3bdWnz3LpkbP8VsQb4QduKdV7mwBTY86hhDK6hacC8vA11tPvH17LWUKxGrTenqfKHHdpDrsZwR13wqW26t4utNd?cluster=devnet

Scan via VK:      Total payments: 1
                  Latest activity: 2026-05-06T17:03:14.190Z
                  1 entry: deposited, 10_000_000 lamports, sig 3bdWnz3LpkbP...

Privacy check:    ✅ no 'recipient' field in any entry

CSV exported:     199 bytes, header: timestamp_iso,status,amount_lamports,token_mint,label,signature
PDF exported:     1416 bytes, magic %PDF-1.7, "Tirai Audit Report" + 1-row table
```

Wallet payer ada di `test-wallets/devnet.json` (gitignored). Kalau kamu mau run sendiri di backend, minta saya share secret key via channel aman (atau generate sendiri pakai `pnpm setup:devnet`).

```bash
# Pay only
pnpm test:bounty

# Full e2e (pay → inspect → claim → re-inspect)
pnpm test:claim                    # default mode=fresh
CLAIM_MODE=existing pnpm test:claim # withdraw to payer wallet itself

# Full e2e audit (deposit + scan + export CSV/PDF)
# Requires Helius/QuickNode RPC for fast scan — public devnet RPC akan 429 storm
SOLANA_RPC_URL="https://devnet.helius-rpc.com/?api-key=YOUR_KEY" pnpm test:audit
```

---

## 7. Quirks / gotchas yang harus diingat

### `verbatimModuleSyntax` di backend

Semua type-only import dari `@tirai/api` **harus** pakai `import type`:

```ts
// ✅ benar
import { createBountyPayment } from "@tirai/api";
import type { AppError, Result } from "@tirai/api";

// ❌ salah — akan kena lint error di backend kalau merge ulang
import { createBountyPayment, AppError, Result } from "@tirai/api";
```

Frontend kamu mungkin tidak strict ini, tapi konsisten saja biar gampang.

### `exactOptionalPropertyTypes`

Jangan pass `undefined` ke optional fields. Kalau `memo` opsional, conditional spread:

```ts
// ✅ benar
{ ...(memo !== undefined ? { memo } : {}) }

// ❌ akan TS error
{ memo: memo /* memo: string | undefined */ }
```

### `bigint` di amount

Solana web3.js banyak pakai `number`, Cloak SDK pakai `bigint`. Boundary:

- User input → `number` (UI)
- Convert ke `bigint` di adapter
- `@tirai/api` semua `bigint`

### Devnet program ID berbeda dari mainnet

- Devnet: `Zc1kHfp4rajSMeASFDwFFgkHRjv7dFQuLheJoQus27h` ← yang kita pakai
- Mainnet: `zh1eLd6rSphLejbFfJEneUwzHRfMKxgzrgkfwA6qRkW` ← belum verified, jangan dipakai sampai Hari 6

Kalau di `frontend/src/config/cloak.ts` masih hardcode mainnet ID, **update ke devnet** untuk Phase 4 testing.

### Native bindings (perf)

Saat ini proof gen pakai pure-JS fallback (~30s per deposit). Saya akan run `pnpm approve-builds` di root setelah ini supaya turun ke ~3-5s. Re-run `pnpm install` di frontend juga setelahnya supaya kamu dapat binary yang sama.

### RPC requirement untuk `/audit`

`scanAuditHistory` ngirim banyak `getTransaction` calls sekaligus untuk decrypt chain notes. Public devnet RPC (`api.devnet.solana.com`) **tidak cocok** untuk ini — rate limit ketat (~1 RPS effectively) → 429 storm tanpa progress.

**Production-safe defaults sudah di-bake-in:** `batchSize: 3` (override kalau RPC paid). Smoke test dengan Helius free tier (10 RPS) tetap kena banyak 429 retry tapi SDK auto-recover via exponential backoff — eventually selesai dalam 60-90 detik untuk 200 sigs. Untuk UX production-grade, frontend perlu paid RPC (Helius Developer $49/mo, atau QuickNode/Triton equivalent).

Untuk demo hackathon: prepare 1-2 entries di history, scan akan complete ~1-2 menit. Cukup untuk recording.

---

## 8. Roadmap

| Hari | Deliverable                                                     | Status |
| ---- | --------------------------------------------------------------- | ------ |
| 1–3  | Types + ticket encode/decode + `createBountyPayment`            | ✅ done |
| 4    | `inspectClaimTicket` + `claimBounty` (fresh + existing) + e2e   | ✅ done |
| 5    | `scanAuditHistory` + `exportAuditReport` (PDF + CSV) + e2e      | ✅ done |
| 6    | Mainnet rehearsal (deposit kecil, demo evidence)                | ⏳ next |

Backend implementation done. Tinggal mainnet rehearsal sebelum demo.

Kabari saya di chat begitu Phase 4 `/pay` + `/claim` + `/audit` kamu wired up — saya bantu debug kalau ada mismatch.

---

## 9. Open questions yang butuh konfirmasi kamu

1. **Status enum di `AuditEntry`** — saya pakai `"deposited" | "claimed" | "expired"` per instruction.md §4.4 (sudah implemented). Mock kamu di `audit.types.ts` masih `"confirmed" | "pending" | "failed"` — perlu align ke kontrak. **`"expired"` saat ini tidak pernah di-emit** (UTXO gak expire on-chain) — kalau frontend mau decorate "expired" badge, lakukan client-side berdasarkan policy off-chain (e.g. >30 hari sejak deposit & belum claimed).

2. **`secretKey` format di `BountyPaymentResult` mode fresh** — saya return `Uint8Array` (raw 64-byte ed25519 secret). Kamu butuh format lain untuk SaveKeyDialog (base58? hex? mnemonic)? Kalau iya, conversion lebih cocok di frontend.

3. **Display field di `BountyPaymentResult`** — saya cuma return `ticket`, `viewingKey`, `signature`, `feeLamports`. Apakah `/pay` butuh field lain (misal `explorerUrl` pre-built, atau `createdAt`)? Saya bisa tambah kapan aja.

4. **Devnet program ID di frontend config** — apakah `frontend/src/config/cloak.ts` sudah update ke `Zc1kHfp...`? Kalau belum, tolong update sebelum mulai Phase 4 testing.

5. **RPC config di frontend** — `/audit` page perlu RPC yang lebih kuat dari public devnet untuk scan workload. Setup `VITE_SOLANA_RPC_URL` env var di frontend untuk pakai Helius/QuickNode endpoint, fallback ke public RPC (yang bakal lambat tapi tetep jalan via auto-retry).

Reply di chat atau create issue di repo untuk async resolve.

---

**Verifikasi yang bisa kamu run sekarang:**

```bash
# Dari root
pnpm install
pnpm -F @tirai/api typecheck     # 0 errors expected
pnpm -F @tirai/api test          # 25/25 tests pass (8 ticket + 3 bounty + 4 claim + 10 audit)
pnpm -F @tirai/api lint          # 0 errors
```

Kalau semua hijau berarti backend siap diimport. Selamat ngoding 🚀
