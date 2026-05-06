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

## 3b. Peran Cloak SDK di setiap fungsi

Dari 5 public function, **4 panggil Cloak SDK secara langsung**. Berikut peran SDK di tiap fungsi.

### 1. `createBountyPayment` — saat project deposit bounty

**Peran Cloak SDK**: bikin deposit ke shielded pool dengan privacy intact.

Tanpa Cloak SDK, kalau project transfer 0.01 SOL ke researcher, alamat project ↔ researcher kelihatan jelas di chain (semua orang bisa cek "wallet A kirim ke wallet B"). Cloak SDK ngubah flow itu jadi:

```
Project setor uang ke "brankas Cloak" (shielded pool)
       ↓ (orang nonton chain cuma lihat: wallet A → Cloak pool)
Project dapat ticket (off-chain, dikirim ke researcher via Telegram)
       ↓ (chain gak tau ticket ini ada)
Researcher pakai ticket untuk withdraw (di langkah `claimBounty` nanti)
       ↓ (orang nonton chain cuma lihat: Cloak pool → wallet B)
```

**Result**: link "wallet A → wallet B" hilang. Yang publik cuma "ada deposit & ada withdraw" terpisah.

#### Spesifik yang Cloak SDK lakukan di sini:

| Cloak function | Tugas |
|---|---|
| `generateUtxoKeypair()` | Bikin keypair khusus Cloak (beda dari Solana keypair) untuk owner UTXO yang akan dibuat |
| `getNkFromUtxoPrivateKey()` | Derive viewing key dari keypair — kunci read-only yang nanti dipakai auditor untuk scan history |
| `createUtxo()` | Bikin UTXO output (kayak "kupon brankas" yang nilainya 0.01 SOL, bisa ditarik nanti) |
| `createZeroUtxo()` | Bikin UTXO input "kosong" — dibutuhin protocol Cloak untuk balance equation |
| `transact()` | **Yang paling berat**: generate ZK proof (~30 detik) yang ngebuktiin "kita masukin uang dengan benar tanpa kasih tau siapa kita", lalu submit ke relay Cloak |
| `calculateFeeBigint()` | Hitung berapa fee yang Cloak ambil (5M lamports tetap + 0.3% variabel) |

### 2. `inspectClaimTicket` — saat researcher mau preview ticket

**Peran Cloak SDK**: cek apakah ticket masih valid (belum di-claim) tanpa benerannya menjebol brankas.

Tiap UTXO punya identitas unik — di Cloak namanya **nullifier**. Saat UTXO dipakai (di-withdraw), nullifier-nya ditulis di blockchain. Kalau nullifier udah ada di chain → UTXO udah dipakai → ticket dead.

#### Spesifik yang Cloak SDK lakukan di sini:

| Cloak function | Tugas |
|---|---|
| `verifyUtxos([utxo], conn, programId)` | 1× batched RPC call ke Solana — derive nullifier dari UTXO, lalu cek apakah nullifier PDA-nya ada di chain. Return `{ spent, unspent, skipped }`. Kita cuma cek `unspent.length === 1` untuk decide `isClaimable: true`. |

**Tanpa SDK**: kita harus manual compute nullifier via Poseidon hash, derive PDA address, panggil `getMultipleAccountsInfo` — ~40 baris code. SDK abstract semua jadi 1 call.

### 3. `claimBounty` — saat researcher ambil uang pakai ticket

**Peran Cloak SDK**: withdraw dari shielded pool ke alamat researcher, dengan privacy intact.

Sama dengan `createBountyPayment`, tapi arah sebaliknya. SDK ngebuktiin "kita berhak ambil uang ini" tanpa reveal "uang ini dari deposit yang mana".

```
Researcher pegang ticket → SDK reconstruct UTXO dari ticket
       ↓
SDK generate ZK proof: "saya punya UTXO valid di Merkle tree, hak saya untuk ambil"
       ↓
SDK submit via relay Cloak → relay bayar gas, submit tx ke Solana
       ↓
Recipient address (fresh atau existing) terima uang minus fee
```

