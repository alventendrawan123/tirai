# Bounty Feature — Integration Guide for Bima

**Status:** ✅ Backend LIVE 2026-05-08 (Supabase + Railway auth server deployed)
**Owner:** Alven (backend) · **Konsumen:** Bima (frontend)

Dokumen ini fokus ke **flow** + **cara wire ke frontend**. Architecture rationale ada di commit history dan `bugUpdate.md`.

---

## Daftar Isi

1. [Architecture singkat](#1-architecture-singkat)
2. [Flow user — 3 personas](#2-flow-user--3-personas)
3. [Env vars yang frontend butuh](#3-env-vars-yang-frontend-butuh)
4. [Auth flow (Solana wallet → JWT)](#4-auth-flow-solana-wallet--jwt)
5. [Bounty CRUD — function reference](#5-bounty-crud--function-reference)
6. [Application flow — function reference](#6-application-flow--function-reference)
7. [Wire `/pay` dari bounty](#7-wire-pay-dari-bounty)
8. [Error handling](#8-error-handling)
9. [Halaman frontend yang Bima bikin](#9-halaman-frontend-yang-bima-bikin)
10. [DoD checklist](#10-dod-checklist)

---

## 1. Architecture singkat

```
┌─────────────────────────────────────────────────────────────┐
│  PUBLIC (Supabase Postgres + Railway auth server)           │
│  - bounties + applications tables (anon read, JWT write)    │
│  - Auth: POST /auth/challenge → POST /auth/verify → JWT     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  PRIVATE (Cloak chain — existing flow, unchanged)           │
│  - createBountyPayment / inspectClaimTicket / claimBounty   │
└─────────────────────────────────────────────────────────────┘
```

**Privacy invariant**: bounty metadata + applications publik, payment via Cloak privat. Chain tidak link bounty ↔ payment ↔ recipient.

**LIVE infrastructure:**
- **Supabase project**: `https://ahyezijhqlizwznhgnzh.supabase.co`
- **Railway auth server**: `https://tirai-production.up.railway.app`
- **Indexer**: same Railway service (poll Cloak chain → write public chain data)

---

## 2. Flow user — 3 personas

### 🟦 Owner (yang nyediain bounty)

```
1. Connect wallet (Phantom/Solflare)
2. /bounties/new → form (title, desc, reward, deadline, eligibility)
3. createBounty(input, ctx) → row di Supabase, status="open"
4. Tunggu researcher apply
5. Review applications di /bounties/[id]
6. Click Accept di salah satu → updateApplicationStatus(appId, "accepted")
7. Click "Pay accepted researcher" → redirect /pay?bountyId=xxx
8. /pay auto-fill amount + label, submit Cloak deposit
9. Setelah deposit success → updateBountyStatus(id, "paid", paymentSig)
10. Ticket dikasih ke researcher off-chain (Telegram/email)
```

### 🟩 Researcher (yang ngapply bounty)

```
1. Browse /bounties (public, no auth)
2. Click bounty → /bounties/[id] detail
3. Click Apply → connect wallet → /bounties/[id]/apply form
4. Submit (submission_text + contact_handle optional) → applyToBounty()
5. Tunggu owner accept
6. Kalau accepted, owner contact lewat Telegram → kasih Cloak ticket
7. Buka /claim → paste ticket → claim ke wallet sendiri (atau fresh wallet)
```

### 🟨 Auditor (compliance)

Tidak terkait bounty layer — pakai existing `/audit` flow dengan viewing key.

---

## 3. Env vars yang frontend butuh

Tambah ke `frontend/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://ahyezijhqlizwznhgnzh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_m986Yk1Qy86Zf2om4vD84g_wV0RNNOG
NEXT_PUBLIC_AUTH_VERIFIER_URL=https://tirai-production.up.railway.app
```

⚠️ Anon key boleh expose ke bundle (RLS membatasi ke SELECT). **JANGAN** masukin `service_role` key atau `JWT_SECRET`.

---

## 4. Auth flow (Solana wallet → JWT)

### Konsep

Owner/researcher harus authenticate sebelum bisa create bounty / apply. Auth tanpa email/password — cuma Solana wallet signature.

### Flow

```ts
// 1. Request challenge dari Railway auth server
const challengeResult = await requestAuthChallenge({
  authVerifierUrl: process.env.NEXT_PUBLIC_AUTH_VERIFIER_URL!,
});
if (!challengeResult.ok) return showError(challengeResult.error);
const { challenge } = challengeResult.value;

// 2. User sign challenge dengan wallet
import bs58 from "bs58";
const messageBytes = new TextEncoder().encode(challenge);
const signedBytes = await wallet.signMessage(messageBytes);  // Phantom adapter API
const signatureBase58 = bs58.encode(signedBytes);

// 3. Submit signature ke Railway untuk verify + dapatkan JWT
const sessionResult = await verifyAuthChallenge(
  {
    walletPubkey: wallet.publicKey.toBase58(),
    signature: signatureBase58,
    challenge,
  },
  { authVerifierUrl: process.env.NEXT_PUBLIC_AUTH_VERIFIER_URL! },
);
if (!sessionResult.ok) return showError(sessionResult.error);

// 4. Simpan JWT di session state (jangan localStorage — XSS risk)
const { jwt, walletPubkey, expiresAt } = sessionResult.value;
setAuthSession({ jwt, walletPubkey, expiresAt });

// JWT valid 1 jam. Expire → user re-login (challenge again).
```

### Recommended: AuthProvider context

```tsx
// frontend/src/providers/AuthProvider.tsx
const AuthContext = createContext<AuthSession | null>(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState<AuthSession | null>(null);

  // Auto-expire check
  useEffect(() => {
    if (!session) return;
    const ms = session.expiresAt - Date.now();
    if (ms <= 0) { setSession(null); return; }
    const t = setTimeout(() => setSession(null), ms);
    return () => clearTimeout(t);
  }, [session]);

  // ... signIn, signOut helpers

  return <AuthContext.Provider value={session}>{children}</AuthContext.Provider>;
}
```

---

## 5. Bounty CRUD — function reference

### Read (public, anon key — no auth needed)

```ts
import { listBounties, getBountyById } from "@tirai/api";

// List bounties (browse page)
const result = await listBounties(
  { status: "open", limit: 50 },     // optional filter
  {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  },
);
if (!result.ok) return showError(result.error);
const bounties: Bounty[] = result.value;

// Get bounty by ID (detail page)
const bountyResult = await getBountyById("uuid-here", { supabaseUrl, supabaseAnonKey });
if (!bountyResult.ok || bountyResult.value === null) return showNotFound();
const bounty: Bounty = bountyResult.value;
```

### Write (need JWT from auth flow)

```ts
import { createBounty, updateBountyStatus } from "@tirai/api";

// Create bounty
const result = await createBounty(
  {
    title: "Find XSS bug in admin panel",
    description: "Markdown supported text...",
    rewardLamports: BigInt(Math.floor(0.5 * 1_000_000_000)), // 0.5 SOL
    deadline: Date.now() + 7 * 24 * 60 * 60 * 1000,          // 7 days
    eligibility: "Open to all",                              // optional
  },
  {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    jwt: session.jwt,
  },
);
if (!result.ok) return showError(result.error);
const newBounty = result.value;

// Update bounty status (after Cloak payment success)
const updated = await updateBountyStatus(
  bountyId,
  "paid",
  paymentSignature,        // from createBountyPayment result
  { supabaseUrl, jwt: session.jwt },
);
```

### `Bounty` type

```ts
{
  id: string;                    // UUID
  title: string;                 // 1-120 chars
  description: string;           // 1-5000 chars
  rewardLamports: bigint;
  deadline: number;              // unix ms
  eligibility?: string;
  ownerWallet: string;           // base58
  status: "open" | "paid" | "expired" | "cancelled";
  paymentSignature?: string;     // Cloak deposit tx, set after pay
  createdAt: number;
  updatedAt: number;
}
```

---

## 6. Application flow — function reference

### Researcher apply (need JWT)

```ts
import { applyToBounty } from "@tirai/api";

const result = await applyToBounty(
  {
    bountyId: "uuid-here",
    submissionText: "I found XSS at /admin/users?q=<script>...",
    contactHandle: "@bima_telegram",       // optional
  },
  { supabaseUrl, jwt: session.jwt },
);
```

⚠️ Researcher cuma boleh apply 1× per bounty (UNIQUE constraint). Re-apply error: duplicate key.

### Owner list applications (read, anon)

```ts
import { listApplications } from "@tirai/api";

const result = await listApplications(bountyId, { supabaseUrl, supabaseAnonKey });
const apps: Application[] = result.value;

// Filter di frontend
const pending = apps.filter(a => a.status === "pending");
```

### Owner accept/reject (need JWT, owner of bounty)

```ts
import { updateApplicationStatus } from "@tirai/api";

const result = await updateApplicationStatus(
  applicationId,
  "accepted",   // or "rejected"
  { supabaseUrl, jwt: session.jwt },
);
```

### `Application` type

```ts
{
  id: string;
  bountyId: string;
  applicantWallet: string;       // base58
  submissionText: string;        // 1-5000 chars
  contactHandle?: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: number;
  updatedAt: number;
}
```

---

## 7. Wire `/pay` dari bounty

`/pay` page tetap pakai existing `createBountyPayment` Cloak flow. Tambahin auto-fill dari bounty:

```tsx
// pages/pay.tsx atau component
import { useSearchParams } from "next/navigation";
import { getBountyById, createBountyPayment, updateBountyStatus } from "@tirai/api";

const params = useSearchParams();
const bountyId = params.get("bountyId");

// Fetch bounty data, prefill form
useEffect(() => {
  if (!bountyId) return;
  getBountyById(bountyId, { supabaseUrl, supabaseAnonKey }).then(r => {
    if (r.ok && r.value) {
      setAmountSol(Number(r.value.rewardLamports) / 1_000_000_000);
      setLabel(r.value.title);
      // Disable form fields jika auto-filled (locked to bounty data)
    }
  });
}, [bountyId]);

// Setelah Cloak deposit success
async function onPaySuccess(paymentResult) {
  // 1. Show ticket QR + viewing key (existing behavior)
  setTicket(paymentResult.value.ticket);
  
  // 2. KALAU dari bounty flow, mark sebagai paid
  if (bountyId) {
    await updateBountyStatus(
      bountyId,
      "paid",
      paymentResult.value.signature,
      { supabaseUrl, jwt: session.jwt },
    );
  }
}
```

URL flow: `/bounties/[id]` → click "Pay accepted researcher" → redirect ke `/pay?bountyId=xxx` → form auto-filled → submit Cloak → mark bounty paid.

---

## 8. Error handling

Semua function return `Result<T, AppError>`. Pattern sama dengan existing functions:

```ts
const result = await createBounty(input, ctx);
if (!result.ok) {
  switch (result.error.kind) {
    case "INVALID_INPUT":
      showFormError(result.error.field, result.error.message);
      break;
    case "RPC":
      showToast(`Network error: ${result.error.message}`);
      if (result.error.retryable) showRetry();
      break;
    default:
      showToast("Unknown error");
  }
  return;
}
const bounty = result.value;
```

### Common errors specific ke bounty layer

| Skenario | error.kind | Message |
|---|---|---|
| Title kosong/>120 chars | `INVALID_INPUT` | field=title |
| Reward ≤0 | `INVALID_INPUT` | field=rewardLamports |
| Deadline di masa lalu | `INVALID_INPUT` | field=deadline |
| JWT expired/invalid | `RPC` | "JWT expired" / "401 Unauthorized" — re-trigger auth flow |
| Duplicate application | `RPC` | "duplicate key" — researcher sudah apply sebelumnya |
| Update bounty bukan owner | `RPC` | RLS rejected — wallet tidak match |

---

## 9. Halaman frontend yang Bima bikin

| Path | Auth | Function utama |
|---|---|---|
| `/bounties` | public | `listBounties({ status: "open" })` |
| `/bounties/[id]` | public + owner/applicant | `getBountyById` + `listApplications` |
| `/bounties/new` | wallet auth | `createBounty` |
| `/bounties/[id]/apply` | wallet auth | `applyToBounty` |
| `/pay?bountyId=xxx` | wallet (Phantom signTransaction) | `getBountyById` + `createBountyPayment` + `updateBountyStatus` |

### Recommended components (reusable)

- `BountyCard` — tampil di listing + detail summary
- `BountyForm` — create + edit (kalau allow edit)
- `ApplicationForm` — researcher submit
- `ApplicationsList` — owner review applications
- `WalletAuthButton` — Sign in / Sign out
- `AuthGuard` — wrapper component, redirect ke connect wallet kalau belum auth

---

## 10. DoD checklist

### Backend (Alven — DONE ✅)

- [x] Supabase schema (`bounties`, `applications`) + RLS
- [x] Auth verifier endpoint di Railway (`POST /auth/challenge`, `POST /auth/verify`)
- [x] `@tirai/api` 9 functions baru:
  - `createBounty`, `listBounties`, `getBountyById`, `updateBountyStatus`
  - `applyToBounty`, `listApplications`, `updateApplicationStatus`
  - `requestAuthChallenge`, `verifyAuthChallenge`
- [x] Typecheck + lint clean
- [x] All existing tests still pass (25/25)

### Frontend (Bima — TODO)

- [ ] AuthProvider with wallet sign-in flow
- [ ] `/bounties` listing page + BountyCard component
- [ ] `/bounties/[id]` detail page (3 view variants: public, owner, researcher)
- [ ] `/bounties/new` create form
- [ ] `/bounties/[id]/apply` apply form
- [ ] Modify `/pay` untuk handle `?bountyId=` query param
- [ ] Error handling sesuai §8
- [ ] Mobile responsive

### E2E demo flow

- [ ] Owner connect Phantom → create bounty → bounty muncul di listing
- [ ] Researcher (incognito tab + different wallet) apply ke bounty
- [ ] Owner accept application di /bounties/[id]
- [ ] Owner click "Pay" → /pay auto-fill → Cloak deposit → bounty marked "paid"
- [ ] Owner share ticket via Telegram → researcher claim via /claim

---

## Pertanyaan / blocker

Tag Alven di chat. Backend code reference:
- Bounty CRUD: `backend/src/bounty/{create,list,get,update}-*.ts`
- Auth client: `backend/src/auth/*.ts`
- Auth server: `backend/indexer/src/auth-server.ts`
- Schema: `backend/indexer/schema-bounties.sql`
- Spec history: commits `8b7311b` (spec) + `e4badf6` (impl)
