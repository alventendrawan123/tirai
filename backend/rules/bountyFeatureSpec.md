# Bounty Feature — Spec

**Tanggal:** 2026-05-08
**Owner:** Alven (backend) + Bima (frontend)
**Status:** Draft — perlu review Bima sebelum implementation
**Reference UX:** [SuperTeam Earn](https://superteam.fun/earn)
**Hackathon deadline:** 2026-05-14 (6 hari)

---

## 1. Goals

Tirai sekarang minimalist (cuma /pay + /claim + /audit). Add bounty management layer biar owner bisa:

1. **Create bounty** dengan detail lengkap (title, deskripsi, reward, deadline, eligibility)
2. **Browse bounty list** publik (researcher bisa lihat opportunities)
3. **Apply ke bounty** (researcher submit application)
4. **Owner accept/reject** application
5. **Pay bounty via Cloak** (existing flow, sekarang auto-fill dari bounty data)
6. **Track deadline** (auto-expire bounty kalau lewat)

Semua ini **tanpa kompromi privacy**: chain tetap unlinkable, public bounty data terpisah dari private payment.

---

## 2. Non-goals (MVP)

- ❌ SPL token reward (SOL only untuk MVP)
- ❌ Multi-stage bounty (1 reward per bounty)
- ❌ KYC / identity verification
- ❌ Dispute resolution mechanism
- ❌ Multi-owner per bounty
- ❌ Email notifications (Telegram bot off-scope)
- ❌ Reputation system

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  PUBLIC LAYER (Supabase + browse UI)                        │
│                                                             │
│  bounties table         applications table                  │
│  - id, title, desc      - id, bounty_id, applicant_wallet   │
│  - reward_lamports      - submission_text, status            │
│  - deadline             - created_at                        │
│  - status, owner_wallet                                     │
│                                                             │
│  ↑ owner CRUD via wallet JWT │ researcher apply via JWT      │
│  ↓ public read (anon key)                                   │
└─────────────────────────────────────────────────────────────┘

         ↓ Owner accepts application, get researcher's wallet (off-chain)
         ↓ Owner click "Pay this researcher"

┌─────────────────────────────────────────────────────────────┐
│  PRIVATE LAYER (Cloak — existing, unchanged)                │
│                                                             │
│  Owner: createBountyPayment(amount, label) → ticket         │
│  Owner: share ticket via Telegram (off-chain)               │
│  Researcher: claimBounty(ticket, mode) → SOL received       │
│                                                             │
│  Chain: anyone observes "deposit X" + "withdraw Y"          │
│         CANNOT link X ↔ Y (Cloak privacy)                   │
└─────────────────────────────────────────────────────────────┘

         ↓ Owner mark bounty status = "paid" (off-chain)
         ↓ (optional: store anonymized signature for owner records)
```

**Privacy invariant**: Supabase **NEVER** stores Cloak ticket atau viewing key. Bounty + payment terpisah secara informasi:
- Public sees: bounty exists with reward Y SOL
- Public sees: Cloak deposit Y SOL (separate event)
- Public sees: Cloak withdraw Y SOL to wallet Z (separate event)
- Public CANNOT link these 3 to identify "owner paid researcher Z for bounty X"

---

## 4. Data model

### Table `bounties`

```sql
CREATE TABLE bounties (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  description     TEXT NOT NULL CHECK (length(description) BETWEEN 1 AND 5000),
  reward_lamports BIGINT NOT NULL CHECK (reward_lamports > 0),
  deadline        TIMESTAMPTZ NOT NULL,
  eligibility     TEXT,                          -- optional, criteria text
  owner_wallet    TEXT NOT NULL,                 -- base58 pubkey
  status          TEXT NOT NULL DEFAULT 'open',  -- open | paid | expired | cancelled
  payment_signature TEXT,                        -- Cloak deposit tx (set after pay)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bounties_status ON bounties(status);
CREATE INDEX idx_bounties_owner ON bounties(owner_wallet);
CREATE INDEX idx_bounties_deadline ON bounties(deadline);
```

### Table `applications`

```sql
CREATE TABLE applications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bounty_id         UUID NOT NULL REFERENCES bounties(id) ON DELETE CASCADE,
  applicant_wallet  TEXT NOT NULL,                       -- base58 pubkey
  submission_text   TEXT NOT NULL CHECK (length(submission_text) BETWEEN 1 AND 5000),
  contact_handle    TEXT,                                -- Telegram/Discord, optional
  status            TEXT NOT NULL DEFAULT 'pending',     -- pending | accepted | rejected
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(bounty_id, applicant_wallet)                    -- 1 app per researcher per bounty
);

CREATE INDEX idx_applications_bounty ON applications(bounty_id);
CREATE INDEX idx_applications_status ON applications(status);
```

### RLS policies

```sql
-- bounties: public read, owner-only write
ALTER TABLE bounties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bounties public read"
  ON bounties FOR SELECT USING (true);

CREATE POLICY "bounties owner insert"
  ON bounties FOR INSERT
  WITH CHECK (owner_wallet = auth.jwt() ->> 'sub');

CREATE POLICY "bounties owner update"
  ON bounties FOR UPDATE
  USING (owner_wallet = auth.jwt() ->> 'sub');

-- applications: public read, applicant insert, applicant update own, owner update status
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "applications public read"
  ON applications FOR SELECT USING (true);

CREATE POLICY "applications applicant insert"
  ON applications FOR INSERT
  WITH CHECK (applicant_wallet = auth.jwt() ->> 'sub');

CREATE POLICY "applications applicant update own pending"
  ON applications FOR UPDATE
  USING (
    applicant_wallet = auth.jwt() ->> 'sub'
    AND status = 'pending'
  );

-- Owner status update via service_role only (we'll use signed JWT in backend layer)
```

---

## 5. Auth strategy: Solana wallet signature → custom JWT

### Flow

```
1. User connect Phantom/Solflare
2. Frontend request "challenge" dari Tirai backend
3. Backend kasih challenge string (random nonce + timestamp)
4. User sign challenge with wallet → signature
5. Frontend submit { walletPubkey, signature, challenge } ke verify endpoint
6. Backend verify signature using @solana/web3.js verify
7. If valid → mint Supabase JWT with sub=walletPubkey, expire 1 jam
8. Frontend store JWT, attach Authorization: Bearer JWT to Supabase requests
9. Supabase RLS policies use auth.jwt() ->> 'sub' = walletPubkey
```

### Implementation challenge

Supabase JWT signing requires JWT secret yang harus stay server-side. Tirai client-only architecturally. Solution:

**Add minimal verifier endpoint di indexer worker** (Railway):

```
POST https://tirai-indexer.up.railway.app/auth/verify
Body: { walletPubkey, signature, challenge, timestamp }
Response: { jwt: "eyJ..." } (Supabase-compatible)
```

Indexer punya `SUPABASE_JWT_SECRET` env var (different from service key). Sign JWT with HS256 + secret + payload `{ sub: walletPubkey, exp: timestamp + 3600 }`.

**Privacy note**: backend never sees user data, cuma verify signature + sign JWT. Stateless.

**Alternative: Supabase Edge Functions** (kalau gak mau touch indexer). Pros: serverless, kalau load tinggi auto-scale. Cons: TS/Deno mismatch, learning curve. **Saran**: stick with indexer endpoint untuk simplicity.

---

## 6. API surface (`@tirai/api`)

New functions added (all client-side, browser-friendly):

```ts
// Authenticate user via Solana wallet signature
export async function requestAuthChallenge(): Promise<Result<AuthChallenge, AppError>>;

export async function verifyAuthChallenge(
  input: VerifyAuthInput,
  ctx: AuthContext,
): Promise<Result<AuthSession, AppError>>;

// Bounty CRUD
export async function createBounty(
  input: CreateBountyInput,
  ctx: BountyContext,
): Promise<Result<Bounty, AppError>>;

export async function listBounties(
  filter: ListBountiesFilter,
  ctx: BountyReadContext,
): Promise<Result<ReadonlyArray<Bounty>, AppError>>;

export async function getBountyById(
  id: string,
  ctx: BountyReadContext,
): Promise<Result<Bounty | null, AppError>>;

export async function updateBountyStatus(
  id: string,
  status: BountyStatus,
  paymentSignature?: string,
  ctx: BountyContext,
): Promise<Result<Bounty, AppError>>;

// Application flow
export async function applyToBounty(
  input: ApplyInput,
  ctx: BountyContext,
): Promise<Result<Application, AppError>>;

export async function listApplications(
  bountyId: string,
  ctx: BountyReadContext,
): Promise<Result<ReadonlyArray<Application>, AppError>>;

export async function updateApplicationStatus(
  applicationId: string,
  status: "accepted" | "rejected",
  ctx: BountyContext,
): Promise<Result<Application, AppError>>;
```

Types:

```ts
export type BountyStatus = "open" | "paid" | "expired" | "cancelled";

export interface Bounty {
  id: string;
  title: string;
  description: string;
  rewardLamports: bigint;
  deadline: number;        // unix ms
  eligibility?: string;
  ownerWallet: string;
  status: BountyStatus;
  paymentSignature?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Application {
  id: string;
  bountyId: string;
  applicantWallet: string;
  submissionText: string;
  contactHandle?: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: number;
}

export interface CreateBountyInput {
  title: string;
  description: string;
  rewardLamports: bigint;
  deadline: number;
  eligibility?: string;
}

export interface ListBountiesFilter {
  status?: BountyStatus;
  ownerWallet?: string;
  limit?: number;
  afterDeadline?: number;
}

export interface BountyContext {
  supabaseUrl: string;
  jwt: string;             // from auth flow
}

export interface BountyReadContext {
  supabaseUrl: string;
  supabaseAnonKey: string; // public read
}
```

---

## 7. Frontend pages (Bima's scope)

### `/bounties` — public listing

- Grid/list of bounty cards
- Filter: status (open / paid / expired), reward range
- Sort: deadline (soonest first), newest, highest reward
- Click card → `/bounties/[id]` detail

### `/bounties/[id]` — detail page

Public view (no auth):
- Title, description (markdown render?), reward, deadline countdown, eligibility
- Owner wallet (truncated)
- Status badge
- Apply button (kalau status=open dan deadline > now)

Owner view (auth = match owner_wallet):
- Edit button (only if status=open)
- Cancel button
- "Applications" tab → list applications with accept/reject
- "Pay accepted researcher" button → redirect ke `/pay/[bountyId]`

Researcher view (auth, has applied):
- Application status visible
- Edit application (only if pending)

### `/bounties/new` — create form

- Auth required (wallet connected)
- Form: title, description (textarea, markdown supported), reward (SOL input), deadline (date picker), eligibility (optional)
- Submit → `createBounty()` → redirect ke detail page

### `/bounties/[id]/apply` — application form

- Auth required (wallet)
- Form: submission_text (markdown), contact_handle (optional)
- Submit → `applyToBounty()` → redirect ke detail page

### `/pay` (existing, modified)

- Existing form retained
- Optional query param `?bountyId=xxx` → auto-fill amount + label dari bounty data
- After success: call `updateBountyStatus(bountyId, "paid", paymentSignature)` ke backend

---

## 8. Privacy guarantees (verified per layer)

| Layer | What's stored | Privacy verdict |
|---|---|---|
| Supabase `bounties` | Public bounty info, owner_wallet, payment_signature (post-pay) | ✅ All public anyway (chain) |
| Supabase `applications` | applicant_wallet, submission text | ⚠️ Application reveals interest — researcher choice |
| Cloak chain | Deposit + withdraw separately | ✅ Unlinked |
| Supabase ↔ Cloak | `payment_signature` di bounty row points to deposit tx | ⚠️ Owner reveals THEIR side; researcher side stays private |

### Detailed privacy analysis

**Q: Does storing `payment_signature` in bounty row break privacy?**

A: No, because:
- Anyone watching chain sees Cloak deposit anyway (signature public)
- Linking deposit ↔ bounty = "owner paid SOMEONE for bounty X" — owner identity already known via owner_wallet
- The PRIVATE part is the WITHDRAW (researcher side) — that's NEVER linked to bounty in our schema
- Auditor can match deposit ↔ bounty (they know owner anyway), but CANNOT find researcher

**Q: Should applicant_wallet be private?**

A: It's their choice. Researcher applies = signal "I'm interested". They can use a fresh wallet for application + fresh wallet for claim — fully unlinkable.

**Q: Can we leak researcher identity by storing application metadata?**

A: Application stores researcher wallet, but **NOT** Cloak claim ticket or destination wallet. Even if applicant_wallet = same as future claim wallet, on-chain analysis can't link them through Tirai (because withdraw uses fresh keypair).

---

## 9. MVP scope checklist (kerjain dalam 3-4 hari)

### Backend (Alven)
- [ ] Supabase schema migration (bounties + applications)
- [ ] RLS policies
- [ ] Auth verifier endpoint di indexer (POST /auth/verify)
- [ ] `@tirai/api` 8 fungsi baru (create/list/get/updateStatus/apply/listApps/updateApp)
- [ ] Unit tests
- [ ] Smoke test script
- [ ] Update update.md + plan.md

### Frontend (Bima)
- [ ] `/bounties` listing page
- [ ] `/bounties/[id]` detail page (public + owner + researcher views)
- [ ] `/bounties/new` create form
- [ ] `/bounties/[id]/apply` application form
- [ ] `/pay` modify untuk auto-fill dari `?bountyId=`
- [ ] Wallet auth flow (challenge → sign → JWT)
- [ ] BountyCard component (untuk listing + reuse)

---

## 10. Timeline estimate

| Day | Deliverable |
|---|---|
| **Day 1** (today) | Schema + RLS + auth verifier + types |
| **Day 2** | Bounty CRUD + tests + smoke script |
| **Day 3** | Application flow + listings + tests |
| **Day 4** | Bima frontend integration support + bug fixes |
| **Day 5** | Demo prep + recording |

5 hari termasuk 1 hari buffer. Hackathon deadline May 14 = 6 hari, masih ada margin.

---

## 11. Open questions (need Bima/Alven align)

1. **Markdown render di description?** Atau plain text saja untuk MVP? (Recommendation: markdown — pakai library `marked` atau `remark` — tambah ~50KB bundle)
2. **Bounty title duplicate** (multiple bounty same title) — allow atau enforce unique? (Recommendation: allow, judge sendiri)
3. **Cancel bounty refund** — kalau owner cancel SETELAH pay → bagaimana? (Out of scope MVP — owner musti coordinate sama researcher off-chain)
4. **Applications visible to other applicants?** (Recommendation: hide submission text from non-owner, show count + applicant_wallet doang)
5. **Deadline auto-expire** — bagaimana? Cron job di indexer atau on-read filter? (Recommendation: on-read filter dulu, cron sebagai stretch)

---

## 12. Implementation kickoff

Setelah Bima review + approve spec ini, urutan kerja:

1. **Saya (Alven)** mulai Day 1 backend (schema + auth)
2. **Bima** boleh mulai paralel: bikin BountyCard component + listing layout (mock data dulu)
3. Sync di chat tiap selesai milestone

Spec ini akan di-commit ke `backend/rules/bountyFeatureSpec.md`. Updates akan di-track via PR (atau direct commit + ping).