#### Spesifik yang Cloak SDK lakukan di sini:

| Cloak function | Tugas |
|---|---|
| `deserializeUtxo()` | Reconstruct UTXO object dari ticket bytes (yang udah di-encode saat deposit dulu) |
| `fullWithdraw([utxo], recipient, options)` | **Yang paling berat**: gen ZK proof (~30 detik) + submit ke Cloak relay yang akan submit tx Solana + bayar gas + tunggu confirmed |

**Penting**: `fullWithdraw` **TIDAK butuh signTransaction** dari user. Relay yang sign + bayar gas. User cuma "tunjuk" recipient address. Itu sebabnya researcher bisa pakai wallet baru tanpa SOL untuk gas.

### 4. `scanAuditHistory` — saat auditor scan history pakai viewing key

**Peran Cloak SDK**: decrypt chain notes yang diencrypt waktu deposit, sehingga auditor bisa lihat history project.

Setiap deposit, Cloak SDK embed sebuah "chain note" terenkripsi di transaksi on-chain. Note ini berisi `{timestamp, commitment}` — minimal info untuk audit. Cuma yang punya viewing key (`nk`) yang bisa decrypt.

```
Auditor pegang viewing key → SDK pull SEMUA tx Cloak program di chain
       ↓
SDK trial-decrypt tiap chain note dgn viewing key
       ↓
Yang berhasil ke-decrypt = transaksi yang related ke project ini
       ↓
Return: list of {amount, timestamp, status, signature, ...}
```

#### Spesifik yang Cloak SDK lakukan di sini:

| Cloak function | Tugas |
|---|---|
| `hexToBytes()` | Convert viewing key string (hex) → Uint8Array yang dipakai SDK |
| `scanTransactions({connection, programId, viewingKeyNk})` | **Yang paling kompleks**: pull semua signatures dari Cloak program via `getSignaturesForAddress`, fetch tiap tx via `getTransaction`, parse instruction data untuk extract chain notes, trial-decrypt tiap chain note dgn viewing key, verify integrity, return list of `ScannedTransaction`. Sekitar 200-500 RPC calls untuk 1 deposit yang ke-recover. |

**Tanpa SDK**: kita harus manually pull tx, parse Cloak instruction format (binary), implement chain note encryption format (AES-GCM dengan key derivation), handle edge cases (failed decryptions, malformed notes). Ribuan baris code. SDK kasih semua dalam 1 call.

### Ringkasan — apa yang Cloak SDK kasih kita

| Function | Cloak SDK menyediakan | Kalau gak ada SDK |
|---|---|---|
| `createBountyPayment` | ZK proof generation untuk deposit + UTXO creation + viewing key derivation | Mustahil — harus implement Groth16 prover sendiri (jutaan LoC) |
| `inspectClaimTicket` | Nullifier check via 1 batched RPC | Bisa, tapi 40+ baris boilerplate |
| `claimBounty` | ZK proof generation untuk withdraw + relay submission | Mustahil — sama kayak deposit |
| `scanAuditHistory` | Auto-pull semua tx + decrypt chain notes via VK | Bisa, tapi ribuan baris (parsing binary instruction format Cloak) |

**Bottom line**: Cloak SDK = "library yang ngubah Solana account model jadi privacy-preserving UTXO model dengan ZK proof". Tanpa SDK, kita gak bisa bikin Tirai (yang inti privasi-nya butuh ZK proof generation di browser).

---

## 3c. Flow integrasi end-to-end (untuk Bima)

Tirai punya **3 user journey** yang saling terhubung. Berikut alur penuh dari user click sampai chain confirmed, plus state yang frontend wajib track.

### 🔵 Flow A — Project bayar bounty (`/pay`)

