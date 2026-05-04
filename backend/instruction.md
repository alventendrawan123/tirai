# Tirai API — Instruksi Implementasi (untuk Alven)

**Owner:** Alven · **Konsumen:** `frontend/` (Bima) · **Status frontend:** Phase 3 selesai (provider stack + landing siap, fixtures masih dipakai untuk semua data flow).

Dokumen ini adalah kontrak satu arah: **frontend tidak akan move ke Phase 4 sampai package ini ada dan tipe-tipenya merged.** Semua section di bawah ini adalah hard requirement, bukan saran.

Baca dulu `../README.md` untuk konteks produk dan privacy boundary, lalu `../frontend/rules/rules.md` §0, §12, dan §14 untuk aturan engineering yang sudah dipakai frontend.

---

## Daftar Isi

1. [Konteks & posisi di arsitektur](#1-konteks--posisi-di-arsitektur)
2. [Output yang diharapkan](#2-output-yang-diharapkan)
3. [Tech stack & dependency](#3-tech-stack--dependency)
4. [Public API — fungsi yang harus di-export](#4-public-api--fungsi-yang-harus-di-export)
5. [Data types — kontrak yang frontend pakai](#5-data-types--kontrak-yang-frontend-pakai)
6. [Error model](#6-error-model)
7. [Privacy invariant — yang TIDAK boleh ada](#7-privacy-invariant--yang-tidak-boleh-ada)
8. [Integrasi ke frontend](#8-integrasi-ke-frontend)
9. [Testing strategy](#9-testing-strategy)
10. [Urutan delivery](#10-urutan-delivery)
11. [Definition of done](#11-definition-of-done)

---

## 1. Konteks & posisi di arsitektur

Tirai adalah aplikasi **client-only**. Tidak ada server, tidak ada DB, tidak ada smart contract baru. "Backend" di repo ini sebenarnya adalah library TypeScript yang **jalan di browser user** dan di-import dari frontend.

Layer kamu duduk di antara dua hal:

```
FRONTEND (Bima)
   │
   ▼ panggil fungsi dari "@tirai/api" (atau path workspace)
TIRAI API LAYER  ← KAMU DI SINI
   │
   ▼ panggil method dari @cloak.dev/sdk
CLOAK SDK
   │
   ▼ submit tx ke
SOLANA MAINNET (Cloak Shield Pool, sudah deployed)
```

**Tugas utama layer ini:**
- Membungkus method Cloak SDK jadi API yang **stabil**, **tipe-aman**, dan **konsisten dengan kontrak privasi Tirai**.
- Encode/decode "claim ticket" (string opaque yang dikirim project ke researcher off-chain).
- Mengubah error mentah dari SDK/RPC jadi `AppError` discriminated union yang bisa di-render frontend.
- Mengontrol field apa yang **boleh** dan **tidak boleh** di-expose ke caller (paling kritis: alamat tujuan researcher tidak pernah keluar dari adapter audit).

**Tugas yang BUKAN layer ini:**
- Validasi input (frontend yang validasi via `zod` di boundary; kamu trust input dari frontend).
- Format display (`formatLamports`, `formatTokenAmount` — sudah ada di `frontend/src/lib/web3/`).
- State management (frontend pakai TanStack Query + zustand).
- UI apa pun.

---

## 2. Output yang diharapkan

Struktur final di `backend/`:

```
backend/
├── package.json                  # name: "@tirai/api" (workspace package)
├── tsconfig.json                 # strict, target ES2022, module ESNext
├── biome.json                    # extend dari frontend/biome.json
├── README.md                     # quickstart + contoh pakai
├── src/
│   ├── index.ts                  # public surface — re-export semuanya
│   ├── types/
│   │   ├── index.ts              # barrel
│   │   ├── api.ts                # public API types (yang frontend import)
│   │   ├── domain.ts             # internal domain models
│   │   ├── errors.ts             # AppError discriminated union
│   │   └── ticket.ts             # ClaimTicket shape
│   ├── bounty/
│   │   ├── index.ts
│   │   └── create-bounty-payment.ts
│   ├── claim/
│   │   ├── index.ts
│   │   ├── inspect-claim-ticket.ts
│   │   └── claim-bounty.ts
│   ├── audit/
│   │   ├── index.ts
│   │   ├── scan-audit-history.ts
│   │   └── export-audit-report.ts
│   ├── ticket/
│   │   ├── index.ts
│   │   ├── encode.ts
│   │   └── decode.ts
│   ├── errors/
│   │   ├── index.ts
│   │   └── parse-sdk-error.ts
│   ├── lib/
│   │   ├── result.ts             # Result<T, E> helper (sama interface dengan frontend)
│   │   ├── connection.ts         # builder ConnectionConfig → Connection
│   │   └── progress.ts           # ProgressEmitter helper
│   └── config/
│       └── cloak-program.ts      # program id constant + cluster map
└── tests/
    ├── ticket.test.ts            # round-trip encode/decode
    ├── bounty.surfpool.test.ts   # integration vs Surfpool fork
    └── claim.surfpool.test.ts
```

**Aturan struktur:**
- Satu fungsi per file. Filename kebab-case sama persis dengan nama fungsi (kebab-case).
- Tipe-tipe TIDAK ditulis inline di file fungsi — semua di `src/types/`.
- Tidak ada default export. Selalu named export.
- Tidak ada komentar di `src/` (sama dengan rule frontend §5). Penjelasan masuk ke `README.md`.
- Public API surface (yang frontend boleh import) hanya yang di-export oleh `src/index.ts`. Anything else internal.

---

## 3. Tech stack & dependency

| Concern | Library | Catatan |
|---|---|---|
| Privacy SDK | `@cloak.dev/sdk` (mainnet) · `@cloak.dev/sdk-devnet` | API utama yang kamu wrap |
| Solana RPC | `@solana/web3.js` v1.98+ | Sudah ada di frontend |
| PDF generation | `pdf-lib` | Browser-side, untuk export audit |
| CSV generation | tulis sendiri (≤30 baris) | Jangan tarik library hanya untuk CSV |
| Validation runtime | `zod` v4 | Sudah ada di frontend |
| Test runner | `vitest` | Sama dengan frontend (Phase 1 plan) |
| Solana fork | Surfpool | Untuk integration test tanpa gas |
| Linter | Biome | Config extend dari frontend |
| Package manager | pnpm | Workspace — tambahkan ke root `pnpm-workspace.yaml` |

**Tidak boleh:**
- ❌ Backend HTTP server (Express/Fastify/dll). Ini library, bukan service.
- ❌ Database client (Prisma/Drizzle/dll). Tirai tidak punya DB.
- ❌ Library state-management (kamu tidak punya state — frontend yang punya).
- ❌ Logging library (frontend punya `services/logger.ts` sendiri).
- ❌ CommonJS exports — pure ESM.

---

## 4. Public API — fungsi yang harus di-export

Empat fungsi ini = **kontrak yang sudah dipakai frontend**. Signature dan nama field tidak bisa berubah tanpa diskusi.

### 4.1 `createBountyPayment`

```ts
export function createBountyPayment(
  input: CreateBountyPaymentInput,
  ctx: BountyContext,
): Promise<Result<BountyPaymentResult, AppError>>;

export interface CreateBountyPaymentInput {
  amountLamports: bigint;          // SOL/SPL base units, never number
  label: string;                   // ≤64 chars, sudah disanitasi frontend
  memo?: string;                   // optional, ≤140 chars
}

export interface BountyContext {
  connection: Connection;          // dari @solana/web3.js
  payer: Signer;                   // wallet adapter signer
  cluster: Cluster;
  onProgress?: ProgressEmitter;    // optional callback (lihat §4.5)
}

export interface BountyPaymentResult {
  ticket: ClaimTicket;             // opaque string + metadata
  signature: string;               // tx signature untuk Solscan link
  feeLamports: bigint;
}
```

**Tugas internal:**
1. Panggil `cloak.transact()` dengan amount + payer + progress callback.
2. Tunggu tx confirmed (commitment `"confirmed"` minimum).
3. Generate `ClaimTicket` via `ticket/encode.ts` — bundle data minimal yang researcher butuhkan untuk withdraw (tidak termasuk identitas project).
4. Return result dengan signature + ticket.

### 4.2 `inspectClaimTicket`

```ts
export function inspectClaimTicket(
  ticket: string,
  ctx: InspectContext,
): Promise<Result<ClaimTicketPreview, AppError>>;

export interface InspectContext {
  connection: Connection;
  cluster: Cluster;
}

export interface ClaimTicketPreview {
  amountLamports: bigint;
  tokenMint: string | null;        // null untuk native SOL
  label: string;
  expiresAt?: number;              // unix ms, optional
  isClaimable: boolean;            // false jika nullifier sudah consumed
}
```

**Tugas internal:**
- Decode ticket via `ticket/decode.ts`.
- Cek apakah nullifier sudah consumed (read-only call ke Cloak pool).
- **JANGAN signing apa pun di sini.** Function ini pure preview.

### 4.3 `claimBounty`

```ts
export function claimBounty(
  input: ClaimBountyInput,
  ctx: ClaimContext,
): Promise<Result<ClaimBountyResult, AppError>>;

export type ClaimWalletMode =
  | { kind: "fresh" }
  | { kind: "existing"; signer: Signer };

export interface ClaimBountyInput {
  ticket: string;
  mode: ClaimWalletMode;
}

export interface ClaimContext {
  connection: Connection;
  cluster: Cluster;
  onProgress?: ProgressEmitter;
}

export type ClaimBountyResult =
  | {
      mode: "fresh";
      destination: string;          // base58 address baru
      secretKey: Uint8Array;        // ⚠ HANYA disini diexpose, tidak boleh di-log/persist
      signature: string;
    }
  | {
      mode: "existing";
      destination: string;
      signature: string;
    };
```

**Tugas internal:**
1. Jika `mode.kind === "fresh"` → generate keypair via `Keypair.generate()`. Set `destination = keypair.publicKey.toBase58()`, `secretKey = keypair.secretKey`.
2. Jika `mode.kind === "existing"` → pakai `mode.signer.publicKey` sebagai destination.
3. Decode ticket, panggil `cloak.fullWithdraw({ destination, ... })`.
4. Tunggu confirmed.
5. Return result dengan `secretKey` HANYA jika mode fresh.

**Wajib:** `secretKey` tidak pernah disimpan di filesystem, localStorage, telemetry, atau Sentry. Frontend yang akan menampilkan ke user via SaveKeyDialog.

### 4.4 `scanAuditHistory` & `exportAuditReport`

```ts
export function scanAuditHistory(
  input: ScanAuditInput,
  ctx: AuditContext,
): Promise<Result<AuditHistory, AppError>>;

export interface ScanAuditInput {
  viewingKey: string;
}

export interface AuditContext {
  connection: Connection;
  cluster: Cluster;
}

export interface AuditHistory {
  entries: ReadonlyArray<AuditEntry>;
  summary: AuditSummary;
}

export interface AuditEntry {
  timestamp: number;               // unix ms
  amountLamports: bigint;
  tokenMint: string | null;
  label: string;
  status: "deposited" | "claimed" | "expired";
  signature: string;
  // ❌ TIDAK ADA destination wallet — privacy boundary 3
}

export interface AuditSummary {
  totalPayments: number;
  totalVolumeLamports: bigint;
  latestActivityAt: number | null;
}

export function exportAuditReport(
  history: AuditHistory,
  format: "pdf" | "csv",
): Promise<Result<Blob, AppError>>;
```

**Tugas internal:**
- `scanAuditHistory`: panggil `cloak.scanTx(viewingKey)` + `cloak.complianceRpt(...)`. Map raw SDK output → `AuditEntry[]` (filter field destination).
- `exportAuditReport`: render `AuditHistory` ke `Blob` via `pdf-lib` atau CSV builder. Frontend yang trigger download.

### 4.5 `ProgressEmitter`

Frontend punya `ProgressDialog` yang menampilkan langkah-langkah ZK proof. Kontrak callback:

```ts
export type ProgressStep =
  | "validate"
  | "generate-proof"
  | "submit"
  | "confirm"
  | "done";

export type ProgressEmitter = (step: ProgressStep, detail?: string) => void;
```

Setiap fungsi `createBountyPayment` / `claimBounty` HARUS panggil `onProgress?.(step)` sebelum melakukan langkah. Frontend pakai ini untuk update spinner per langkah.

---

## 5. Data types — kontrak yang frontend pakai

Tipe-tipe ini disimpan di `src/types/api.ts` dan di-mirror di frontend `src/types/api.ts`. Begitu file ini merged, frontend langsung wire ke hook-nya.

```ts
// src/types/api.ts
export type Cluster = "mainnet" | "devnet" | "localnet";

export interface ClaimTicket {
  raw: string;                     // string yang dikirim off-chain
  version: 1;
  cluster: Cluster;
  createdAt: number;               // unix ms
}

export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export type Signer = {
  publicKey: import("@solana/web3.js").PublicKey;
  signTransaction<T extends import("@solana/web3.js").Transaction | import("@solana/web3.js").VersionedTransaction>(
    tx: T,
  ): Promise<T>;
};
```

**Aturan tipe:**
- Semua jumlah on-chain pakai `bigint` (lamports / token base unit). **Bukan** `number`.
- Address pakai `string` (base58) di public API. Internal boleh pakai `PublicKey`.
- Tidak ada `any` di public surface. `unknown` boleh kalau memang tidak bisa di-narrow di adapter (misal raw SDK error).
- Field optional pakai `?`, bukan `| null`. (Konsisten dengan `exactOptionalPropertyTypes` di tsconfig.)
- Discriminated unions pakai `kind` untuk union, `status`/`mode` untuk enum-like state.

---

## 6. Error model

Tidak boleh `throw` melintasi boundary public. Semua function return `Result<T, AppError>`.

```ts
// src/types/errors.ts
export type AppError =
  | { kind: "INVALID_INPUT"; field: string; message: string }
  | { kind: "INSUFFICIENT_BALANCE"; required: bigint; available: bigint }
  | { kind: "USER_REJECTED" }
  | { kind: "NULLIFIER_CONSUMED" }              // ticket sudah pernah di-claim
  | { kind: "WRONG_CLUSTER"; expected: Cluster; got: Cluster }
  | { kind: "RPC"; message: string; retryable: boolean }
  | { kind: "PROOF_GENERATION_FAILED"; message: string }
  | { kind: "TICKET_DECODE_FAILED"; message: string }
  | { kind: "VIEWING_KEY_INVALID" }
  | { kind: "UNKNOWN"; message: string };
```

**Aturan:**
- `parseSdkError(err: unknown): AppError` — single chokepoint untuk konversi error mentah → `AppError`. Lokasi: `src/errors/parse-sdk-error.ts`.
- Pesan di field `message` adalah pesan technical (bukan user-facing). Frontend yang map ke pesan user via `lib/errors/messages.ts`.
- Field sensitif (ticket, viewing key, secret key, alamat tujuan) **TIDAK boleh** masuk ke `message` — bisa bocor ke Sentry.
- Tidak ada `console.error` di `src/`. Frontend yang log via `services/logger.ts`.

---

## 7. Privacy invariant — yang TIDAK boleh ada

Ini hard requirement dari rules.md §0, §12, §15. Reviewer akan reject PR yang melanggar.

| Invariant | Implication di kode |
|---|---|
| **Auditor tidak boleh melihat wallet tujuan researcher** | `AuditEntry` sama sekali tidak punya field `destination`/`recipient`/`receiver`/`to`. Bahkan jangan pernah include di intermediate variable yang bisa bocor. |
| **Secret key fresh wallet hanya hidup di memory** | Tidak ada `localStorage.setItem`, `sessionStorage`, `cookie`, `fetch(...)`, `console.log`, `Sentry.addBreadcrumb` yang menyentuh `Uint8Array` secret key. |
| **Ticket dan viewing key tidak boleh di-log** | `parseSdkError` + adapter manapun: jika ada exception yang carry value sensitif, redact (`vk_••••`, `tk_••••`) sebelum return. |
| **Tidak ada server backend** | Tidak ada `fetch()` ke endpoint kita sendiri. Satu-satunya allowed network call: RPC ke Solana via `@solana/web3.js`. |
| **Tidak ada telemetry tanpa filter** | Jika nanti mau add Sentry/PostHog di package ini, kontak Bima dulu. Default: zero telemetry. |

---

## 8. Integrasi ke frontend

### 8.1 Workspace setup

Update `pnpm-workspace.yaml` di repo root:

```yaml
packages:
  - frontend
  - backend
```

`backend/package.json`:

```json
{
  "name": "@tirai/api",
  "version": "0.1.0",
  "type": "module",
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./types": "./src/types/index.ts"
  },
  "private": true
}
```

Frontend nanti install dengan:

```bash
cd frontend && pnpm add @tirai/api@workspace:*
```

Frontend akan import seperti ini:

```ts
import { createBountyPayment, type ClaimTicket } from "@tirai/api";
import type { AppError } from "@tirai/api/types";
```

### 8.2 Yang dilakukan frontend di sisinya

Setiap fitur (`bounty`, `claim`, `audit`) di frontend punya:
- `features/<feat>/adapters/<feat>.adapter.ts` — wrap call ke `@tirai/api`, return `Result<T, AppError>` (dipassthrough)
- `features/<feat>/use-cases/*.ts` — orchestration (validate input → call adapter → map result)
- `features/<feat>/hooks/*.ts` — TanStack Query layer

Jadi: kamu jangan implement validation/state/UI — frontend semua handle. Cukup expose fungsi yang stable + tipe yang tight.

### 8.3 Sinkronisasi tipe

Begitu kamu publish `src/types/api.ts`, **kabari Bima di Discord/Slack**. Bima akan copy-mirror tipe yang dipakai langsung di `frontend/src/types/api.ts` (atau import via `@tirai/api/types` kalau workspace sudah jalan).

**Tipe adalah kontrak.** Begitu merged, breaking change butuh version bump + diskusi.

---

## 9. Testing strategy

| Layer | Tool | Target |
|---|---|---|
| Unit (ticket encode/decode, parse-error) | Vitest | ≥80% line coverage |
| Integration (bounty/claim against real RPC) | Vitest + Surfpool fork | Happy path + 3 edge cases per fitur |
| Type contract | `tsc --noEmit` | 100%, strict mode |

**Surfpool setup:**
- Jalankan `surfpool start --fork mainnet` lokal.
- Test pakai `Connection` ke `http://localhost:8899`.
- Setup: deposit ke pool dari payer test, simpan ticket → run claim → assert balance.

**Edge case yang HARUS dicover:**
- `createBountyPayment`: amount=0, payer balance kurang, RPC timeout
- `inspectClaimTicket`: ticket malformed, ticket expired, nullifier already consumed
- `claimBounty`: fresh mode → assert secretKey returned, length=64; existing mode → assert no secretKey
- `scanAuditHistory`: viewing key invalid → `VIEWING_KEY_INVALID`; assert no `destination` field di hasil

**Snapshot test dilarang.** Pakai assertion eksplisit.

---

## 10. Urutan delivery

Frontend depend on tipe lebih dulu, baru fungsi. Ship dalam urutan ini supaya Bima bisa unblock paralel:

| Hari | Deliverable | Output untuk Bima |
|---|---|---|
| 1 | `src/types/{api,errors,ticket}.ts` + `src/lib/result.ts` | Bima bisa wire adapter signature, masih pakai mock |
| 2 | `ticket/encode.ts` + `ticket/decode.ts` + tests | Bima bisa render QR code real |
| 3 | `createBountyPayment` (Surfpool tested) | `/pay` route end-to-end on devnet |
| 4 | `inspectClaimTicket` + `claimBounty` (kedua mode) | `/claim` route end-to-end |
| 5 | `scanAuditHistory` + `exportAuditReport` (PDF + CSV) | `/audit` route end-to-end |
| 6 | Mainnet rehearsal: deposit kecil → claim → audit | Demo siap |

**Hari 1 paling kritis** — begitu types merged, frontend bisa kerja paralel di Phase 4. Tipe-types dulu, implementasi belakangan.

---

## 11. Definition of done

Package dianggap ready untuk Phase 4 frontend integration ketika **semua** centang:

- [ ] `pnpm -F @tirai/api build` green (kalau add build step) — atau `pnpm -F @tirai/api typecheck` green
- [ ] `pnpm -F @tirai/api test` green (Vitest, semua tests)
- [ ] `pnpm -F @tirai/api lint` green (Biome, 0 error 0 warning)
- [ ] Ke-empat fungsi public exported dari `src/index.ts` dengan signature persis seperti §4
- [ ] Tipe-tipe di §5 ada di `src/types/api.ts` dengan nama field persis
- [ ] `AuditEntry` audited — tidak ada field destination/recipient/to
- [ ] `parseSdkError` cover minimal 5 jenis SDK error → `AppError`
- [ ] Surfpool integration test sukses untuk pay → claim happy path
- [ ] Mainnet smoke test dengan amount kecil (≤0.01 SOL) sukses
- [ ] README.md dengan: install, quickstart, contoh per fungsi, daftar `AppError`
- [ ] Tidak ada `any`, tidak ada `@ts-ignore`, tidak ada `console.*` di `src/`
- [ ] Tidak ada komentar di `src/` (kecuali license header / `biome-ignore` dengan alasan)

---

**Pertanyaan?** Tag Bima di repo issue. Untuk hal blokir-mengblokir (misal: kalau Cloak SDK behavior beda dari docs), update dokumen ini langsung dan kabari di chat.
