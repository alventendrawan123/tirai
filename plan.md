# Plan integrasi Frontend (Phase 4) — untuk Bima

**Owner:** Bima · **Konsumen:** end-users (project + researcher + auditor) · **Status backend:** Hari 1–5 done, all 5 public function real, 25/25 tests pass.

Dokumen ini adalah **action plan step-by-step**, bukan reference. Untuk dokumentasi reference (signature, contoh code, privacy invariants), baca [`update.md`](update.md).

---

## Daftar Isi

1. [Pre-requisite (sekali setup)](#1-pre-requisite-sekali-setup)
2. [Urutan implementasi (P0 → P3)](#2-urutan-implementasi-p0--p3)
3. [Phase 4.1 — Setup adapter layer](#3-phase-41--setup-adapter-layer)
4. [Phase 4.2 — Wire `/pay` page](#4-phase-42--wire-pay-page)
5. [Phase 4.3 — Wire `/claim` page](#5-phase-43--wire-claim-page)
6. [Phase 4.4 — Wire `/audit` page](#6-phase-44--wire-audit-page)
7. [Phase 4.5 — Polish + demo prep](#7-phase-45--polish--demo-prep)
8. [Common pitfalls (FAQ)](#8-common-pitfalls-faq)
9. [Definition of Done per page](#9-definition-of-done-per-page)
10. [Estimasi waktu](#10-estimasi-waktu)

---

## 1. Pre-requisite (sekali setup)

Lakukan sekali di awal sebelum nyentuh code.

- [ ] **Pull latest dari main**
  ```bash
  git pull origin main
  ```

- [ ] **Verify pnpm workspace include backend**
  Buka `pnpm-workspace.yaml` di root. Pastikan ada:
  ```yaml
  packages:
    - frontend
    - backend
  ```

- [ ] **Install workspace package di frontend**
  ```bash
  cd frontend
  pnpm add @tirai/api@workspace:*
  ```

- [ ] **Verify backend import jalan**
  Bikin file scratch `frontend/src/scratch.ts`:
  ```ts
  import { createBountyPayment } from "@tirai/api";
  console.log(typeof createBountyPayment); // expect: "function"
  ```
  Run `pnpm typecheck` di frontend → tidak ada error.
  Hapus `scratch.ts` setelah verify.

- [ ] **Verify backend tests hijau**
  ```bash
  pnpm -F @tirai/api test
  ```
  Expect: `25/25 tests pass`. Kalau merah, kabari Alven.

- [ ] **Update `frontend/src/config/cloak.ts`** ke devnet program ID
  ```ts
  export const CLOAK_PROGRAM_ID = "Zc1kHfp4rajSMeASFDwFFgkHRjv7dFQuLheJoQus27h";
  ```
  (Mainnet ID `zh1eLd6r...` belum diverifikasi — jangan dipakai.)

- [ ] **Setup RPC env var di frontend**
  Tambah ke `frontend/.env.local` (gitignored):
  ```
  VITE_SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_HELIUS_KEY
  ```
  Public devnet RPC (`api.devnet.solana.com`) terlalu rate-limit untuk `/audit` — wajib pakai Helius/QuickNode untuk demo.

  Daftar Helius gratis: https://helius.dev (free tier 1M credits/bulan, 10 RPS).

- [ ] **Read [`update.md`](update.md) sections 1, 2, 3, 3b, 3c, 4, 4b, 4c, 5, 7**
  Skip section 6 (devnet evidence — informational). Section 8, 9 untuk later.
  Estimasi baca: 30-45 menit. Pahami dulu sebelum nulis code.

---

## 2. Urutan implementasi (P0 → P3)

| Priority | Phase | Page/Feature | Dependency |
|----------|-------|--------------|------------|
| **P0** | 4.1 | Adapter layer (3 file) + RPC provider | — |
| **P0** | 4.2 | `/pay` page wiring | Adapter `payBountyAdapter` |
| **P1** | 4.3 | `/claim` page wiring (inspect + claim, fresh + existing) | Adapter `inspectTicketAdapter`, `claimAdapter` |
| **P2** | 4.4 | `/audit` page wiring (scan + export) | Adapter `scanAuditAdapter`, `exportAuditAdapter` |
| **P3** | 4.5 | Polish (loading states, error toasts, mobile responsive) | All P0-P2 done |

**Kenapa urutan ini?**
- `/pay` first → menghasilkan ticket + viewing key yang dibutuhkan `/claim` dan `/audit`.
- `/claim` second → bisa di-test pakai ticket dari `/pay` yang barusan.
- `/audit` last → butuh history (≥1 deposit) untuk dapat hasil scan yang bermakna.

**JANGAN jump ke `/claim` atau `/audit` sebelum `/pay` works end-to-end** — debugging `/claim` tanpa ticket valid = membuang waktu.

---

## 3. Phase 4.1 — Setup adapter layer

**Tujuan:** isolasi logic `@tirai/api` ke 1 layer, biar component-component gak langsung depend ke backend.

### Folder structure

```
frontend/src/features/
├── bounty/
│   └── adapters/
│       └── bounty.adapter.ts          ← Phase 4.2
├── claim/
│   └── adapters/
│       ├── inspect.adapter.ts         ← Phase 4.3
│       └── claim.adapter.ts           ← Phase 4.3
└── audit/
    └── adapters/
        ├── audit.adapter.ts           ← Phase 4.4
        └── export.adapter.ts          ← Phase 4.4
```

### Tasks

- [ ] **Bikin shared error mapper** (`frontend/src/lib/errors/map-tirai-error.ts`)
  Reusable function untuk convert `AppError` ke user-friendly message + Sentry tag. Pattern di [`update.md`](update.md) section 3c (error handling table).

- [ ] **Setup Connection provider** (`frontend/src/providers/SolanaProvider.tsx` — mungkin udah ada dari Phase 3)
  - Bikin `Connection` instance dengan `import.meta.env.VITE_SOLANA_RPC_URL`
  - Commitment: `"confirmed"` (default backend smoke test)
  - Provide via React Context atau zustand store

- [ ] **Setup TanStack Query keys** (`frontend/src/lib/query-keys.ts`)
  ```ts
  export const queryKeys = {
    auditHistory: (vk: string) => ["audit", vk] as const,
    inspectTicket: (raw: string) => ["claim", "inspect", raw] as const,
  };
  ```

- [ ] **Bikin `useBountyMutation`, `useClaimMutation`, `useScanQuery`** sebagai TanStack hooks (kerangka dulu, isi di phase berikutnya).

---

## 4. Phase 4.2 — Wire `/pay` page

**Tujuan:** project bayar bounty via flow real (devnet), dapat ticket + viewing key, save VK ke localStorage.

### Tasks

- [ ] **Implement `bounty.adapter.ts`** persis seperti contoh di [`update.md`](update.md) §4.

- [ ] **Hook `useBountyMutation`** wrap `createBountyPayment` dengan TanStack Query mutation.
  - onSuccess: save `viewingKey` ke `localStorage["tirai:vk:" + walletPubkey]`, return ticket untuk display.
  - onError: pass ke error mapper, show toast.

- [ ] **PayPage component**
  - Form input: `amountSol` (number), `label` (string ≤64), `memo?` (string ≤140)
  - Validate via zod di boundary, convert `amountSol` → `BigInt(Math.floor(amountSol * 1_000_000_000))`
  - Submit handler: panggil `useBountyMutation`
  - Loading state: show `ProgressDialog` dengan step `"validate" → "generate-proof" (~30s) → "done"`

- [ ] **SuccessScreen component**
  - QR code dari `result.ticket.raw` (pakai `qrcode.react` atau library similar)
  - Tombol "Copy Ticket" → clipboard `result.ticket.raw`
  - Tombol "Copy Viewing Key" → clipboard `result.viewingKey`
  - Solscan link (`result.signature`, cluster=devnet)
  - CTA: "Share ticket ke researcher via Telegram/email"

- [ ] **Privacy assertion** — di logger config (`services/logger.ts`):
  - Filter field `ticket.raw`, `viewingKey` dari semua log + Sentry breadcrumbs

### Manual test checklist

- [ ] Connect Phantom (devnet mode)
- [ ] Submit pay 0.01 SOL, label "test bounty"
- [ ] Loading state muncul, ProgressDialog show step
- [ ] Setelah ~30s, SuccessScreen muncul dengan QR + copy buttons
- [ ] Klik Solscan link → tx confirmed di devnet
- [ ] localStorage punya entry `tirai:vk:<walletPubkey>` dengan VK 64 hex chars
- [ ] Refresh page → form kosong (ticket gak persist, sengaja)

### DoD `/pay`

- [ ] Submit success path 1× di devnet (real tx confirmed di Solscan)
- [ ] Error path tested: insufficient balance, USER_REJECTED, RPC error
- [ ] Privacy: ticket.raw tidak muncul di console.log / network tab / Sentry
- [ ] Mobile responsive (form + QR readable)

---

## 5. Phase 4.3 — Wire `/claim` page

**Tujuan:** researcher bisa preview ticket, lalu claim via fresh atau existing wallet.

### Tasks

- [ ] **Implement `inspect.adapter.ts`** dan **`claim.adapter.ts`** persis seperti contoh di [`update.md`](update.md) §4b.

- [ ] **Hook `useInspectTicketQuery`** wrap `inspectClaimTicket` dengan TanStack Query.
  - Query key: `queryKeys.inspectTicket(rawTicket)`
  - Enabled: only if rawTicket length > 0 (avoid spam queries)
  - staleTime: 30 detik (re-fetch kalau user diem)

- [ ] **Hook `useClaimMutation`** wrap `claimBounty`.

- [ ] **ClaimPage component**
  - Input: `<textarea>` paste ticket
  - Auto-debounce inspect call (300ms after typing stop)
  - PreviewCard component: render `{amount, tokenMint, label, isClaimable}`
  - Mode toggle: 🆕 Fresh / 👛 Existing wallet (radio button)
  - Tombol "Claim" — disabled kalau `!isClaimable` ATAU mode existing tapi wallet belum connect
  - ProgressDialog selama claim flow (~30s)

- [ ] **SaveKeyDialog component** (HANYA untuk mode fresh)
  - Trigger: setelah `claimBounty` return success dengan `mode: "fresh"`
  - Display: secretKey sebagai base58 (recommended) atau hex 128 chars
  - Tombol "Copy" + checkbox "I saved it to my password manager"
  - Tombol "Close" disabled sampai checkbox dicentang
  - **Setelah dialog ditutup**: `secretKey.fill(0)` — zero-out memory

- [ ] **SuccessScreen component (post-claim)**
  - destination address + Solscan tx link (cluster=devnet)
  - Tampilkan amount received
  - CTA: "Open in wallet" (untuk mode existing) atau "Funds sent to fresh wallet" (untuk mode fresh)

- [ ] **Privacy assertion**
  - secretKey tidak masuk: state global, localStorage, sessionStorage, cookie, URL params, Sentry, console
  - Verify dengan grep code: `grep -r "secretKey" frontend/src/` — semua match harus di SaveKeyDialog scope

### Manual test checklist

- [ ] Generate ticket dari `/pay` (Phase 4.2). Copy ticket.raw.
- [ ] Buka `/claim`, paste ticket
- [ ] PreviewCard muncul, isClaimable: true
- [ ] Mode fresh:
  - [ ] Klik Claim → ProgressDialog → ~30s → SaveKeyDialog
  - [ ] Copy secretKey, check checkbox, close dialog
  - [ ] Cek: secretKey gak ada di Redux/Zustand devtools
  - [ ] Solscan tx confirmed
  - [ ] Re-paste ticket sama → isClaimable: false (nullifier consumed)
- [ ] Mode existing:
  - [ ] Connect Phantom
  - [ ] Klik Claim → SuccessScreen langsung (no SaveKeyDialog)
  - [ ] Solscan tx confirmed
  - [ ] Wallet balance bertambah ~0.00497 SOL

### DoD `/claim`

- [ ] Both fresh + existing modes tested di devnet (2 successful tx)
- [ ] Re-claim same ticket → handled gracefully (NULLIFIER_CONSUMED error)
- [ ] secretKey lifecycle audit: hanya muncul di SaveKeyDialog
- [ ] Mobile responsive

---

## 6. Phase 4.4 — Wire `/audit` page

**Tujuan:** auditor (atau project sendiri) bisa scan history + export PDF/CSV.

### Tasks

- [ ] **Implement `audit.adapter.ts`** dan **`export.adapter.ts`** persis seperti contoh di [`update.md`](update.md) §4c.

- [ ] **Hook `useScanAuditQuery`** wrap `scanAuditHistory`.
  - Query key: `queryKeys.auditHistory(viewingKey)`
  - Enabled: only if `viewingKey.length === 64`
  - staleTime: 5 menit (scan mahal, jangan re-fetch terlalu sering)
  - cacheTime: 30 menit
  - Pass `batchSize` di context (default backend = 3, fit free-tier RPC)

- [ ] **AuditPage component**
  - Input: viewing key (64 hex)
    - Auto-load dari localStorage `tirai:vk:<walletPubkey>` kalau wallet connected
    - Atau prompt manual paste
  - Tombol "Scan History"
  - Loading state: progress indicator dengan estimated time (60-90 detik)
  - Result panel:
    - SummaryCard: totalPayments, totalVolumeLamports (format SOL), latestActivityAt
    - Table: `timestamp_iso | status | amount | mint | signature` (truncate signature ke 12 chars + "...")
    - Pagination kalau > 20 entries
    - Empty state: "No activity yet — pay a bounty first"

- [ ] **Export buttons**
  - "Download CSV" → `exportAuditReport(history, "csv")` → trigger browser download
  - "Download PDF" → `exportAuditReport(history, "pdf")` → trigger browser download
  - Filename: `tirai-audit-${YYYY-MM-DD}.{csv|pdf}`

- [ ] **Helper untuk download Blob**
  ```ts
  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
  ```

- [ ] **Privacy assertion**
  - Verify CSV header gak ada `recipient` column (tapi backend udah enforce ini)
  - Render `label: "—"` kalau empty (jangan render literal `""` yang aneh)

### Manual test checklist

- [ ] Punya minimal 1 deposit di devnet (dari `/pay` test sebelumnya)
- [ ] Buka `/audit`, paste viewing key
- [ ] Klik "Scan History" — tunggu 60-90 detik
- [ ] Result muncul dengan ≥1 entry, summary correct
- [ ] Download CSV → buka di Excel/Notepad → 6 kolom (no recipient), data benar
- [ ] Download PDF → buka di browser/Acrobat → title + summary + table render

### DoD `/audit`

- [ ] Scan success path 1× di devnet (recover ≥1 entry)
- [ ] Empty state tested (VK yang belum pernah dipakai)
- [ ] CSV opens cleanly in Excel
- [ ] PDF opens cleanly in PDF reader
- [ ] No `recipient` field anywhere (verify via DevTools network tab + downloaded files)

---

## 7. Phase 4.5 — Polish + demo prep

Setelah 4.1-4.4 done, finishing touches.

### UX polish

- [ ] **Loading states konsisten** di semua page (spinner + text "Generating proof...")
- [ ] **Error toasts** dengan retry button untuk error retryable
- [ ] **Mobile responsive** semua page (test di Chrome DevTools mobile view)
- [ ] **Wallet connection state** consistent (connected/disconnected indicator di header)

### Privacy audit (final)

- [ ] **No `console.log` dengan sensitive data** — grep `console\.\(log\|debug\|info\|warn\|error\)` di `frontend/src/` dan review semua match
- [ ] **No localStorage selain `tirai:vk:*`** untuk Tirai (jangan persist ticket atau secretKey)
- [ ] **Sentry config** filter sensitive fields (kalau Sentry udah setup di Phase 3)

### Demo prep

- [ ] **Run full flow di devnet 1×** (top-to-bottom):
  1. Connect Phantom
  2. `/pay` → bayar 0.01 SOL → save VK + ticket
  3. Buka tab baru / incognito → `/claim` → paste ticket → fresh mode → save secretKey
  4. Balik ke tab pertama → `/audit` → scan → export PDF + CSV
- [ ] **Record demo video** (1-2 menit, fokus ke privacy claim — "lihat Solscan, project address & researcher address tidak ke-link")
- [ ] **Pitch deck slides**:
  - Problem: bug bounty butuh privacy
  - Solution: Tirai client-only via Cloak
  - Demo: video link
  - Tech: Cloak SDK + Solana, no server, ZK proof in browser
  - Devnet evidence: list Solscan tx links
  - Roadmap: mainnet post-hackathon

---

## 8. Common pitfalls (FAQ)

### "Backend function return error tapi UI freeze"

`@tirai/api` selalu return `Result<T, AppError>` — **gak pernah throw**. Kalau UI freeze, kemungkinan kamu lupa cek `result.ok`:

```ts
// ❌ salah
const { ticket } = await createBountyPayment(...);

// ✅ benar
const result = await createBountyPayment(...);
if (!result.ok) {
  showError(result.error);
  return;
}
const { ticket } = result.value;
```

### "TS error: Type 'undefined' is not assignable to type 'string'"

Backend pakai `exactOptionalPropertyTypes`. Jangan pass `undefined` ke optional field. Pakai conditional spread:

```ts
// ❌ salah
{ memo: memoOrUndefined }

// ✅ benar
{ ...(memo !== undefined ? { memo } : {}) }
```

### "amountBaseUnits should be bigint"

Solana web3.js banyak pakai `number`, Cloak SDK pakai `bigint`. Convert di adapter boundary:

```ts
const amountSol = 0.01;  // number from UI
const amountBaseUnits = BigInt(Math.floor(amountSol * 1_000_000_000));
```

### "RPC 429 di /audit page"

Public devnet RPC terlalu rate-limit. Pakai Helius/QuickNode di `VITE_SOLANA_RPC_URL`. Lihat [`update.md`](update.md) §7 "RPC requirement untuk `/audit`".

### "PDF buka tapi blank"

PDF magic bytes harus `%PDF-1.7`. Kalau blank, Blob mungkin corrupted. Cek `result.value.size > 0` sebelum download.

### "secretKey muncul di Redux DevTools"

Kalau pakai Redux/Zustand, **JANGAN** simpan `ClaimBountyResult` di store global. Pakai local component state (useState) di SaveKeyDialog, dispose saat dialog close.

---

## 9. Definition of Done per page

Setiap page dianggap "done" hanya kalau **semua** item terpenuhi:

### `/pay`
- [ ] 1+ successful tx di devnet (Solscan link recorded)
- [ ] Form validation works (amount > 0, label ≤64)
- [ ] Error states handled (USER_REJECTED, INSUFFICIENT_BALANCE, RPC)
- [ ] QR code render benar, copy buttons work
- [ ] viewingKey persist di localStorage
- [ ] ticket NOT persist anywhere
- [ ] Mobile responsive

### `/claim`
- [ ] Both fresh + existing modes tested (2 successful tx)
- [ ] Inspect preview shows correct amount/label/status
- [ ] isClaimable=false handled (re-claim attempt)
- [ ] SaveKeyDialog: copy works, dialog gating (checkbox required)
- [ ] secretKey: only in SaveKeyDialog scope, zero-out after close
- [ ] Mobile responsive

### `/audit`
- [ ] Scan success with ≥1 entry recovered
- [ ] Empty state tested (fresh VK)
- [ ] CSV downloads, opens in Excel, no `recipient` column
- [ ] PDF downloads, opens in reader, table renders
- [ ] Long scans (>1 minute) show progress indicator
- [ ] Mobile responsive

---

## 10. Estimasi waktu

Asumsi Bima 1 orang full-time, sudah familiar dengan TanStack Query + React + TypeScript:

| Phase | Estimasi |
|-------|----------|
| 4.1 Adapter setup | 0.5 hari |
| 4.2 `/pay` wire | 1 hari |
| 4.3 `/claim` wire (2 modes) | 1.5 hari |
| 4.4 `/audit` wire | 1 hari |
| 4.5 Polish + demo prep | 1 hari |
| **Total** | **~5 hari** |

Kalau ada hari yang molor (bug debug, RPC issue, dll), kabari Alven sehari dulu — bisa adjust scope (misal /audit jadi P3 kalau time pressure).

---

## Kontak

- **Backend questions** → Alven (chat / WhatsApp)
- **SDK Cloak deeper questions** → community Cloak Telegram (lihat `backend/instruction.md` §1 untuk link)
- **Block/stuck >2 jam** → DM Alven, jangan diem-diem 1 hari ngacak

Selamat ngoding 🚀
