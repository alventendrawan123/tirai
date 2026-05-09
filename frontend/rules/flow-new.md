# Tirai — Flow Lengkap (Bounty Board + Privacy Payout)

**Status:** ✅ Live di devnet · 2026-05-09
**Replaces:** flow-sederhana.md (yang lama, hanya cover Pay/Claim/Audit standalone tanpa bounty layer)

> Dokumen ini cover end-to-end flow setelah integrasi bounty board (auth-server Railway + Supabase). Semua pre-existing pages (`/pay`, `/claim`, `/audit`) tetap jalan standalone — bounty board cuma nambah layer "matching" antara owner ↔ researcher.

---

## Daftar Isi

1. [Pre-requisites](#1-pre-requisites)
2. [Persona & wallet setup](#2-persona--wallet-setup)
3. [Flow utama: Bounty board end-to-end](#3-flow-utama-bounty-board-end-to-end)
4. [Privacy invariants per step](#4-privacy-invariants-per-step)
5. [Flow alternatif (tanpa bounty board)](#5-flow-alternatif-tanpa-bounty-board)
6. [Auditor / compliance flow](#6-auditor--compliance-flow)
7. [Recovery flows](#7-recovery-flows)
8. [Demo script (≤5 menit)](#8-demo-script-5-menit)

---

## 1. Pre-requisites

**Sekali setup** (untuk semua persona):

- Phantom / Solflare browser extension
- Devnet mode aktif: Phantom Settings → Developer Settings → **Testnet Mode**
- Devnet SOL di wallet (mini 0.2 SOL untuk owner, 0.05 untuk researcher fee buffer):
  - Faucet: https://faucet.solana.com/
  - CLI: `solana airdrop 1 <pubkey> --url https://api.devnet.solana.com`

**Untuk demo flow lengkap**: butuh **2 wallet berbeda**.
- Wallet A (Owner) — bisa Phantom default
- Wallet B (Researcher) — bisa Solflare, atau Phantom account kedua, atau browser/profile lain

Kenapa 2 wallet? Owner ngga bisa apply ke bounty miliknya sendiri (UI cek `ownerWallet === currentWallet`).

---

## 2. Persona & wallet setup

| Persona | Apa yang dia lakukan | Hal yang dipegang |
|---|---|---|
| 🟦 **Owner** (project / company) | Buat bounty, accept researcher, bayar | Treasury wallet (SOL untuk reward) |
| 🟩 **Researcher** (whitehat / bug hunter) | Browse bounty, apply, claim payout | Wallet untuk receive (atau fresh wallet) |
| 🟨 **Auditor** (compliance / accounting) | Scan history pakai viewing key | Viewing key dari Owner |

---

## 3. Flow utama: Bounty board end-to-end

```
Owner (Wallet A)                         Researcher (Wallet B)
─────────────────                        ──────────────────────

1. Connect wallet di /bounties
2. Klik "Sign in with wallet"
   → Phantom popup → sign challenge
   → JWT 1 jam tersimpan di session
3. Klik "New bounty" → /bounties/new
4. Isi form (title, description, reward,
   deadline, eligibility)
   • Pakai autocomplete title untuk
     auto-fill description template
5. Submit → bounty muncul di /bounties
   dengan badge OPEN

6. Tunggu researcher apply…
                                          7. Open Tirai di browser/wallet lain
                                          8. Connect Wallet B di /bounties
                                          9. Browse list, klik bounty target
                                         10. Klik "Apply to bounty"
                                             → /bounties/[id]/apply
                                         11. Sign in dengan Wallet B (sekali)
                                         12. Isi submission text
                                             + contact handle (mis. @bima_tg)
                                         13. Submit → application status: pending

14. Reload bounty detail → applications
    section nampak app baru
15. Review submission, klik Accept
    → toast "Application accepted"
    → otomatis redirect /pay?bountyId=
16. Pay form pre-filled (amount + label
    locked dari bounty)
17. Klik "Pay bounty" → Phantom popup
    → sign tx → Cloak deposit confirmed
    → bounty status auto-update ke PAID

18. Lihat success card:
    • QR code ticket
    • "Send to: @bima_tg" banner
    • Tombol "Copy ready-to-send message"
19. Buka Telegram → paste message →
    kirim ke @bima_tg

                                         20. Terima ticket via Telegram
                                         21. Buka /claim → paste ticket
                                         22. Inspect → tampil amount + token
                                         23. Pilih wallet target:
                                             • "Claim to my wallet" (Wallet B)
                                             • "Claim to fresh wallet"
                                               (max privacy — wallet baru,
                                                tidak terkait ke Wallet B)
                                         24. Klik Claim → ZK proof generate
                                             → tx confirmed
                                         25. SOL masuk ke wallet target
                                             • Kalau fresh wallet:
                                               save secret key dari modal
                                               → import ke Phantom kapan saja

26. Lihat /bounties tab "Paid" →
    bounty CSRF muncul dengan badge
    PAID (hijau)
                                         27. Selesai. SOL siap dipakai.
                                             Owner ngga tahu wallet B/fresh
                                             yang receive — itu privacy fitur,
                                             bukan bug.
```

---

## 4. Privacy invariants per step

| Step | Apa yang publik di chain / Supabase | Apa yang TETAP private |
|---|---|---|
| 1-6 (create bounty) | Owner pubkey, title, description, reward, deadline | — |
| 7-13 (apply) | Researcher pubkey, submission_text, contactHandle | — |
| 14-15 (accept) | Application status berubah ke "accepted" | — |
| 16-17 (pay) | **Cloak deposit tx (sender = Owner pubkey, amount, fee)** + bounty status "paid" + payment_signature | **Receiver wallet, ticket isi, viewing key** |
| 18-19 (deliver) | — (off-chain message di Telegram) | **Ticket itself** — Tirai never sees it after Pay returns |
| 20-25 (claim) | **Cloak withdraw tx (receiver = wallet researcher, amount)** | **Tidak bisa di-link ke deposit** kecuali punya viewing key |

**Kunci privacy**: deposit (step 17) dan withdraw (step 24) terjadi di Cloak shielded pool yang sama. Outside observer cuma lihat:
- Wallet A deposit X SOL ke pool (banyak orang lain juga deposit)
- Wallet B withdraw X SOL dari pool (banyak orang lain juga withdraw)
- **Tidak ada link** "A → B" karena ZK proof menyembunyikan source UTXO
- Cuma Owner (yang punya viewing key) yang bisa scan history-nya sendiri

---

## 5. Flow alternatif (tanpa bounty board)

Untuk OG users yang udah handle "matching" off-chain (Discord, langsung kontrak), bisa skip bounty board sepenuhnya:

```
Owner                              Researcher
──────                             ──────────
1. Buka /pay langsung
2. Isi amount + label manual
3. Bayar via Cloak
4. Copy ticket
5. Kirim via Telegram/email      ──▶ 6. Buka /claim
                                     7. Paste ticket → claim
```

Tidak butuh sign-in auth-server, ngga butuh isi form bounty di /bounties/new. Cuma `/pay` + `/claim` standalone. Cocok untuk private ad-hoc payment.

---

## 6. Auditor / compliance flow

Owner perlu kasih viewing key (yang muncul di /pay success card setelah deposit) ke auditor. Auditor:

```
1. Buka /audit
2. Connect wallet (any wallet, ngga harus Owner)
3. Paste viewing key (64 hex chars) dari Owner
4. Klik "Scan history"
5. Tunggu ~3 detik (Supabase query + trial-decrypt local)
6. Lihat tabel transaksi:
   • Tanggal, amount, status (deposited/claimed)
   • Solscan link untuk verify on-chain
7. Klik "Download CSV" / "Download PDF" untuk report
```

**Auditor TIDAK BISA lihat**:
- Wallet receiver setiap claim — kolom "destination" tidak ada di SDK output, by design
- Bounty mana yang link ke deposit mana — tidak ada relationship Bounty ↔ Cloak tx selain `payment_signature` (cek manual)

---

## 7. Recovery flows

**Owner kehilangan ticket sebelum sempat kirim**:
1. Buka `/audit`, paste viewing key
2. Cari signature deposit terbaru (timestamp + amount cocok)
3. (Future feature) "Re-derive ticket from signature" — belum ada UI, butuh manual via Cloak SDK

**Researcher kehilangan secret key fresh wallet**:
- Tidak bisa direcover. Itu sebabnya save-key dialog ngga bisa dismiss kecuali ✅ "I have saved it"
- Mitigasi: pas claim, pilih "Claim to my wallet" (Wallet B) — lebih aman karena wallet B sudah ada backup

**Bounty status stuck "open" padahal sudah dibayar**:
- Reload `/bounties/[id]` — status update lewat Supabase, kadang ada lag
- Kalau masih stuck: buka `/pay?bountyId=<id>` lagi (sign in dulu) — useEffect akan retry mark-as-paid

**JWT expired (1 jam)**:
- Toast "Sign in expired" muncul saat mutation gagal
- Klik "Sign in with wallet" lagi → 1 click, dapet JWT baru

---

## 8. Demo script (≤5 menit)

**Setup** (sebelum recording):
- Browser A: Phantom, Wallet A airdrop 0.2 SOL
- Browser B: Solflare, Wallet B airdrop 0.05 SOL
- Telegram desktop terbuka (atau pakai Discord DM)
- Stopwatch

**Recording**:

| Menit | Action |
|---|---|
| 0:00 | Browser A → /bounties → Klik "New bounty" |
| 0:15 | Sign in (sekali click), isi form (pakai autocomplete title) |
| 0:45 | Submit → bounty muncul di list |
| 1:00 | Switch ke Browser B → /bounties → klik bounty |
| 1:20 | Sign in Wallet B → klik Apply → isi form + contact `@demo_handle` |
| 1:50 | Submit application |
| 2:00 | Switch ke Browser A → reload bounty detail → Accept application |
| 2:15 | Auto-redirect ke /pay → klik Pay → Phantom sign → Cloak deposit |
| 2:45 | Success card muncul, copy "ready-to-send message" |
| 3:00 | Paste ke Telegram (or show pre-prepared message) → kirim ke "researcher" |
| 3:15 | Switch ke Browser B → "terima" di Telegram → buka /claim |
| 3:30 | Paste ticket → inspect → pilih "Claim to fresh wallet" |
| 4:00 | ZK proof generate (~10-20s) → tx confirmed |
| 4:30 | Save fresh wallet secret key (modal non-dismissable) → ✅ I have saved it |
| 4:45 | Show /bounties tab "Paid" → bounty terlihat dengan badge PAID hijau |
| 5:00 | (optional) Switch back ke Browser A → /audit → paste VK → show tx history |

**Talking points**:
- "Setup-nya wallet only — no email, no password, no KYC"
- "Setiap step privacy-preserving by default — owner ngga tahu researcher wallet"
- "Bounty board cuma untuk matching, payout-nya pakai Cloak ZK proofs"
- "Auditor bisa scan compliance pakai viewing key, tapi tetap ngga bisa link ke recipient"

---

## Pertanyaan?

- **UX issue / bug**: tag Bima
- **Backend / API issue**: tag Alven, lihat `backend/rules/`
- **Cloak SDK issue**: lihat `skills/cloak/SKILL.md`
- **Test plan**: lihat `frontend/rules/test-plan.md`
- **Older flow doc** (sebelum bounty board): `frontend/rules/flow-sederhana.md`
