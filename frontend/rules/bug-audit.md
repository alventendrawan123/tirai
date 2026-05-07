# Bug Report — Audit Scan (`/audit`)

**Owner fix:** Alven (`@tirai/api`)
**Pelapor:** Bima (frontend)
**Severity:** High — blocking demo path "Auditor scan + export"
**Tanggal:** 2026-05-07

> Frontend sudah pasang banyak workaround (lihat §3). Tapi **first-ever scan tetap lambat & sering keliatan stuck**. Root cause-nya ada di sisi API/SDK integration — perlu Alven yang fix struktural.

---

## Daftar Isi

1. [Symptom yang user lihat](#1-symptom-yang-user-lihat)
2. [Root cause analysis](#2-root-cause-analysis)
3. [Apa yang sudah di-fix di frontend (jangan diutak-atik)](#3-apa-yang-sudah-di-fix-di-frontend-jangan-diutak-atik)
4. [Yang Alven perlu fix di `@tirai/api`](#4-yang-alven-perlu-fix-di-tiraiapi)
5. [Definition of Done](#5-definition-of-done)
6. [Files yang relevan](#6-files-yang-relevan)

---

## 1. Symptom yang user lihat

Reproduksi pasti, terjadi setiap kali first scan:

1. Buka `/audit`, paste viewing key 64 char yang valid (mis. dari hasil `/pay` baru saja).
2. Klik **Scan history**.
3. UI nyangkut di `Scanning…` selama **30 detik – 2 menit** (kadang lebih).
4. Network tab nampak ratusan request ke `/api/rpc` — sebagian 200, sebagian 429, sebagian pending.
5. Console muncul `Server responded with 429 Too Many Requests. Retrying after 1000ms delay...` (ini dari `@solana/web3.js` Connection's built-in retry, sudah disabled di frontend tapi pernah muncul sebelumnya).
6. **Bug paling aneh**: kalau `pnpm dev` dimatikan di tengah-tengah, hasil scan tiba-tiba muncul lengkap di tab browser. Restart dev server + scan lagi → stuck lagi.

**Kenapa muncul setelah stop dev**: bukan magic. Itu cache fallback yang frontend pasang — kalau scan error, data dari scan sukses sebelumnya yang tersimpan di `localStorage` ditampilkan ulang lewat `initialData` React Query. Bukan hasil scan yang baru.

---

## 2. Root cause analysis

### Penyebab langsung

Cloak SDK's `scanTransactions` kerja seperti ini:

```ts
const sigs = await connection.getSignaturesForAddress(programId, { limit: 250 })
for (const sig of sigs) {
  const tx = await connection.getTransaction(sig.signature, ...)
  // trial-decrypt with viewing key
}
```

Masalahnya:

- **`programId` adalah Cloak shield-pool PDA yang dipakai ramai-ramai oleh semua hackathon tester di devnet.** Setiap orang yang `transact` pakai program yang sama. Jadi `getSignaturesForAddress` return ratusan signature, **mayoritas bukan milik viewing key kita**.
- SDK harus fetch `getTransaction` untuk **SETIAP signature** untuk trial-decrypt. Itu N RPC calls per scan, di mana N = total tx semua orang sejak awal devnet.
- Helius free tier devnet ~10 RPS. 200+ calls = minimum 20 detik di kondisi ideal. Realita-nya lebih lama karena 429 retry storms.
- Saat satu request lambat (>10 detik), `Promise.all` di SDK's batch processor block seluruh batch. Beberapa request slow = scan terasa hang.

### Faktor amplifier (sudah dimitigasi di frontend)

- **Triple retry layer** (proxy + Connection + SDK's `withRpcRetry`) bikin satu request bisa retry 6×6×6 = 216 kali worst case → puluhan menit.
- **Next dev / Turbopack response buffering** kadang nahan response API route saat banyak concurrent requests.

---

## 3. Apa yang sudah di-fix di frontend (jangan diutak-atik)

Catatan: ini semua mitigasi, bukan fix akar. Bug tetap muncul untuk first scan.

| Fix | File | Tujuan |
|---|---|---|
| `Connection({ disableRetryOnRateLimit: true })` | `src/providers/wallet-provider.tsx` | Matikan retry layer yang `console.error` setiap 429 |
| `fetchMiddleware` 12s timeout per fetch | `src/providers/wallet-provider.tsx` | Cegah single request hang infinite |
| `MAX_CONCURRENCY=12` di proxy + pass-through (no retry layer) | `src/app/api/rpc/route.ts` | Batasi burst, hindari double retry |
| `initialData` baca cache localStorage **sync** | `src/features/audit/hooks/use-scan-audit-query.ts` | First render setelah cache terisi: data muncul instan |
| `untilSignature` untuk resume-scan | `src/features/audit/hooks/use-scan-audit-query.ts` + `backend/src/audit/scan-audit-history.ts` | Subsequent scan cuma fetch tx baru sejak last scan |
| Cache fallback: kalau scan error, return cache lama | `src/features/audit/hooks/use-scan-audit-query.ts` | UX jangan kosong saat 429 storm |
| "Refreshing in background…" badge saat refetch | `src/components/pages/(app)/audit/audit-page.tsx` | User tahu data sedang disegarkan |
| `bigint` → SOL conversion di error detail | `src/lib/errors/messages.ts` | Format lamports lebih readable |

**Hasil mitigasi**: scan kedua dan seterusnya dengan VK yang sama → **<3 detik** karena cache + `untilSignature`. **First scan tetap 30-120 detik** dan masih bisa keliatan stuck.

---

## 4. Yang Alven perlu fix di `@tirai/api`

Ada tiga opsi, dari yang paling proper ke paling pragmatis. Pilih sesuai timeline.

### Opsi A — Server-side indexer (recommended, ini fix akar)

**Konsep**: backend punya proses long-running yang continuously scan program PDA, decode chain notes sekali untuk semua viewing key, simpan di DB. Endpoint audit jadi tinggal query DB.

**Implementasi outline**:

1. Tambah `backend/src/audit/indexer.ts`:
   - Worker yang loop terus: `getSignaturesForAddress` dari last cursor, fetch tx, decode chain note metadata (output commitments + encrypted notes per tx).
   - Simpan ke SQLite/Postgres: tabel `transactions(signature, slot, blocktime, encrypted_notes, output_commitments)`.
   - Cursor-nya commit setelah batch sukses, jadi resumable.

2. Endpoint audit (`scanAuditHistory`) jadi:
   - Iterate semua row di DB sejak `afterTimestamp`.
   - Trial-decrypt setiap encrypted_note dengan viewing key user (di server). Cuma yang berhasil yang masuk hasil.
   - Tidak ada call RPC sama sekali → instant response.

3. Frontend tidak perlu berubah signifikan; tinggal call adapter seperti biasa, tapi server yang return.

**Privacy invariants** (lihat `rules.md` §0): indexer tidak pernah simpan `viewing key` user atau `destination wallet`. Cuma simpan ciphertext yang publik di chain — tidak melanggar.

**Trade-off**: butuh DB + worker process. Bisa pakai Bun's built-in SQLite atau Postgres via `@tirai/api`. Tambah deployment complexity tapi user experience massively improved.

### Opsi B — Batch JSON-RPC + filter signatures

**Konsep**: Helius support JSON-RPC batch (kirim `[{...}, {...}]` array) — 50 calls = 1 HTTP request, 1 rate-limit slot.

**Implementasi**:

1. Di `@tirai/api`, sebelum panggil SDK, **bypass SDK's per-call `getTransaction`**. Pakai `connection._rpcBatchRequest` atau langsung POST ke Helius dengan body array.
2. Cara ke-2: fork SDK's `scanTransactions` ke versi yang batch-aware (copy code, modifikasi loop).

**Trade-off**: 5-10× speedup (100 calls jadi 2 batch calls), tapi tetap O(N) scan. Lebih cepat fix daripada Opsi A, tapi tidak menghilangkan dependency Helius.

### Opsi C — Default time-window (paling cepat ship, paling lemah)

Tambah default `afterTimestamp = now - 7 days` di `scanAuditHistory`:

```ts
// backend/src/audit/scan-audit-history.ts
const afterTimestamp = ctx.afterTimestamp ?? Date.now() - 7 * 24 * 60 * 60 * 1000
```

UI di `/audit` tambah dropdown "Last 7 days / 30 days / All time".

**Trade-off**: scan tipikal turun dari ~500 sigs ke ~50 sigs. Tapi user yang mau lihat history lengkap masih kena bug yang sama.

**Kapan pilih ini**: kalau hackathon submission tinggal <2 hari dan Opsi A/B tidak feasible. Pasti pakai Opsi A pasca-hackathon.

---

## 5. Definition of Done

Bug dianggap fixed kalau **semua** dipenuhi:

- [ ] First-ever scan dengan viewing key baru selesai dalam **<5 detik**.
- [ ] Tidak ada UX "stuck di Scanning…" lebih dari 5 detik.
- [ ] Tidak ada dependency `pnpm dev` lifecycle untuk hasil scan muncul.
- [ ] Tidak ada console error spam dari rate limit (429).
- [ ] Subsequent scan dengan VK sama tetap <3 detik (verifikasi mitigasi frontend masih jalan).
- [ ] Demo flow `/audit` di `flow-sederhana.md` §5 jalan tanpa user terlihat menunggu.

---

## 6. Files yang relevan

**Frontend (sudah patch, tidak perlu touch)**:
- `frontend/src/providers/wallet-provider.tsx` — Connection config + fetchMiddleware
- `frontend/src/app/api/rpc/route.ts` — RPC proxy passthrough
- `frontend/src/features/audit/hooks/use-scan-audit-query.ts` — React Query + cache
- `frontend/src/features/audit/cache.ts` — localStorage cache (sync)
- `frontend/src/features/audit/adapters/audit.adapter.ts` — adapter wrapper
- `frontend/src/components/pages/(app)/audit/audit-page.tsx` — render logic

**Backend (Alven kerjain di sini)**:
- `backend/src/audit/scan-audit-history.ts` — entry point scan, **ini yang harus direfactor**
- `backend/src/audit/indexer.ts` — **buat baru** kalau pilih Opsi A
- `backend/scripts/test-audit.ts` — sudah ada, bisa dipakai buat verify fix
- `backend/src/types/api.ts` — kalau perlu tambah opsi `afterTimestamp` ke ctx

**Konteks tambahan untuk Alven**:
- `backend/instruction.md` — overall API contract
- `skills/cloak/SKILL.md` — Cloak SDK reference yang Bima tulis
- `frontend/rules/flow-sederhana.md` §5 — flow yang harus jalan smooth

---

**Pertanyaan?** Tag Bima di chat. Frontend siap retest begitu API patch sudah di branch dan typecheck clean.
