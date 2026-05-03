# TIRAI

**Privacy-first bounty payouts for Solana whitehats**

Hackathon Cloak · Frontier Track

---

Tirai adalah sistem pembayaran bounty yang menempatkan privasi sebagai prioritas utama. Dibangun di atas Cloak SDK dengan ZK proof (Groth16) untuk memutus tautan on-chain antara identitas researcher dan pembayaran.

---

## Daftar Isi

1. [Arsitektur Berlapis](#1-arsitektur-berlapis)
2. [Tech Stack & Tanggung Jawab](#2-tech-stack--tanggung-jawab)
3. [User Flow — Project](#3-user-flow--project)
4. [User Flow — Researcher](#4-user-flow--researcher)
5. [User Flow — Auditor](#5-user-flow--auditor)
6. [End-to-End Sequence Diagram](#6-end-to-end-sequence-diagram)
7. [Catatan Implementasi](#7-catatan-implementasi)

---

## 1. Arsitektur Berlapis

Sistem Tirai dibangun dalam **5 layer yang independen**. Setiap layer punya owner yang jelas dan boundary kontrak yang explicit — supaya Bima dan Alven bisa kerja paralel tanpa saling block.

```
USER ROLES
├── PROJECT (treasury, payer)
├── RESEARCHER (whitehat, claimant)
└── AUDITOR (compliance reviewer)

FRONTEND LAYER · Next.js + React + Wallet Adapter
Owner: Bima · Pages: /pay (project), /claim (researcher), /audit (auditor)
├── Pay Bounty UI
├── Claim Page
└── Audit Dashboard

TIRAI API LAYER · TypeScript wrapper around Cloak SDK
Owner: Alven · Files: lib/tirai/{bounty,claim,audit,utils}.ts
├── createBountyPayment
├── claimBounty
├── scanAuditHistory
└── exportAuditReport

CLOAK SDK LAYER · @cloak.dev/sdk (ZK proof generation)
External dependency · Groth16 proofs · Poseidon Merkle tree
├── transact
├── fullWithdraw
├── genUtxoKey
├── scanTx
└── complianceRpt

SOLANA MAINNET · Cloak Shield Pool Program
Program ID: zh1eLd6rSphLejbFfJEneUwzHRfMKxgzrgkfwA6qRkW
(Already deployed by Cloak — we don't deploy)
```

### Penjelasan per Layer

**Layer 1 — User Roles**
Tiga aktor yang berinteraksi dengan Tirai. Project punya kontrol penuh atas pembayaran. Researcher hanya bisa claim ticket yang diterima. Auditor hanya bisa lihat history (read-only).

**Layer 2 — Frontend (Bima)**
Next.js + React. 3 route utama: `/pay` untuk project, `/claim` untuk researcher, `/audit` untuk auditor. Wallet integration via `@solana/wallet-adapter-react` (Phantom + Solflare).

**Layer 3 — Tirai API (Alven)**
TypeScript module yang wrap Cloak SDK. Tinggal di `lib/tirai/`. Expose 4 fungsi utama (`createBountyPayment`, `claimBounty`, `scanAuditHistory`, `exportAuditReport`) plus utilities. Tugas layer ini: encoding ticket, error handling, retry logic, validasi input, format output.

**Layer 4 — Cloak SDK**
Dependency external: `@cloak.dev/sdk`. Generate ZK proof (Groth16), build Poseidon Merkle tree, sign + submit tx ke Solana. Kita tidak modify atau extend SDK — cuma konsumsi API-nya.

**Layer 5 — Solana Mainnet**
Cloak Shield Pool program sudah deployed oleh tim Cloak. Program ID: `zh1eLd6rSphLejbFfJEneUwzHRfMKxgzrgkfwA6qRkW`. Kita tidak deploy program apa pun — semua logic on-chain sudah jadi.

> **Arsitektur ini intentionally minimal:** tidak ada server backend, tidak ada database, tidak ada smart contract baru. Semua logic Tirai jalan di browser user. Ini bikin sprint 10 hari realistic — kita fokus integrasi, bukan infra.

---

## 2. Tech Stack & Tanggung Jawab

| Komponen | Tool / Library | Owner |
|---|---|---|
| Frontend framework | Next.js 14 (app router) | Bima |
| UI styling | Tailwind CSS + shadcn/ui | Bima + Neysa |
| Wallet integration | @solana/wallet-adapter-react | Bima |
| Privacy SDK | @cloak.dev/sdk (mainnet) / @cloak.dev/sdk-devnet | Alven |
| Solana RPC | @solana/web3.js, @solana/kit (optional) | Alven |
| PDF report generation | pdf-lib (browser-side) | Alven |
| QR code generation | qrcode.react | Bima |
| Local dev environment | Surfpool (Solana fork) | Alven |
| Branding & demo video | Figma + video editor | Neysa |

### Repository Structure

Single Next.js repository. Tidak ada split frontend/backend karena semua jalan di browser.

```
tirai/
├── app/                          [Bima]
│   ├── layout.tsx
│   ├── page.tsx                  (landing)
│   ├── pay/page.tsx              (project dashboard)
│   ├── claim/page.tsx            (researcher claim)
│   └── audit/page.tsx            (auditor dashboard)
│
├── components/                   [Bima]
│   ├── ui/                       (shadcn/ui primitives)
│   ├── ProgressDialog.tsx
│   ├── ClaimTicketDisplay.tsx
│   └── BountyTable.tsx
│
├── lib/
│   └── tirai/                    [Alven]
│       ├── api.ts                (re-exports public API)
│       ├── bounty.ts             (createBountyPayment)
│       ├── claim.ts              (claimBounty, inspectClaimTicket)
│       ├── audit.ts              (scanAuditHistory, exportAuditReport)
│       ├── ticket.ts             (encode/decode claim tickets)
│       └── utils.ts              (formatAmount, calculateBountyFee)
│
├── types/                        [Alven]
│   └── api.ts                    (TypeScript contract from sign-off)
│
└── public/                       [Neysa]
    ├── logo.svg
    └── favicon.ico
```

---

## 3. User Flow — Project

Project berinteraksi via halaman `/pay`. Mereka connect wallet treasury, masukkan amount + label researcher, dan klik Pay. Hasilnya: claim ticket (string opaque) yang harus di-share ke researcher lewat channel aman (QR code, link, Discord DM).

```
[1. Open Dashboard] → [2. Click Pay] → [3. Wallet Sign] → [4. ZK Proof + Submit] → [5. Get Claim Ticket]
 User input             FE → API call     Phantom popup      SDK generates            Display QR code
 amount + label         createBounty      signs deposit tx   proof, sends tx          share to researcher
                        Payment
```

**On-chain result (publicly visible):**
- ✓ Project's wallet deposited X amount to Cloak shield pool
- ✗ NO link from project's wallet to any researcher wallet (researcher wallet doesn't exist yet on-chain)

> Privacy property terjamin di langkah 4 ketika ZK proof di-generate.

---

## 4. User Flow — Researcher

Researcher buka link claim atau scan QR code. Halaman `/claim` langsung inspect ticket (preview tanpa transaksi), tampilkan amount yang akan diterima. Researcher pilih mode wallet — **fresh** (Tirai generate keypair baru, paling private) atau **existing** (pakai wallet adapter mereka, less private). Klik claim.

```
[1. Open Claim Link] → [2. Inspect Ticket] → [3. Choose Wallet Mode] → [4. ZK Proof + Withdraw] → [5. Receive + Save Key]
 Click QR or            API call               Fresh (default)           SDK proves                 Funds in wallet
 paste ticket           inspectClaimTicket     or existing               + fullWithdraw()           save secretKey!
```

**On-chain result (publicly visible):**
- ✓ Cloak shield pool unshielded X amount to a fresh wallet
- ✗ NO link from researcher's identity (KYC) to this fresh wallet — ZK proof verifies validity without revealing source

> **Critical UX:** di langkah 5, kalau mode fresh dipilih, tampilkan dialog dengan WARNING besar untuk save secret key.

---

## 5. User Flow — Auditor

Auditor menerima viewing key dari project (off-chain channel). Mereka paste key di halaman `/audit`. Tirai panggil `scanTransactions` dari Cloak SDK, decrypt history, tampilkan dashboard. Auditor bisa export jadi PDF atau CSV untuk filing compliance.

```
[1. Receive Access Key] → [2. Open Audit Page] → [3. Scan History] → [4. Review Dashboard] → [5. Export Report]
 Project shares            Paste key               API call            See payments            Download PDF
 viewing key               at /audit               scanAuditHistory    + summary               or CSV
```

**What the auditor sees (private to them, never public):**
- ✓ List of all bounty payments: amount, date, claim status, memo
- ✗ Researcher's destination wallet — NEVER visible to auditor (viewing key has read-only scope, not link-trace scope)

> Yang krusial: di langkah 4, dashboard TIDAK menampilkan wallet ujung researcher. Field itu intentionally absent dari API contract.

---

## 6. End-to-End Sequence Diagram

```
PROJECT          CLOAK POOL         RESEARCHER         AUDITOR
   |                  |                  |                  |
   |--1. transact()-->|                  |                  |
   |    (deposit,     |                  |                  |
   |     ZK proof     |                  |                  |
   |     ~3s)         |                  |                  |
   |<--2. claim ticket|                  |                  |
   |                  |                  |                  |
   |--3. share ticket (off-chain)------->|                  |
   |                  |                  |                  |
   |                  |<-4. fullWithdraw()|                 |
   |                  | (nullifier        |                  |
   |                  |  consumed)        |                  |
   |                  |--5. funds to ----->                  |
   |                  |    fresh wallet   |                  |
   |                  |                  |                  |
   |--6. share viewing key (off-chain)----------------->    |
   |                  |                  |                  |
   |                  |<-7. scanTransactions()------------- |
   |                  |--8. history (read-only)------------>|
```

Steps 1, 2, 4, 5, 7, 8 happen **on-chain**. Steps 3 and 6 are **off-chain** (ticket and viewing key transmission). The Cloak pool is the privacy boundary that breaks on-chain links between actors.

### Privacy Boundaries

Ada **3 privacy boundary** di sequence ini, masing-masing melindungi tipe link yang berbeda:

**Boundary 1 — Project ↔ Researcher (link wallet)**
Aktif di step 1-5. Cloak pool break link langsung dari treasury project ke wallet ujung researcher. Observer on-chain lihat dua transaksi terpisah, tidak bisa correlate.

**Boundary 2 — Researcher ↔ Public (link KYC)**
Aktif di step 5. Researcher receive ke fresh wallet yang belum pernah ada riwayat. Wallet ini tidak ter-link ke KYC identity mereka di Immunefi atau exchange.

**Boundary 3 — Auditor ↔ Researcher (read-only scope)**
Aktif di step 7-8. Auditor pegang viewing key (read-only), bisa lihat fakta pembayaran tapi tidak bisa trace wallet ujung researcher. Cryptographically enforced di SDK.

---

## 7. Catatan Implementasi

### Sprint Plan 10 Hari

| Hari | Alven (SDK / Backend) | Bima (Frontend) | Neysa (Design) |
|---|---|---|---|
| 1-2 | Setup repo, explore Cloak SDK pakai Quickstart, test transact + fullWithdraw di Surfpool | Setup Next.js, Tailwind, wallet adapter, mock API dari TypeScript contract | Wireframe 3 page utama, branding finalize |
| 3-4 | Implement createBountyPayment + claim ticket encoding/decoding | Build /pay page dengan loading states + progress dialog | UI mockup high-fidelity, asset svg + logo |
| 5-6 | Implement claimBounty + retry pattern + fresh wallet generation | Build /claim page, integrate API real (no mock) | Demo video script + storyboard |
| 7-8 | Implement scanAuditHistory + exportAuditReport (PDF + CSV) | Build /audit page, end-to-end mainnet test | Record demo video raw footage |
| 9 | Bug fixes, edge case handling, README polish | Polish UI, transitions, error messages | Edit + finalize demo video <5 menit |
| 10 | Final mainnet test, deploy ke Vercel | Submit ke Colosseum portal | Upload video, finalize submission |

### Risk & Mitigation

- **SDK learning curve.** Alven first-time pakai Cloak SDK. Mitigation: hari 1-2 fokus eksplorasi sebelum design API. Surfpool untuk testing tanpa biaya gas.
- **Mainnet vs devnet timing.** Demo harus mainnet untuk credibility. Mitigation: develop di devnet, test mainnet di hari 8, demo final di mainnet.
- **Wallet adapter UX.** Phantom popup bisa block atau fail. Mitigation: pakai progress callback dari SDK + clear error messages dari `parseError()`.
- **Demo video time pressure.** Neysa harus shoot day 7-8, edit day 9. Mitigation: storyboard sudah lock day 5, pre-record narasi day 6.
- **Submission deadline.** Colosseum portal harus submit sebelum 14 Mei. Mitigation: submit di hari 10 pagi, leave buffer untuk fix kalau ada masalah upload.

### Definition of Done

Tirai dianggap submission-ready ketika:

- Live mainnet demo: project bisa pay, researcher bisa claim, auditor bisa scan + export — semua di Solana mainnet
- GitHub repo public dengan README lengkap, MIT/Apache license
- Demo video <5 menit, narrating problem + solution + live demo
- Submission ke Colosseum portal lengkap dengan semua fields
- Side-by-side Solscan comparison di video — visible link (without Tirai) vs no visible link (with Tirai)

---

*Dokumen ini adalah blueprint awal — akan di-update kalau ada decision baru selama sprint.*
