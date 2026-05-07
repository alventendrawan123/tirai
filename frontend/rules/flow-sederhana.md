# Manual Testing Flow — Tirai Frontend

Panduan **klik-per-klik** untuk uji semua fitur Tirai dari awal sampai akhir, manual di browser. Pakai dokumen ini saat:
- Mau verify fitur baru sebelum push
- Latihan sebelum recording demo Cloak Track
- Onboarding orang baru ke project

> Untuk test otomatis (Vitest / Playwright / K6) lihat [`test-plan.md`](./test-plan.md).
> Dokumen ini fokus ke flow manual user real.

---

## Daftar Isi

1. [Setup awal (sekali saja)](#1-setup-awal-sekali-saja)
2. [Flow 1 · Project bayar bounty (`/pay`)](#2-flow-1--project-bayar-bounty-pay)
3. [Flow 2 · Researcher claim (fresh wallet)](#3-flow-2--researcher-claim-fresh-wallet)
4. [Flow 3 · Researcher claim (existing wallet)](#4-flow-3--researcher-claim-existing-wallet)
5. [Flow 4 · Auditor scan + export (`/audit`)](#5-flow-4--auditor-scan--export-audit)
6. [Flow demo recording end-to-end (≤5 menit)](#6-flow-demo-recording-end-to-end-5-menit)
7. [Edge case yang wajib dicek manual](#7-edge-case-yang-wajib-dicek-manual)
8. [Troubleshooting cepat](#8-troubleshooting-cepat)

---

## 1. Setup awal (sekali saja)

### 1.1 Install Phantom wallet

- Buka https://phantom.app, klik **Download for Chrome** (atau browser pilihan).
- Setelah install, klik ikon Phantom di toolbar → **Create New Wallet**.
- Simpan seed phrase di password manager (JANGAN screenshot, JANGAN copy ke notes).
- Setelah wallet dibuat: ikon Phantom → roda gigi (Settings) → **Developer Settings** → **Change Network** → pilih **Devnet**.
- Verifikasi pojok kiri atas Phantom menunjukkan **Devnet** (label kecil di bawah nama wallet).

### 1.2 Top up devnet SOL

Devnet SOL gratis. Cara:

```bash
# Pakai Solana CLI (kalau install):
solana airdrop 2 <YOUR_PHANTOM_PUBKEY> --url https://api.devnet.solana.com

# Atau via web faucet:
# https://faucet.solana.com → pilih Devnet → paste pubkey → claim
```

Verifikasi balance via Phantom → harus ≥ 0.1 SOL (lebih baik 1 SOL biar leluasa untuk test berkali-kali).

### 1.3 Jalankan Tirai locally

```bash
# Dari repo root
cd frontend
pnpm install                  # kalau belum
pnpm dev                      # dev server di http://localhost:3000
```

Tunggu sampai terminal print:

```
▲ Next.js 16.x.x
- Local:        http://localhost:3000
✓ Ready in 250ms
```

Buka browser ke **http://localhost:3000**. Halaman landing harus muncul dengan:
- Hero "Privacy-first bounty payouts for Solana whitehats"
- 3 tombol CTA (Pay · Claim · Audit) dengan icon
- Background DotGrid samar di belakang teks

### 1.4 Buka Phantom & connect

- Buka tab `localhost:3000`.
- Di pojok kanan atas halaman `/pay`, `/claim`, atau `/audit` ada tombol **Select wallet**.
- Klik **Select wallet** → modal muncul dengan list wallet (Phantom + Solflare).
- Pilih **Phantom** → popup Phantom muncul minta approval → klik **Connect**.
- Setelah connect, tombol berubah jadi alamat truncated (`Abcd…WxYz`) + **Disconnect**.

> Kalau Phantom tidak ke-detect: refresh page setelah Phantom installed; pastikan ekstensi enabled untuk localhost.

---

## 2. Flow 1 · Project bayar bounty (`/pay`)

**Tujuan:** sebagai project, bayar 0.01 SOL ke bounty pool. Output: ticket (untuk researcher) + viewing key (untuk auditor).

### Langkah

1. Buka **http://localhost:3000/pay**.
2. Klik **Select wallet** kalau belum connect → pilih Phantom.
3. Form di tengah halaman:
   - **Amount**: ketik `0.01`
   - **Researcher label**: ketik `bug XSS test`
   - **Memo (optional)**: ketik `kasih ke peneliti via Telegram` (atau kosongin)
4. Lihat panel "Estimated total" di bawah form — angka berubah real-time saat ketik amount.
5. Klik tombol **Pay bounty** (pojok kanan bawah card).
6. Phantom popup muncul → review tx → klik **Approve**.
7. ProgressDialog muncul dengan 4 step: `Validate inputs` → `Generate ZK proof` (~30 detik, paling lama!) → `Submit transaction` → `Confirm on-chain`.
8. Setelah selesai, **PaySuccessCard** muncul dengan:
   - **QR code besar** (warna monokrom)
   - **Ticket amount**: `0.01 SOL` + fee info
   - **Claim ticket** box dengan string panjang base64 + tombol **Copy**
   - **Viewing key** box dengan 64-char hex + tombol **Copy**
   - Link **View transaction on Solscan**
   - Tombol **Pay another bounty**

### Verifikasi

- [ ] Klik **Solscan link** → tab baru buka, lihat tx confirmed di devnet (URL ada `?cluster=devnet`).
- [ ] Klik tombol **Copy** di Claim ticket → buka notepad → paste → harus dapat string base64url panjang ~447 char.
- [ ] Klik tombol **Copy** di Viewing key → paste → harus dapat 64 char hex.
- [ ] Buka DevTools (F12) → tab **Application** → **Local Storage** → `http://localhost:3000` → harus ada entry `tirai:vk:<wallet-pubkey>` dengan value = viewing key tadi.
- [ ] Buka DevTools → tab **Network** → cari request ke `/api/rpc` → klik → tab **Headers** → konfirmasi tidak ada API key Helius bocor di URL atau body request browser-side.
- [ ] Refresh halaman → form kosong lagi (ticket TIDAK persist — ini sengaja, karena privacy).

**Simpan untuk flow berikutnya:** copy ticket + viewing key ke clipboard / notepad. Akan dipakai di Flow 2 dan Flow 4.

---

## 3. Flow 2 · Researcher claim (fresh wallet)

**Tujuan:** sebagai researcher tanpa wallet, terima bounty ke fresh keypair baru.

### Langkah

1. Buka **http://localhost:3000/claim**.
2. **Tidak perlu connect wallet** untuk fresh mode (researcher boleh anonim).
3. Paste ticket dari Flow 1 ke textarea **Claim ticket**.
4. Tunggu ~300ms → spinner kecil muncul ("Inspecting ticket…") → preview card muncul:
   - **You will receive**: `0.01 SOL`
   - **Label**: `bug XSS test` (yang tadi diisi project)
   - **Expiry**: None
   - Badge: **Claimable** (outline, monokrom)
5. Mode wallet — radio button:
   - 🆕 **Fresh wallet (recommended)** — pilih ini.
   - 👛 **Existing wallet** — leave unchecked.
6. Klik tombol **Claim now**.
7. ProgressDialog 4 step (~30 detik) seperti di /pay.
8. **SaveKeyDialog** muncul dengan layout:
   - Title: "Save your fresh wallet secret key"
   - **Destination address** (AddressPill, klik → buka Solscan)
   - **Secret key (base58)** dalam box dengan border tebal + tombol **Copy** + tombol **Download .txt**
   - Checkbox: "I have saved this key in a password manager…"
   - Tombol **I have saved it** (DISABLED awalnya)

### Verifikasi PRIVACY (kritis)

- [ ] Coba tekan **Esc** → dialog TIDAK ditutup.
- [ ] Klik area gelap di luar dialog (overlay) → dialog TIDAK ditutup.
- [ ] Tombol **I have saved it** harus **abu-abu / disabled** sampai checkbox dicentang.
- [ ] Klik **Copy** → paste di notepad → secret key 87-88 char base58.
- [ ] Klik **Download .txt** → file `tirai-fresh-wallet-XXXXXXXX.txt` ter-download → buka → isinya cuma secret key string, tidak ada metadata.
- [ ] Centang checkbox → tombol berubah jadi hitam (enabled).
- [ ] Klik **I have saved it** → dialog tertutup.

### Verifikasi LANJUTAN

- [ ] Setelah dialog tertutup, **ClaimSuccessCard** muncul:
  - "Withdrawal complete" + status badge `Confirmed`
  - **Received (before fee)**: `0.01 SOL`
  - **Destination wallet (fresh)** AddressPill (alamat baru)
  - **View transaction on Solscan** link
  - Tombol **Claim another**
- [ ] Klik **Solscan link** → tab baru → tx withdraw confirmed.
- [ ] Buka DevTools → **Local Storage** → konfirmasi TIDAK ada entry yang isinya secret key.
- [ ] Buka DevTools → **Console** → konfirmasi tidak ada `console.log` yang print secret key.
- [ ] Coba **paste ticket yang sama lagi** → preview muncul tapi badge berubah jadi **Already claimed** (solid), tombol Claim now disabled, label `Already claimed`.

---

## 4. Flow 3 · Researcher claim (existing wallet)

**Tujuan:** sama dengan Flow 2 tapi pakai wallet adapter yang sudah connected.

### Langkah

1. Bayar bounty **baru** lewat /pay (ticket lama sudah consumed). Copy ticket.
2. Buka /claim dalam tab baru.
3. **Connect Phantom** lewat tombol **Select wallet**.
4. Paste ticket → tunggu preview.
5. Pilih radio **Existing wallet** (radio kedua).
6. Tombol Claim enabled (karena wallet connected).
7. Klik **Claim now**.
8. ProgressDialog → **TIDAK ADA SaveKeyDialog** (karena wallet sudah ada).
9. SuccessCard langsung muncul dengan destination = alamat Phantom kamu.

### Verifikasi

- [ ] **TIDAK MUNCUL** SaveKeyDialog. Kalau muncul → bug, secret key bocor.
- [ ] Destination wallet di success card = pubkey Phantom yang connected.
- [ ] Buka Phantom → Activity → harus ada incoming `~0.00497 SOL` (= 0.01 - 0.00503 fee).
- [ ] Klik Solscan link → confirm withdraw tx ke alamat Phantom.

---

## 5. Flow 4 · Auditor scan + export (`/audit`)

**Tujuan:** sebagai auditor, lihat history pembayaran lewat viewing key + export PDF/CSV.

### Langkah

1. Buka **http://localhost:3000/audit**.
2. **Connect wallet** (atau jangan, audit bisa pakai VK yang dipaste manual).
3. Cek **Viewing key** textarea:
   - Kalau wallet connected DAN sudah pernah pay bounty → field auto-prefilled dengan VK dari localStorage.
   - Kalau tidak → kosong, paste VK dari Flow 1 manually.
4. Klik **Scan history**.
5. Loading skeleton muncul (~60-90 detik di devnet free RPC). **Sabar.**
6. Setelah selesai, panel kanan render:
   - **Summary cards** (3 cards):
     - **Total payments**: angka (1, 2, dst)
     - **Total volume**: SOL amount
     - **Latest activity**: timestamp lokal
   - **Payments table** dengan kolom:
     - Date · Amount · Token · Label · Status · Tx
7. Di kolom kiri bawah, muncul **Export report** card dengan 2 tombol:
   - **Download PDF**
   - **Download CSV**

### Verifikasi PRIVACY (kritis)

- [ ] **Header tabel** TIDAK punya kolom `Destination`, `Recipient`, atau `To`. Hanya 6 kolom: Date, Amount, Token, Label, Status, Tx. **Ini wajib.**
- [ ] Setiap row tidak menampilkan alamat researcher. Yang ada: timestamp, amount, mint (atau "SOL"), label dari ticket, status badge, signature truncated.
- [ ] Klik **Download CSV** → file `tirai-audit-YYYY-MM-DD.csv` download → buka di Excel/Notepad:
  - Header row: `timestamp,amountLamports,tokenMint,label,status,signature` (atau similar)
  - **TIDAK ADA** kolom destination/recipient/to.
- [ ] Klik **Download PDF** → file `tirai-audit-YYYY-MM-DD.pdf` download → buka di PDF reader:
  - Title section, summary, dan table render dengan benar.
  - Tidak ada destination column.

### Verifikasi LAINNYA

- [ ] Coba paste VK yang invalid (misal cuma 32 char) → submit → inline error muncul: "Viewing key must be 64 hexadecimal characters."
- [ ] Coba paste VK valid format (64 hex) tapi belum pernah dipakai → setelah scan → empty state: "No payments visible to this viewing key yet" + tombol export DISABLED.
- [ ] Refresh page → kalau wallet still connected, VK auto-prefill lagi dari localStorage.

---

## 6. Flow demo recording end-to-end (≤5 menit)

Run sekali sebelum recording, latihan dulu. Target: smooth, tidak stutter, tidak ada error toast muncul.

### Persiapan (di luar recording, ~5 menit sebelum mulai)

1. Pastikan Phantom connected ke devnet, balance ≥ 0.1 SOL.
2. Clear localStorage: DevTools → Application → Local Storage → klik `http://localhost:3000` → **Clear all**.
3. Pre-warm dev server: refresh `/`, `/pay`, `/claim`, `/audit` (Next.js compile lazy, biar gak nunggu di video).
4. Open Solscan tab di background (https://solscan.io/?cluster=devnet) — siap untuk side-by-side comparison.
5. Tutup tab lain, hide bookmarks, full-screen browser. Hide notification.

### Script (target ≤5 menit)

| Detik | Action | Apa yang dikatakan / show |
|---|---|---|
| 0:00 | Open `/` | Hero render. "Tirai bayar bounty whitehat secara private di Solana." |
| 0:10 | Klik **Pay a bounty** | "Project mode, kita bayar 0.01 SOL." |
| 0:15 | Connect Phantom | "Wallet treasury connect via Phantom devnet." |
| 0:25 | Isi form (amount=0.01, label="Auth bypass") | "Amount + label. Memo optional." |
| 0:35 | Klik Pay → Phantom approve | "Sign tx. Cloak SDK akan generate ZK proof." |
| 0:40-1:10 | Wait progress (~30s) | "ZK proof gen sekitar 30 detik. Privacy bukan gratis." |
| 1:10 | Success card render | "Ticket + viewing key. Ticket dikirim ke researcher off-chain (Telegram). VK ke auditor." |
| 1:25 | Switch to Solscan tab, paste tx | "On-chain: cuma kelihatan deposit dari project ke Cloak pool. Tidak ada researcher address." |
| 1:45 | Copy ticket, ke `/claim` | "Switch role: researcher buka link claim, paste ticket." |
| 1:55 | Paste, preview render | "Inspect read-only. Researcher lihat amount + status sebelum claim." |
| 2:05 | Mode fresh, klik Claim | "Pilih fresh wallet — Tirai generate keypair baru. Maksimum privacy." |
| 2:10-2:40 | Wait progress (~30s) | "Withdraw + ZK proof." |
| 2:40 | SaveKeyDialog muncul | "Save secret key — dialog non-dismissible. Klik tidak bisa Esc / overlay." |
| 2:55 | Centang checkbox + acknowledge | "Setelah save, dialog tertutup. Secret key di-zero-out di memory." |
| 3:05 | Success card | "Withdrawal complete ke fresh wallet baru." |
| 3:10 | Solscan check withdraw tx | "On-chain withdraw: dari Cloak pool ke alamat fresh. Tidak ada link ke project." |
| 3:30 | Buka `/audit` | "Switch role: auditor scan history pakai viewing key." |
| 3:35 | VK auto-prefilled, klik Scan | "VK auto-load dari localStorage." |
| 3:40-4:30 | Wait scan (~60s di devnet) | "Scan via VK pull semua tx Cloak program, decrypt note pakai VK." |
| 4:30 | Result table | "Kolom: date, amount, token, label, status, tx. **TIDAK ADA destination wallet** — privacy boundary 3." |
| 4:40 | Klik Download PDF | "Export PDF + CSV untuk filing compliance." |
| 4:50 | Show downloaded PDF | "Reviewer bisa share ke regulator tanpa expose researcher." |
| 5:00 | End | "Tirai: project + researcher + auditor, 3 privacy boundary, satu codebase di browser." |

### Recording tools

- **Mac**: QuickTime → File → New Screen Recording.
- **Cross-platform**: OBS (free, https://obsproject.com), record at 1920×1080 30fps.
- **Voiceover**: record terpisah lalu merge di editor (lebih clean dibanding live mic).

---

## 7. Edge case yang wajib dicek manual

Test ini tidak berat tapi sering miss. Sekali lewat sebelum demo.

### 7.1 Wallet not connected

- Buka `/pay` tanpa connect Phantom.
- Form fields harus disabled, tombol Pay disabled.
- Hint text: "Connect a treasury wallet on devnet to enable."

### 7.2 Wrong cluster

- Buka Phantom → Settings → switch network ke **Mainnet**.
- Buka `/claim` → connect.
- **NetworkMismatchDialog** harus muncul: "Wrong network. Tirai is set to Devnet, but your wallet is connected to mainnet network."
- Tombol **Disconnect wallet** harus berfungsi.
- Setelah disconnect → switch Phantom balik ke Devnet → connect lagi → dialog hilang.

### 7.3 User reject signature

- Mulai pay flow. Saat Phantom popup → klik **Cancel** instead of Approve.
- Frontend harus handle: error card muncul dengan copy "Wallet signature was cancelled."
- Tombol Retry tersedia → klik → balik ke form.

### 7.4 Insufficient balance

- Drain wallet sampai balance < 0.01 SOL (transfer ke wallet lain via Phantom).
- Coba pay 0.01 SOL → submit.
- Frontend / Phantom harus reject dengan pesan jelas tentang balance.

### 7.5 Invalid ticket format

- Buka /claim, paste random string `not-a-valid-ticket-12345`.
- Setelah debounce 300ms → error card "This claim ticket is not in a recognised format."
- Form tetap visible, bisa coba paste lagi.

### 7.6 Refresh di tengah flow

- Mulai /pay, isi form, klik Pay.
- **Saat ProgressDialog muncul** → tekan F5 (refresh).
- Setelah reload, page harus fresh state. Tx mungkin tetap commit on-chain (cek Solscan), tapi UI tidak punya state — itu OK.

### 7.7 Multiple tab

- Buka /pay di tab 1, /claim di tab 2.
- Pay bounty di tab 1.
- Copy ticket → paste di tab 2.
- Claim flow harus jalan normal.

### 7.8 Dark mode

- Toggle OS dark mode (Mac: System Settings → Appearance → Dark).
- Refresh halaman.
- Semua page harus render dengan dark surface (bg hitam, text putih).
- Tidak ada flash putih saat reload.

### 7.9 Mobile responsive (Chrome DevTools)

- DevTools → toggle device toolbar (Cmd+Shift+M).
- Pilih iPhone 14 atau Pixel 7.
- Cek `/pay`, `/claim`, `/audit`:
  - Form input visible + readable.
  - Tombol >= 44px tinggi (touch target).
  - QR code di success card cukup besar untuk scan dari device lain.
  - Tabel di /audit horizontally scrollable.

---

## 8. Troubleshooting cepat

| Gejala | Penyebab | Fix |
|---|---|---|
| Phantom modal tidak muncul saat klik Select wallet | Phantom tidak ke-detect | Refresh page dengan Phantom enabled; cek extension permission untuk localhost |
| Claim "Already claimed" padahal baru pay | Nullifier sudah consumed dari demo sebelumnya | Pay bounty baru, dapat ticket baru |
| `/audit` scan loading > 2 menit | Public devnet RPC rate-limited | Set `SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_KEY` di `frontend/.env.local`, restart `pnpm dev` |
| ProgressDialog stuck di "Generate ZK proof" > 60 detik | Native bindings @cloak.dev/sdk belum di-build | Run `pnpm approve-builds` dari root, restart |
| "Wrong network" dialog muncul terus walau Phantom devnet | Genesis hash cache | Disconnect wallet → refresh page → connect lagi |
| Build error lokal | Mungkin lupa install workspace | `cd /tirai && pnpm install` dari root |
| Localstorage VK tidak prefill di /audit | Wallet bukan yang sama dengan yang dipakai pay | VK disimpan per wallet pubkey; gunakan wallet yang sama |

---

**Update dokumen ini saat ada flow baru atau ada bug yang ditemukan saat manual test.** Yang test-otomatis pindahkan ke `test-plan.md`.