```
[User project buka /pay]
   ↓ fill form: amount=0.01 SOL, label="bug XSS", memo="optional"
   ↓ klik tombol "Pay Bounty"
   ↓
[Frontend] connect Phantom wallet, ambil publicKey + signTransaction
   ↓
[adapter] payBountyAdapter(connection, wallet, input)
   ↓ call createBountyPayment(input, ctx)
   ↓
[ProgressDialog] tampilkan: "Validating..." → "Generating proof..." (~30s)
                                         → "Submitting..." → "Done"
   ↓
[Cloak SDK] transact() generate ZK proof + submit via relay Cloak
   ↓ (~30 detik untuk proof gen + ~5 detik untuk relay confirm)
   ↓
Returns Result<BountyPaymentResult, AppError>
   ↓
   ┌─ ok: true → SuccessScreen ────────────────────────┐
   │  • Render QR dari ticket.raw                       │
   │  • Tombol "Copy Ticket" + "Copy Viewing Key"       │
   │  • Solscan link dari signature                     │
   │  • CTA: "Share ticket ke researcher via Telegram"  │
   │  • Save viewingKey ke project's local store        │
   │    (localStorage / IndexedDB) untuk /audit nanti   │
   └─ ok: false → ErrorState (lihat error mapping ↓)   ┘
```

**State yang frontend WAJIB persist setelah `/pay`:**

| Field | Tempat persist | Kenapa |
|---|---|---|
| `viewingKey` (64 hex) | localStorage (key: `tirai:vk:<wallet-pubkey>`) | Untuk `/audit` nanti — auditor butuh ini scan history |
| `ticket.raw` (~447 chars) | **JANGAN persist di app** | Privacy: biarkan user yang share via Telegram, jangan store di server kita |
| `signature` | Bisa persist sebagai history (optional) | Untuk show di list "bounty saya yang udah dibayar" |
| `label` ↔ `signature` mapping | localStorage (project bookkeeping) | Karena `scanAuditHistory` return `label: ""` (chain gak bawa label), project sendiri yang correlate |

### 🟢 Flow B — Researcher claim bounty (`/claim`)

```
[Researcher buka /claim, paste ticket dari Telegram]
   ↓ klik tombol "Inspect"
   ↓
[adapter] inspectTicketAdapter(connection, ticketRaw)
   ↓ call inspectClaimTicket(ticketRaw, ctx)
   ↓ (~200-300ms — fast, no proof gen)
   ↓
   ┌─ ok: true → render preview card ──────────────────┐
   │  • Amount: 0.01 SOL                                │
   │  • Token: SOL (or "USDC" if SPL)                   │
   │  • Label: "bug XSS"                                │
   │  • Status: ✅ Claimable / ❌ Already claimed       │
   │  • Tombol "Claim" (disabled jika !isClaimable)    │
   └─ ok: false → ErrorState                            ┘
   ↓
[User klik "Claim"]
   ↓ pilih mode: 🆕 Fresh wallet / 👛 Use my wallet
   ↓
   ├─ Fresh mode ─────────────────────────────────┐
   │  • Tidak butuh wallet connection             │
   │  • Klik konfirm → call claimBounty(...,      │
   │    mode: { kind: "fresh" })                  │
   │                                               │
   ├─ Existing mode ──────────────────────────────┤
   │  • Butuh wallet connection (Phantom dll)     │
   │  • Connect → call claimBounty(...,           │
   │    mode: { kind: "existing", signer })       │
   │                                               │
   ↓
[ProgressDialog] "Validating..." → "Generating proof..." (~30s)
                                → "Submitting..." → "Done"
   ↓
[Cloak SDK] fullWithdraw() ZK proof + relay submit
   ↓
Returns Result<ClaimBountyResult, AppError>
   ↓
   ┌─ ok: true, mode: "fresh" → SaveKeyDialog ─────────┐
   │  • SHOW SECRETKEY 1× (mnemonic / base58 / hex)    │
   │  • Tombol "Copy" + checkbox "I saved it"          │
   │  • Setelah dialog ditutup:                        │
   │    secretKey.fill(0)  ← zero-out memory           │
   │  • Tampilkan destination address + Solscan tx     │
   │                                                    │
   ├─ ok: true, mode: "existing" → SuccessScreen ──────┤
   │  • Tampilkan destination + Solscan tx             │
   │  • Tidak ada secretKey                            │
   │                                                    │
   └─ ok: false → ErrorState                            ┘
```

