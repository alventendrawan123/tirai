 Saya tunjukin 5 langkah konkret Bima konsumsi backend kita, dari install sampai user click tombol.

Step 1 — Workspace install (sekali setup)
Bima edit pnpm-workspace.yaml di root:


packages:
  - frontend
  - backend
Lalu di terminal:


cd frontend
pnpm add @tirai/api@workspace:*
Ini bikin symlink di frontend/node_modules/@tirai/api → langsung point ke folder backend/. Bukan copy — kalau backend update, frontend langsung dapat update juga.

Setelah ini, Bima buka frontend/package.json, dia akan lihat:


"dependencies": {
  "@tirai/api": "workspace:*",
  ...
}
Step 2 — Import di code
Di file React component atau adapter, Bima nulis:


import { createBountyPayment } from "@tirai/api";
import type { Result, AppError } from "@tirai/api";
Tipe-tipe juga bisa di-import. Tidak ada beda dengan import lodash atau react-query — sama persis kayak library biasa.

Step 3 — Pakai di handler
Misalnya di frontend/src/features/bounty/PayButton.tsx:


import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { createBountyPayment } from "@tirai/api";

export function PayButton({ amount, label }: { amount: number; label: string }) {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!publicKey || !signTransaction) return;
    setLoading(true);

    const result = await createBountyPayment(
      {
        amountBaseUnits: BigInt(Math.floor(amount * 1_000_000_000)),
        label,
      },
      {
        connection,
        payer: { publicKey, signTransaction },
        cluster: "devnet",
      },
    );

    setLoading(false);

    if (result.ok) {
      console.log("Ticket:", result.value.ticket.raw);
      console.log("VK:", result.value.viewingKey);
    } else {
      console.error("Error:", result.error.kind);
    }
  }

  return <button onClick={handleClick} disabled={loading}>Pay</button>;
}
That's it. Function call biasa, await result, cek result.ok, render UI. Zero HTTP, zero fetch, zero API endpoint.

Step 4 — Build (saat Bima jalanin pnpm build)
Vite (atau bundler frontend Bima) bakal:

Read source code frontend
Saat ketemu import { createBountyPayment } from "@tirai/api", resolve symlink ke backend/src/index.ts
Bundle source code backend ke dalam frontend output (dist/assets/index-XXX.js)
Tree-shake: hanya function yang di-import yang ke-bundle (kalau Bima cuma pakai 3 dari 5 function, 2 sisanya gak include)
Output: 1 file JS minified yang berisi frontend code + @tirai/api code, jadi 1 bundle.

Step 5 — Deploy (Vercel / Netlify / Cloudflare Pages)
Bima push ke main → Vercel detect → auto-build → host static files (HTML + JS + CSS).

URL: tirai.vercel.app (atau whatever Bima setup)

Yang terjadi saat user pakai aplikasi

1. User buka tirai.vercel.app di Chrome
       ↓
2. Browser download HTML + JS bundle (~500KB-2MB tergantung size)
       ↓
3. JS bundle (termasuk @tirai/api code) jalan di browser
       ↓
4. User connect Phantom wallet
       ↓
5. User klik "Pay Bounty" → handler jalan → createBountyPayment()
       ↓
6. @tirai/api di browser user generate ZK proof (~30s)
       ↓
7. @tirai/api di browser user kirim tx ke api.devnet.cloak.ag (Cloak relay)
       ↓
8. Cloak relay submit tx ke Solana devnet
       ↓
9. Solana confirm → @tirai/api return signature ke handler
       ↓
10. Handler render success screen
Notice apa yang gak ada:

❌ Tidak ada server kita yang dipanggil di step manapun
❌ Tidak ada database kita
❌ Tidak ada API endpoint kita
❌ Tidak ada Railway / Heroku / AWS yang menjalankan code kita 24/7
Yang ada:

✅ Static hosting (Vercel/Netlify) — gratis untuk sites kecil
✅ External infra (Solana, Cloak relay, Helius) — kita customer mereka
✅ Browser user — yang jalanin code kita
Visual perbandingan

TRADISIONAL:                    TIRAI:
                                
[Browser]                       [Browser]
   ↓ HTTP POST                     ↓ function call (in-memory)
[Backend API ←kita deploy]      [@tirai/api ←in browser bundle]
   ↓ DB query                      ↓ HTTP/RPC
[Database]                      [Solana + Cloak ←external]
Bottom line untuk Bima
Tirai backend = npm library yang di-bundle ke frontend.

Bima konsumsi-nya:

pnpm add @tirai/api@workspace:*
import { fn } from "@tirai/api"
await fn(input, ctx)
Cek result.ok, render UI
Tidak ada step "deploy backend" atau "configure API URL". Sama persis kayak Bima pakai react, lodash, axios — kecuali ini library lokal di workspace, bukan dari npm public.

Kalimat untuk Bima
"Bro, konsumsinya tinggal pnpm add @tirai/api@workspace:* lalu import { createBountyPayment } from '@tirai/api'. Function call biasa, sama kayak lo import lodash. Pas lo pnpm build, source code-nya ke-bundle ke frontend. Saat di-deploy ke Vercel, bundle (termasuk backend kita) ke-ship ke browser user. Browser user yang jalanin. Liat update.md §4 untuk contoh wiring lengkap, atau plan.md untuk step-by-step Phase 4."
