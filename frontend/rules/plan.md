# Frontend Implementation Plan

Execution plan for the **Tirai** frontend — *Privacy-first bounty payouts for Solana whitehats*.

This plan is **mockup-first**: every screen is designed and reviewed in static UI form **before** any wallet, SDK, or RPC integration begins. Read [`rules.md`](./rules.md) before starting. All deliverables in this plan are subject to the rules in that document.

---

## Guiding Principles

1. **Mockup first, integration second.** Static UI ships before any wallet code is written.
2. **Monochrome from the first pixel.** No gradients, no brand colour. Black + white + grayscale only.
3. **Privacy is a feature, not a footnote.** Every screen must visibly reinforce one of the three privacy boundaries from `rules.md` §0.
4. **Components before pages.** Build the design system primitives, then assemble pages from them.
5. **Tokens before classes.** No raw colour literals. Everything routes through `bg-main` / `text-primary` / `border-subtle` / etc.
6. **Server Components by default.** `"use client"` is opt-in at the leaves.

---

## Table of Contents

1. [Phases at a Glance](#1-phases-at-a-glance)
2. [Phase 0 — Project Foundation](#2-phase-0--project-foundation)
3. [Phase 1 — Design System & Tokens](#3-phase-1--design-system--tokens)
4. [Phase 2 — UI Mockup (Static)](#4-phase-2--ui-mockup-static)
5. [Phase 3 — Wallet & Provider Wiring](#5-phase-3--wallet--provider-wiring)
6. [Phase 4 — Tirai API Integration](#6-phase-4--tirai-api-integration)
7. [Phase 5 — End-to-End Flows](#7-phase-5--end-to-end-flows)
8. [Phase 6 — Hardening & Polish](#8-phase-6--hardening--polish)
9. [Phase 7 — Launch](#9-phase-7--launch)
10. [Workstream Ownership](#10-workstream-ownership)
11. [Risk Register](#11-risk-register)
12. [Acceptance Checklist](#12-acceptance-checklist)

---

## 1. Phases at a Glance

| Phase | Title                       | Output                                        | Status gate                      |
|-------|-----------------------------|-----------------------------------------------|----------------------------------|
| 0     | Project Foundation          | Tooling, tokens loader, base layout           | `pnpm build` green               |
| 1     | Design System & Tokens      | Tokens in `globals.css`, primitives in `ui/`  | Kitchen-sink demo route          |
| 2     | UI Mockup (Static)          | All 4 routes rendered with mock data          | Design review approved           |
| 3     | Wallet & Provider Wiring    | Solana wallet adapter + providers             | Connect / disconnect works       |
| 4     | Tirai API Integration       | `lib/tirai/*` wired to UI via use-cases       | API contract typecheck green     |
| 5     | End-to-End Flows            | Real pay → claim → audit on devnet            | E2E happy path green             |
| 6     | Hardening & Polish          | Errors, edge cases, a11y, perf                | Lighthouse + budget gates green  |
| 7     | Launch                      | Mainnet smoke test + Vercel deploy            | Production URL live              |

---

## 2. Phase 0 — Project Foundation

**Goal:** the repo is healthy enough to build features against. **No product code yet.**

### Deliverables

- `frontend/` builds with `pnpm build` clean.
- `biome.json` rules ratified; `pnpm lint` and `pnpm format` pass.
- `tsconfig.json` enforces the strict flags listed in `rules.md` §10.
- Path alias `@/*` configured.
- `src/app/layout.tsx` renders the root shell with Geist Sans + Geist Mono.
- `src/app/globals.css` imports Tailwind v4 with an empty `@theme` block (filled in Phase 1).
- `src/types/`, `src/config/`, `src/lib/`, `src/components/`, `src/features/` directories exist with `index.ts` placeholders so imports resolve.
- Pre-commit hook (`husky` + `lint-staged`) wired: `biome check --apply` + `tsc --noEmit` on staged files.
- Environment loader stub in `src/config/env.ts` validated by `zod`.

### Tasks

- [ ] Confirm Next 16 App Router conventions in `node_modules/next/dist/docs/` (per `AGENTS.md`).
- [ ] Wire `next/font` for Geist Sans / Geist Mono in `layout.tsx`.
- [ ] Create the folder skeleton from `rules.md` §7.
- [ ] Add `cn()` utility (`clsx` + `tailwind-merge`) in `lib/utils/cn.ts`.
- [ ] Add `assertNever()` and `Result<T, E>` helpers in `lib/utils/`.
- [ ] Configure Husky + lint-staged.
- [ ] Add a CI workflow stub: install → biome ci → tsc → build.

### Exit criteria

- `pnpm install --frozen-lockfile && pnpm lint && pnpm tsc --noEmit && pnpm build` is green on a clean clone.

---

## 3. Phase 1 — Design System & Tokens

**Goal:** every primitive needed by the mockups exists and is composable. **No business logic.**

### Deliverables — Tokens

Implement the full token block from `rules.md` §19 in `globals.css`:

- Surfaces: `bg-main`, `bg-secondary`, `bg-tertiary`, `bg-inverse`.
- Text: `text-primary`, `text-secondary`, `text-muted`, `text-inverse`.
- Borders: `border-subtle`, `border-strong`.
- States: `success`, `warning`, `danger`, `info` (system-only, never decorative).
- Radii: `sm` → `2xl`.
- Motion: `--duration-fast | base | slow`, `--ease-out-soft`.
- Fonts: `--font-sans`, `--font-mono`.
- Dark mode via `html.dark` overrides.

### Deliverables — Primitives (in `src/components/ui/`)

Each primitive is a single file with a sibling `<Name>.variants.ts` using `cva`. **No comments. No raw colour literals. No gradients.**

- `Button` — variants: `primary | secondary | ghost | outline | destructive`; sizes: `sm | md | lg | icon`.
- `IconButton`
- `Input`, `Textarea`
- `Select`, `Combobox`
- `Checkbox`, `Radio`, `Switch`
- `Card`, `Badge`, `Avatar`
- `Skeleton`, `Spinner`
- `Dialog`, `Drawer`, `Popover`, `Tooltip`, `Toast`
- `Tabs`, `Accordion`
- `Table`, `Pagination`, `Breadcrumb`, `Stepper`
- `EmptyState`

### Deliverables — Domain primitives (in `src/components/ui/`)

- `AddressPill` — base58-truncated address with copy + Solscan link.
- `TokenAmount` — renders `bigint` + decimals + symbol (mono font for digits).
- `TxStatus` — `idle | submitting | confirming | confirmed | failed` pill.
- `WalletButton` — connect / disconnect / switch wallet.
- `NetworkBadge` — current cluster (mainnet / devnet) badge.
- `CopyToClipboard` — wraps a value with a copy affordance.
- `QrCode` — wrapper over `qrcode.react` with monochrome styling.

### Deliverables — Layout

- `Container` (max-w `xl` / `2xl`).
- `Header` (logo wordmark · nav · `WalletButton`).
- `Footer` (links · network badge · build sha).
- `PageShell` (header + main + footer slot).

### Tasks

- [ ] Implement tokens in `globals.css` and verify utilities (`bg-main`, `text-primary`, …) render correctly.
- [ ] Build each primitive in alphabetical order; ensure each respects `focus-visible` and dark mode automatically via tokens.
- [ ] Build a hidden dev route `app/(internal)/_kitchen-sink/page.tsx` that renders every primitive with every variant. Used for visual review only; gated out of production builds.

### Exit criteria

- Kitchen-sink route renders every primitive cleanly in light + dark.
- Zero raw colour literals in `src/`.
- Zero `gradient` mentions in `src/`.
- `pnpm build` green; bundle for `/` < 100 KB gz (no business code yet).

---

## 4. Phase 2 — UI Mockup (Static)

**Goal:** every screen renders exactly as it will in production, using **mock data only**. No wallet, no SDK, no network calls. This is the design-review milestone.

### Routes to mock

```
src/app/
├── layout.tsx                 — root shell (already in Phase 0)
├── page.tsx                   — landing
├── pay/page.tsx               — project: create bounty
├── claim/page.tsx             — researcher: inspect + claim
├── audit/page.tsx             — auditor: dashboard
└── (mock)/                    — dev-only mock fixtures route group
```

### Mock data

- `src/features/<feat>/__fixtures__/*.ts` exports realistic mock objects matching the final domain types.
- Pages import fixtures directly — no API stubs, no MSW. The point is to lock the visual contract first.

### 4.1 Landing — `/`

**Purpose:** explain Tirai in one screen and guide each role to the right route.

Layout (top → bottom):

1. **Hero** — wordmark, one-line value prop, sub-line, three role CTAs (Pay · Claim · Audit).
2. **How it works** — three-column diagram: Project deposits → Cloak pool → Researcher withdraws. Monochrome line illustration only.
3. **Privacy boundaries** — three cards mapping to §0 boundaries.
4. **FAQ** — accordion with 4–6 entries.
5. **Footer** — repo link, hackathon attribution, network badge.

Notes: typography-led. **No hero gradient. No background imagery. No animated elements** other than CTA hover.

### 4.2 Project — `/pay`

**Purpose:** treasury creates a bounty payment and gets back a claim ticket.

States to mock:

- **Disconnected** — primary CTA prompts wallet connect; rest of the form is disabled.
- **Connected, idle** — form: amount (token + numeric), label (free text, ≤ 64 chars), memo (optional), summary card (fee preview, network, recipient = Cloak pool).
- **Submitting** — `ProgressDialog` with steps: *Validate → Generate ZK proof → Submit → Confirm*. Each step shows spinner / check.
- **Success** — `ClaimTicketDisplay`: large QR (monochrome), opaque ticket string in mono font, copy + download buttons, "Send to researcher off-chain" reminder.
- **Error** — inline error card with parsed message and retry.

Privacy reminder: a small footer note on the page — *"This payment will not be linkable to the recipient on-chain."*

### 4.3 Researcher — `/claim`

**Purpose:** inspect a ticket, choose wallet mode, withdraw funds.

States to mock:

- **No ticket** — paste box + "Scan QR" CTA + recent ticket dropdown (none if first visit).
- **Inspecting** — skeleton.
- **Inspected (preview)** — token amount (large mono), source = Cloak pool, expiry (if any), "Claim now" button. **No wallet prompt yet.**
- **Choose mode** — radio group:
  - **Fresh wallet (recommended)** — short copy: maximum privacy. Tirai will generate a brand-new keypair you must save.
  - **Existing wallet** — short copy: less private; the destination is your connected wallet.
- **Submitting** — `ProgressDialog`: *Generate proof → Withdraw → Confirm*.
- **Success (fresh mode)** — `SaveKeyDialog` (modal, non-dismissible by overlay/Esc): destination address, secret key in mono font, Copy / Download `.txt` / "I have saved it". Continue is disabled until the user clicks "I have saved it".
- **Success (existing mode)** — confirmation card with tx signature + Solscan link.
- **Error** — inline parsed error + retry.

### 4.4 Auditor — `/audit`

**Purpose:** paste a viewing key, see history, export.

States to mock:

- **No key** — paste box, hint text, "How to obtain a viewing key" link.
- **Scanning** — skeleton table.
- **Loaded** — summary cards (total payments, total volume, latest activity). Below: data table with columns:
  - Date · Amount · Token · Label · Status · Tx
  - **NO destination wallet column.** This is a privacy invariant; the column does not exist in code.
- **Empty** — `EmptyState` with copy: "No payments visible to this viewing key yet."
- **Export menu** — Popover with "Export PDF" + "Export CSV".
- **Error** — invalid key → inline error.

### 4.5 Shared dialogs / sheets

- `WalletConnectSheet` — Drawer listing Phantom + Solflare with monochrome icons.
- `NetworkMismatchDialog` — appears when wallet cluster ≠ app cluster.
- `ToastRegion` — top-right; no colour beyond a single grayscale border accent.

### Tasks

- [ ] For each route, write the type contract first (`features/<feat>/types/*.ts`) and a fixtures file.
- [ ] Build the route as a Server Component shell; push `"use client"` to the leaves.
- [ ] Add a `?state=` URL param on each route to switch between mock states for review (dev-only).
- [ ] Run a design review with the team using a deployed Vercel preview before continuing.

### Exit criteria

- All four routes render every state cleanly on mobile (375 px) and desktop (1440 px).
- No `console.warn` / `console.error` in browser devtools.
- Zero `any`, zero `@ts-ignore`, zero raw colour literals, zero gradients.
- Approved by reviewer on a Vercel preview URL.
- Lighthouse ≥ 95 on all four routes (no business logic yet, so this should be easy).

---

## 5. Phase 3 — Wallet & Provider Wiring

**Goal:** the user can connect / disconnect a Solana wallet from the mocked UI.

### Deliverables

- `src/providers/wallet-provider.tsx` — `@solana/wallet-adapter-react` with Phantom + Solflare.
- `src/providers/cluster-provider.tsx` — exposes the active cluster + RPC endpoint from `config/cluster.ts`.
- `src/providers/theme-provider.tsx` — `next-themes`, class-based dark mode.
- `src/providers/query-provider.tsx` — `@tanstack/react-query` client.
- `src/providers/toast-provider.tsx`.
- `src/app/layout.tsx` composes the providers in correct order.
- `WalletButton` and `NetworkBadge` become live (no longer mocked).
- `NetworkMismatchDialog` is wired to actually compare wallet vs app cluster.

### Tasks

- [ ] Add deps via pnpm.
- [ ] Implement env validation in `config/env.ts` (RPC URL required).
- [ ] Wire providers and verify connect / disconnect with Phantom on devnet.
- [ ] Hide the kitchen-sink route behind `process.env.NODE_ENV !== "production"`.

### Exit criteria

- Connect / disconnect with Phantom + Solflare works on devnet.
- Refresh persists the connection.
- Switching cluster on the wallet triggers `NetworkMismatchDialog`.

---

## 6. Phase 4 — Tirai API Integration

**Goal:** wire the UI to the real `lib/tirai/*` API, replacing fixtures one feature at a time. Still on devnet.

> **Coordination:** this phase depends on the Tirai API surface stabilising. Do not begin a feature until its API contract types are merged.

### Deliverables — API adapters (in `src/features/<feat>/adapters/`)

- `bounty.adapter.ts` → wraps `createBountyPayment`.
- `claim.adapter.ts` → wraps `inspectClaimTicket` + `claimBounty`.
- `audit.adapter.ts` → wraps `scanAuditHistory` + `exportAuditReport`.
- Each adapter returns `Result<T, AppError>`. No throws cross the boundary.

### Deliverables — Use cases (in `src/features/<feat>/use-cases/`)

- `create-bounty.ts` — orchestrates: validate → confirm → adapter → ticket result.
- `inspect-ticket.ts` — pure preview, no signing.
- `claim-bounty.ts` — handles wallet mode branch (fresh vs existing) and returns the destination + (optional) generated secret key.
- `scan-audit.ts` — fetches history; computes summary metrics in pure functions.
- `export-report.ts` — produces PDF / CSV bytes via `pdf-lib`.

### Deliverables — Hooks (in `src/features/<feat>/hooks/`)

- `useCreateBounty()`, `useInspectTicket()`, `useClaimBounty()`, `useAuditHistory()`, `useExportReport()`.
- Each is a thin React Query layer over a use-case. Status mapped to the discriminated union the UI already renders.

### Deliverables — Error model

- `src/features/<feat>/types/<feat>.errors.ts` — domain error union.
- `src/lib/errors/parse-error.ts` — central translator from SDK error → user-facing message string.
- `src/lib/errors/messages.ts` — message map. Never leak raw RPC strings.

### Tasks

- [ ] Type the API contract in `src/types/api.ts` (mirror of `lib/tirai/types/api.ts` from the parent repo).
- [ ] Replace each route's fixture import with the corresponding hook.
- [ ] Wire the SDK's progress callback into `ProgressDialog`.
- [ ] Wire `parseError()` into every error branch.

### Exit criteria

- `/pay` creates a real bounty on devnet via Surfpool.
- `/claim` inspects + withdraws on devnet, both wallet modes.
- `/audit` scans + exports a report on devnet.

---

## 7. Phase 5 — End-to-End Flows

**Goal:** the three roles can complete a full lifecycle on a single ticket end-to-end.

### Scenarios

1. **Happy path** — Project pays 0.5 SOL → Researcher claims with fresh wallet → Auditor scans + exports PDF.
2. **Existing-wallet claim** — Same as above, but researcher uses connected wallet.
3. **Wrong cluster** — Project on mainnet, wallet on devnet → mismatch dialog blocks submission.
4. **User rejects signature** — Phantom popup cancelled → graceful error, retryable.
5. **Insufficient balance** — pre-flight rejects with clear copy.
6. **Invalid ticket** — `/claim` paste with malformed string → inline error.
7. **Invalid viewing key** — `/audit` paste with wrong key → inline error, no data leakage.
8. **Save-key dismissal attempt** — Esc / overlay click on `SaveKeyDialog` does nothing.

### Tasks

- [ ] Write Playwright tests for scenarios 1–8 against a Surfpool fork.
- [ ] Add a `[data-testid]` to every interactive primitive used in flows.
- [ ] Add a tx-history side panel on `/pay` showing the last N tickets created in this browser session (in-memory only).

### Exit criteria

- All eight scenarios pass in CI.
- Manual mainnet rehearsal of scenario 1 with a small amount succeeds.

---

## 8. Phase 6 — Hardening & Polish

**Goal:** production-grade quality. No surprises in the demo.

### Tasks

- [ ] Run a full a11y audit: keyboard-only walkthrough of all four routes; VoiceOver pass on the save-key dialog.
- [ ] Add `loading.tsx`, `error.tsx`, `not-found.tsx` for every route segment that fetches data.
- [ ] Verify `error.tsx` reset works for each route.
- [ ] Reduce `"use client"` footprint — audit each occurrence.
- [ ] Bundle audit: ensure each route ≤ 180 KB gz initial JS.
- [ ] Run Lighthouse CI on a preview deploy; fix any regressions.
- [ ] Verify no secrets, tickets, viewing keys, or destination addresses appear in the network tab, console, or telemetry.
- [ ] Visual QA: every screen on Chrome, Safari, Firefox, mobile Safari.
- [ ] Copy review: ensure every error message is in the central messages map and reads cleanly.
- [ ] Confirm dark mode parity on every screen.

### Exit criteria

- Lighthouse: Perf ≥ 90, A11y ≥ 95, BP ≥ 95, SEO ≥ 95 on each route.
- Bundle budget green.
- No `console.*` calls in production paths.
- All `rules.md` §22 Definition of Done items checked.

---

## 9. Phase 7 — Launch

**Goal:** a public, mainnet-ready demo.

### Tasks

- [ ] Configure Vercel project; set `NEXT_PUBLIC_*` env vars per environment (preview = devnet, prod = mainnet).
- [ ] Configure CSP and security headers in `next.config.ts`.
- [ ] Wire Sentry (or chosen logger) — confirm no PII / privacy-sensitive fields are captured.
- [ ] Run a final mainnet smoke test of scenario 1.
- [ ] Tag a release commit (`chore(release): v0.1.0`).
- [ ] Capture demo video assets (final route screen recordings on mainnet).

### Exit criteria

- Production URL live on mainnet.
- Demo video recorded and edited.
- Submission packet ready (repo link, demo URL, video).

---

## 10. Workstream Ownership

| Workstream              | Owner | Phases                      |
|-------------------------|-------|-----------------------------|
| Frontend (this repo)    | Bima  | 0–7                         |
| Tirai API (`lib/tirai`) | Alven | 4 (provides), 5 (supports)  |
| Brand & demo video      | Neysa | 1 (assets), 7 (video)       |

Cross-workstream dependencies:

- Phase 4 cannot start until Alven publishes the API type contract.
- Phase 7 demo video depends on Phase 6 finishing visual polish.

---

## 11. Risk Register

| Risk                                                       | Likelihood | Impact | Mitigation                                                                  |
|------------------------------------------------------------|------------|--------|-----------------------------------------------------------------------------|
| Cloak SDK behaviour differs from docs                      | High       | High   | Phase 0–1 happen in parallel with Alven's SDK exploration; mocks unblock UI |
| Mainnet vs devnet drift breaks demo on the day             | Medium     | High   | Phase 7 mainnet smoke test rehearsed at least 24 h before submission        |
| Wallet adapter UX (Phantom popup blocked / fails)          | Medium     | Medium | `ProgressDialog` + `parseError` give clear recovery path                    |
| Save-key dialog dismissed accidentally → lost funds        | Low        | Severe | Modal is non-dismissible; "I have saved it" is the only exit                |
| Auditor dashboard accidentally surfaces destination wallet | Low        | Severe | Column allow-list in code; PR template flags any new audit field            |
| Bundle size blows past budget after wallet libs added      | Medium     | Medium | Code-split wallet code with `dynamic({ ssr: false })`; audit per phase      |
| Privacy regression via console / Sentry / analytics        | Medium     | Severe | Logger explicitly filters known-sensitive keys; reviewed in Phase 6         |
| Next.js 16 breaking change surprises us mid-build          | Medium     | Medium | Always consult `node_modules/next/dist/docs/` before routing work           |

---

## 12. Acceptance Checklist

A phase is **complete** only when every box below is checked.

### Universal (every phase)

- [ ] All commits follow the Conventional Commits spec from `rules.md` §1.
- [ ] No comments in `src/` (`rules.md` §5).
- [ ] All types live in `types/` files (`rules.md` §8).
- [ ] All styling uses tokens — **no raw colours, no gradients** (`rules.md` §18–19).
- [ ] `biome ci` + `tsc --noEmit` + `pnpm build` green.
- [ ] PR description includes a Vercel preview URL for any UI change.

### Phase-specific (highlights)

- [ ] **Phase 2:** all routes render every state on mobile + desktop, light + dark.
- [ ] **Phase 3:** connect / disconnect / cluster mismatch all work without errors.
- [ ] **Phase 4:** zero fixtures imported in production code paths.
- [ ] **Phase 5:** all eight E2E scenarios pass in CI.
- [ ] **Phase 6:** Lighthouse + bundle budgets green; no privacy regressions in network tab.
- [ ] **Phase 7:** mainnet smoke test recorded and submission packet sealed.

---

*This plan is a working document — update it when scope shifts. Update commits use `docs(rules): …`.*