**State yang frontend WAJIB handle hati-hati di `/claim`:**

| Hal | Aturan | Kenapa |
|---|---|---|
| `secretKey` (Uint8Array) | **Display sekali, lalu `secretKey.fill(0)`. Jangan masuk state global, localStorage, telemetry.** | Privacy: bocor = wallet kosong selamanya |
| Logger/Sentry breadcrumb | Filter `secretKey`, `viewingKey`, `ticket` dari semua log | Privacy boundary, rules.md §0 |
| URL params | `secretKey` JANGAN pernah masuk URL | Browser history → leak |

### 🟡 Flow C — Project audit history (`/audit`)

```
[User project buka /audit]
   ↓ Auto-load viewingKey dari localStorage (jika ada)
   ↓ Atau prompt: "Paste viewing key" (kalau pertama kali / device baru)
   ↓ klik tombol "Scan History"
   ↓
[adapter] scanAuditAdapter(connection, viewingKey)
   ↓ call scanAuditHistory({viewingKey}, ctx)
   ↓ ⚠️ Slow path: ~30-90 detik (200-500 RPC calls)
   ↓ Show ScanProgressDialog dengan onProgress callback (TBD)
   ↓
[Cloak SDK] scanTransactions() pull all program tx + decrypt
   ↓
Returns Result<AuditHistory, AppError>
   ↓
   ┌─ ok: true → render dashboard ─────────────────────┐
   │  • SummaryCard: totalPayments, totalVolume,       │
   │    latestActivityAt                               │
   │  • Table (paginated jika banyak):                 │
   │    timestamp | status | amount | mint | sig       │
   │  • Tombol "Download CSV" + "Download PDF"         │
   └─ ok: false → ErrorState                            ┘
   ↓
[User klik "Download CSV/PDF"]
   ↓
[adapter] exportAuditAdapter(history, "csv" | "pdf")
   ↓ call exportAuditReport(history, format)
   ↓ Returns Result<Blob, AppError>
   ↓
[Trigger browser download]
   • const url = URL.createObjectURL(blob)
   • <a href={url} download="tirai-audit-2026-05-07.csv" />
   • setTimeout(() => URL.revokeObjectURL(url), 0)
```

**Catatan penting `/audit`:**

| Hal | Aturan | Kenapa |
|---|---|---|
| `label` di tabel | Render "—" atau correlate dari project bookkeeping | `AuditEntry.label` selalu `""` (label gak on-chain) |
| `recipient` column | **TIDAK ADA** di output kita | Privacy boundary 3 — auditor gak boleh tau alamat researcher |
| Empty state | `entries: []` valid — render "No activity yet" | Auditor bisa scan VK yang belum pernah dipakai |
| RPC slow | Kasih ScanProgressDialog dgn estimasi waktu | Tanpa indicator, user kira app freeze |

---

### 📡 State + data flow lintas page (overview)

```
                 ┌─────────────────────────────────────────┐
                 │  Project user (yang bayar bounty)       │
                 └──────────────┬──────────────────────────┘
                                │ 1. Pay /pay
                                ↓
   ┌────────────────────────────────────────────────────────┐
   │  createBountyPayment → { ticket, viewingKey, sig }     │
   └────┬──────────────┬────────────────────────────────────┘
        │              │
        │ 2. Save VK   │ 3. Share ticket via Telegram (off-app)
        ↓              ↓
   ┌─────────┐   ┌──────────────────────────────────────────┐
   │localStor│   │  Researcher (di luar app, di Telegram)   │
   │age (VK) │   └──────────────┬───────────────────────────┘
   └────┬────┘                  │ 4. Open /claim, paste ticket
        │                       ↓
        │              ┌──────────────────────────────────┐
        │              │  inspectClaimTicket → preview    │
        │              │  → claimBounty → withdraw + sig  │
        │              └──────────────────────────────────┘
        │
        │ 5. Later: project audit
        ↓
   ┌──────────────────────────────────────────────────────┐
   │  scanAuditHistory(VK) → entries[]                    │
   │  → exportAuditReport(entries, "pdf"|"csv") → Blob    │
   └──────────────────────────────────────────────────────┘
```

**Penting:** `ticket` itu privasi sensitif (siapa pegang, dia bisa claim). Frontend kita **TIDAK** boleh persist ticket — biarkan project share manually via Telegram/email. Yang persist cuma viewing key (read-only audit access, bukan spending).

---

### ⚠️ Error handling — AppError kind ↔ UI behavior

Semua function return `Result<T, AppError>`. AppError adalah discriminated union dengan 9+ kind. Mapping rekomendasi ke UI:

| `error.kind` | Kapan kejadiannya | UI behavior |
|---|---|---|
| `INVALID_INPUT` | Input format salah (mint bukan base58, dll) | Show inline form error, highlight field `error.field` |
| `INSUFFICIENT_BALANCE` | Wallet kurang SOL untuk deposit + fee | Show "Top up wallet, butuh ≥X SOL" |
| `USER_REJECTED` | User batalkan signing di Phantom | Silent — close dialog, balik ke form |
| `NULLIFIER_CONSUMED` | Ticket sudah pernah di-claim | "Ticket sudah pernah di-redeem" + tombol "Lihat di Solscan" |
| `WRONG_CLUSTER` | Ticket cluster ≠ ctx.cluster | "Ticket ini untuk {expected} network, bukan {got}" |
| `RPC` | RPC error (429, network, timeout) | "Network error, coba lagi" + retry button (kalau `retryable: true`) |
| `PROOF_GENERATION_FAILED` | ZK prover gagal (rare) | "Proof generation failed, refresh dan coba lagi" |
| `TICKET_DECODE_FAILED` | Ticket malformed | "Ticket tidak valid — pastikan kamu copy lengkap" |
| `VIEWING_KEY_INVALID` | VK bukan 64 hex chars | "Viewing key harus 64 karakter hex" |
| `UNKNOWN` | Fallback untuk error gak ke-handle | "Terjadi kesalahan: {message}" + Sentry log |

Pattern recommended di adapter layer:

```ts
const result = await createBountyPayment(input, ctx);
if (!result.ok) {
  switch (result.error.kind) {
    case "INVALID_INPUT": throw new FormError(result.error.field, result.error.message);
    case "USER_REJECTED": return null; // silent
    case "RPC": if (result.error.retryable) showRetryToast(); else showErrorToast(result.error.message); break;
    // ... map lainnya
    default: showGenericError(result.error);
  }
  return null;
}
return result.value;
```

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

| Hari | Deliverable                                                     | Status        |
| ---- | --------------------------------------------------------------- | ------------- |
| 1–3  | Types + ticket encode/decode + `createBountyPayment`            | ✅ done        |
| 4    | `inspectClaimTicket` + `claimBounty` (fresh + existing) + e2e   | ✅ done        |
| 5    | `scanAuditHistory` + `exportAuditReport` (PDF + CSV) + e2e      | ✅ done        |
| ~~6~~  | ~~Mainnet rehearsal~~                                           | ❌ skipped    |
| 6    | Demo prep — DoD sweep + README + recording                      | ⏳ next        |

**Decision 2026-05-07:** demo + submission pakai **devnet only**. Mainnet rehearsal di-skip — Cloak Track judges focus ke privacy implementation, bukan mainnet evidence. Solscan links di pitch wajib pakai `?cluster=devnet` query param.

Backend implementation done. Tinggal demo prep:

- Sweep instruction.md §11 DoD checklist
- README backend (kalau belum)
- `pnpm approve-builds` untuk turun proof gen ~30s → ~3s (UX demo)
- Recording demo flow (pay → claim → audit) dengan devnet

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
