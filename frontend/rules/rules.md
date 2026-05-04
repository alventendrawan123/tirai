# Frontend Engineering Rules

Production-grade engineering standards for the **Tirai** Web3 frontend.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript 5 · TailwindCSS v4 · Biome · pnpm · Solana Wallet Adapter · `@cloak.dev/sdk`.

These rules are **mandatory**. Pull requests that violate them must be rejected at review.

> **Important:** Per `AGENTS.md`, this Next.js version contains breaking changes. Always confirm App Router conventions in `node_modules/next/dist/docs/` before authoring routing primitives.

---

## Table of Contents

0. [Platform Overview](#0-platform-overview)
1. [Commit Convention](#1-commit-convention)
2. [Branching Strategy](#2-branching-strategy)
3. [Pull Request Rules](#3-pull-request-rules)
4. [Clean Code Principles](#4-clean-code-principles)
5. [No Comments Policy](#5-no-comments-policy)
6. [Clean Architecture](#6-clean-architecture)
7. [Folder Structure](#7-folder-structure)
8. [Types & Interfaces Separation](#8-types--interfaces-separation)
9. [Naming Conventions](#9-naming-conventions)
10. [TypeScript Rules](#10-typescript-rules)
11. [React & Next.js Rules](#11-react--nextjs-rules)
12. [Web3 Specific Rules](#12-web3-specific-rules)
13. [State Management](#13-state-management)
14. [Error Handling](#14-error-handling)
15. [Security Rules](#15-security-rules)
16. [Performance Rules](#16-performance-rules)
17. [Testing Rules](#17-testing-rules)
18. [Design System & UI Rules](#18-design-system--ui-rules)
19. [Styling Rules (Tailwind v4 Tokens)](#19-styling-rules-tailwind-v4-tokens)
20. [Accessibility (a11y)](#20-accessibility-a11y)
21. [Tooling & Quality Gates](#21-tooling--quality-gates)
22. [Definition of Done](#22-definition-of-done)

---

## 0. Platform Overview

**Tirai** — *Privacy-first bounty payouts for Solana whitehats.*
Built for the **Cloak Hackathon · Frontier Track**.

Tirai is a bounty-payment system that places privacy as a first-class requirement. It is built on top of the **Cloak SDK**, using **Groth16 zero-knowledge proofs** and a **Poseidon Merkle tree** to sever the on-chain link between a researcher's identity and the payment they receive.

There is **no backend, no database, and no custom on-chain program**. All Tirai logic runs in the browser. The only deployed program we depend on is the Cloak Shield Pool, already live on Solana mainnet.

### Mission

Whitehat researchers should be able to receive bounty payments without doxxing themselves on a public ledger. Projects should still be able to prove (to auditors and regulators) that the payment occurred. Tirai delivers both: **observers see nothing, auditors see everything they need.**

### Layered Architecture

```
USER ROLES
├── PROJECT     (treasury, payer)
├── RESEARCHER  (whitehat, claimant)
└── AUDITOR     (compliance reviewer)

FRONTEND LAYER · Next.js 16 + React 19 + Solana Wallet Adapter
Routes: /pay (project) · /claim (researcher) · /audit (auditor)

TIRAI API LAYER · TypeScript wrapper around the Cloak SDK
lib/tirai/{bounty,claim,audit,ticket,utils}.ts
Exposes: createBountyPayment · claimBounty · scanAuditHistory · exportAuditReport

CLOAK SDK LAYER · @cloak.dev/sdk (external dependency)
Groth16 proof generation · Poseidon Merkle tree
Methods: transact · fullWithdraw · genUtxoKey · scanTx · complianceRpt

SOLANA MAINNET · Cloak Shield Pool Program
Program ID: zh1eLd6rSphLejbFfJEneUwzHRfMKxgzrgkfwA6qRkW
(Already deployed by the Cloak team — Tirai deploys nothing.)
```

### Roles & Routes

| Role         | Route     | Capability                                                          |
|--------------|-----------|---------------------------------------------------------------------|
| **Project**  | `/pay`    | Connect treasury wallet, deposit a bounty, mint an opaque ticket.   |
| **Researcher** | `/claim` | Inspect a ticket, choose wallet mode (fresh / existing), withdraw.  |
| **Auditor**  | `/audit`  | Paste a viewing key, scan history, export PDF/CSV (read-only).      |

### Tech Stack

| Concern                  | Library                                                  |
|--------------------------|----------------------------------------------------------|
| Framework                | Next.js 16 (App Router) · React 19                       |
| Language                 | TypeScript 5 (strict)                                    |
| Styling                  | TailwindCSS v4 (token-first, monochrome)                 |
| Linting / formatting     | Biome                                                    |
| Package manager          | pnpm                                                     |
| Wallet integration       | `@solana/wallet-adapter-react` (Phantom + Solflare)      |
| Chain client             | `@solana/web3.js` (`@solana/kit` optional)               |
| Privacy SDK              | `@cloak.dev/sdk` (mainnet) · `@cloak.dev/sdk-devnet`     |
| PDF generation           | `pdf-lib` (browser-side)                                 |
| QR code generation       | `qrcode.react`                                           |
| Local dev environment    | Surfpool (Solana fork)                                   |

### User Flows (high level)

**Project flow** — Connect wallet → enter amount + label → sign → SDK generates ZK proof and submits deposit → frontend renders an opaque **claim ticket** (string + QR). The ticket is shared off-chain with the researcher.

**Researcher flow** — Open the claim link or scan QR → frontend inspects the ticket (preview, no transaction) → user picks wallet mode (**fresh** = SDK generates a brand-new keypair, maximum privacy; **existing** = use the connected wallet) → SDK proves and submits `fullWithdraw` → funds land in the destination wallet. If fresh mode is used, the UI MUST surface a high-prominence dialog asking the user to **save the secret key**.

**Auditor flow** — Receive a viewing key from the project off-chain → paste it at `/audit` → frontend calls `scanTransactions` → decrypted history renders as a dashboard → export to PDF or CSV. The dashboard MUST NOT display the researcher's destination wallet — that field is intentionally absent from the API contract.

### Privacy Boundaries

The system enforces **three** distinct privacy boundaries. Every feature MUST preserve all three.

1. **Project ↔ Researcher (wallet link).** Cloak's shield pool decouples the treasury deposit from the researcher's withdrawal. An on-chain observer sees two unrelated transactions.
2. **Researcher ↔ Public (KYC link).** When fresh-wallet mode is chosen, the destination address has no prior history, breaking the link to any KYC'd identity (Immunefi, exchange, etc.).
3. **Auditor ↔ Researcher (read-only scope).** The viewing key is cryptographically scoped to *read* payment facts only. It cannot trace the researcher's destination wallet. This is enforced inside the SDK; the UI MUST never attempt to surface that field.

### Engineering Implications

These product properties translate into **non-negotiable** rules for this codebase:

- **No telemetry of sensitive material.** Tickets, viewing keys, secret keys, and destination addresses are NEVER sent to analytics, logs, Sentry breadcrumbs, error reports, or query-string state.
- **No server persistence.** There is no backend; do not introduce one without an architecture decision. Anything that *looks* like server state is either client-side, on-chain, or off-chain user-to-user.
- **Off-chain transmission is user-controlled.** Tickets and viewing keys are surfaced via QR code and copy-to-clipboard. The app MUST NOT auto-share, post to a webhook, or relay these values.
- **Fresh-wallet UX is critical.** Losing the secret key = losing the funds. The save-key dialog MUST be modal, dismiss-blocked until acknowledged, and offer download + copy.
- **Auditor surface is intentionally narrow.** Any new field added to the audit dashboard must be reviewed against Privacy Boundary 3 before merge. When in doubt, omit.
- **Mainnet is the demo target.** Develop against Surfpool / devnet; verify on mainnet before shipping. Never hardcode devnet URLs in production builds.

---

## 1. Commit Convention

We follow **Conventional Commits 1.0.0** with a Web3-oriented type set. Every commit MUST be parseable by `commitlint` / Biome's CI hook.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

- `type` — required, lowercase.
- `scope` — required for feature-area commits, optional for repo-wide chores.
- `subject` — imperative mood, lowercase, no trailing period, ≤ 72 chars.
- `body` — wrap at 100 chars, explain **why**, not **what**.
- `footer` — `BREAKING CHANGE:`, `Refs:`, `Closes:` references.

### Allowed Types

| Type        | Use for                                                                 |
|-------------|-------------------------------------------------------------------------|
| `feat`      | A new user-facing feature.                                              |
| `fix`       | A bug fix.                                                              |
| `docs`      | Documentation-only changes (README, rules, in-repo MD).                 |
| `style`     | Formatting, whitespace, semicolons (no logic change).                   |
| `refactor`  | Code change that neither fixes a bug nor adds a feature.                |
| `perf`      | Performance improvement.                                                |
| `test`      | Adding or correcting tests.                                             |
| `build`     | Build system, bundler, or external dependencies (pnpm, next.config).    |
| `ci`        | CI configuration files and scripts (GitHub Actions, Vercel).            |
| `chore`     | Routine maintenance, no `src/` change.                                  |
| `revert`    | Reverts a previous commit.                                              |
| `contract`  | Smart contract ABI / address updates consumed by the frontend.          |
| `wallet`    | Wallet connector / provider integration changes (RainbowKit, wagmi).    |
| `chain`     | Network / RPC / chain configuration changes.                            |
| `security`  | Security hardening (CSP, sanitization, dependency CVE patches).         |
| `i18n`      | Translation / locale updates.                                           |
| `a11y`      | Accessibility improvements.                                             |

### Allowed Scopes (examples)

`auth`, `wallet`, `swap`, `bridge`, `nft`, `staking`, `governance`, `tx`, `rpc`, `ui`, `theme`, `home`, `dashboard`, `api`, `hooks`, `store`, `config`, `deps`.

### Examples

```
feat(swap): add slippage tolerance selector

Allows users to choose 0.1 / 0.5 / 1.0 % presets or a custom value.
Default remains 0.5 % to match the previous behavior.

Closes: #142
```

```
fix(wallet): handle WalletConnect v2 session expiry

Reconnect was failing silently when the session TTL elapsed in the
background. We now force a fresh handshake and surface a toast.

Refs: TIRAI-318
```

```
contract(staking): bump StakingVault address to 0xA1...e9

BREAKING CHANGE: previous vault is paused. Users must migrate via /migrate.
```

### Hard Rules

- **No** `wip`, `update`, `change`, `misc`, `final`, `asdf` style messages.
- **No** emoji in commit subject (footers only, if at all).
- **No** mixing unrelated changes in one commit.
- **One logical change per commit.** If you can split it, split it.
- Never amend or force-push to `main` or any shared branch.

---

## 2. Branching Strategy

Trunk-based with short-lived feature branches.

```
main         → always deployable, protected, production
develop      → integration branch (only if release trains exist)
feat/<scope>-<short-desc>
fix/<scope>-<short-desc>
hotfix/<scope>-<short-desc>
chore/<short-desc>
release/<semver>
```

Rules:

- Branch names use **kebab-case**, ASCII only, ≤ 50 chars.
- Rebase onto `main` before opening a PR. No merge commits in feature branches.
- Delete the branch after merge.

---

## 3. Pull Request Rules

- Title MUST match commit convention (`feat(scope): …`).
- Description MUST include: **Summary**, **Why**, **Screenshots/Recordings** (for UI), **Test plan**, **Risk**.
- Keep PRs **≤ 400 changed lines** when possible. Split otherwise.
- All PRs require: 1 reviewer minimum, green CI, no Biome errors, no TS errors, no console warnings.
- Squash-merge by default; the merge commit message equals the PR title + body.
- Link the issue (`Closes #id`).

---

## 4. Clean Code Principles

We follow Robert C. Martin's *Clean Code* with Web3 adjustments.

### General

- **Single Responsibility** — one reason to change per file/function/component.
- **Small functions** — ≤ 30 lines, ≤ 3 parameters; otherwise refactor.
- **Small files** — ≤ 250 lines; split modules above that.
- **DRY** but not premature. Three duplications → extract; two → leave.
- **YAGNI** — do not build for hypothetical futures.
- **Pure functions first** — side effects live at the edges.
- **Fail fast** — validate inputs at boundaries, then trust internally.
- **No magic numbers / strings** — promote them to named constants in `constants/`.
- **No dead code, no commented-out code.** Delete it; git remembers.
- **No TODO without a ticket** — `// TODO(TIRAI-123): …` with a Linear/GitHub link, or do not write it.

### Functions

- Verb-first names: `formatTokenAmount`, `signSwapPayload`, `useWalletBalance`.
- Boolean returns and props use `is/has/can/should`: `isConnected`, `hasAllowance`.
- Return early; no nested `else`. Maximum cyclomatic complexity: **10**.

### Modules

- One default export per module is forbidden — always **named exports**.
- Re-exports go through a sibling `index.ts` barrel **only** when it does not break tree-shaking.

---

## 5. No Comments Policy

**Source code MUST contain zero comments.** Code expresses intent through naming and structure.

### Hard rules

- ❌ No `//` or `/* */` in any `.ts`, `.tsx`, `.js`, `.jsx`, `.css` file inside `src/`.
- ❌ No JSDoc on internal code.
- ❌ No banner / section comments (`// ===== HOOKS =====`).
- ❌ No commented-out code, ever.
- ❌ No "temporary" comments — there are no temporary comments.

### Narrow exceptions (write a justification in the PR)

- ✅ License headers in third-party-derived files (legally required only).
- ✅ `biome-ignore` / `eslint-disable-next-line` with a **reason** on the same line.
- ✅ Public SDK packages exposed to external consumers MAY use TSDoc.
- ✅ Markdown (`.md`), config files (`.yml`, `.json` with schema), and contract ABIs MAY contain comments where the format allows.

If you feel you need a comment, the code is wrong. Rename, extract, or restructure until the comment is unnecessary.

---

## 6. Clean Architecture

We apply a layered architecture inspired by Hexagonal / Ports & Adapters, adapted for a React/Next.js client.

### Layers (dependencies point inward only)

```
┌──────────────────────────────────────────────────────────┐
│  Presentation     → app/, components/, hooks/ui          │
│  Application      → features/<feat>/use-cases, stores    │
│  Domain           → features/<feat>/domain, types/       │
│  Infrastructure   → lib/, services/, adapters/, config/  │
└──────────────────────────────────────────────────────────┘
```

### Rules

- **Domain has zero imports** from React, Next, wagmi, viem, axios.
- **Presentation never** talks to RPC / fetch directly — always via a hook → use-case → adapter chain.
- **Adapters** wrap external SDKs (viem, wagmi, ethers, fetch). Swap the adapter, the rest survives.
- **Server Components** belong to Presentation but may import Application & Infrastructure directly when no client interactivity is needed.
- **Client Components** (`"use client"`) MUST be the leaves of the render tree. Pull `"use client"` as deep as possible.

### Dependency Inversion

- Components depend on **interfaces**, not concrete implementations.
- Implementations are injected via custom hooks or context providers at the route boundary.

---

## 7. Folder Structure

> Reminder from `AGENTS.md`: **Next.js 16 has breaking changes.** Confirm App Router file conventions in `node_modules/next/dist/docs/` before adding routing primitives (route groups, parallel routes, intercepting routes, `route.ts`, `layout.tsx`, `template.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`).

```
frontend/
├── public/                       # static assets (svg, images, fonts manifests)
├── src/
│   ├── app/                      # Next.js App Router (routes only)
│   │   ├── (marketing)/          # route groups
│   │   ├── (app)/
│   │   ├── api/                  # route handlers (server-only)
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   │
│   ├── components/               # cross-feature, presentational only
│   │   ├── ui/                   # primitives: Button, Input, Card, Modal
│   │   ├── layout/               # Header, Footer, Container, Sidebar
│   │   └── icons/                # SVG components
│   │
│   ├── features/                 # one folder per business capability
│   │   └── <feature>/
│   │       ├── components/       # feature-scoped UI
│   │       ├── hooks/            # feature-scoped hooks
│   │       ├── use-cases/        # application layer
│   │       ├── domain/           # pure logic, value objects
│   │       ├── adapters/         # rpc / api / storage adapters
│   │       ├── store/            # zustand / jotai slice
│   │       ├── types/            # types & interfaces
│   │       ├── constants.ts
│   │       └── index.ts          # public surface
│   │
│   ├── hooks/                    # global reusable hooks
│   ├── lib/                      # framework-agnostic utilities
│   │   ├── utils/                # formatters, guards, math
│   │   ├── http/                 # fetch client, interceptors
│   │   ├── web3/                 # viem clients, chain configs
│   │   └── crypto/               # hashing, signature helpers
│   ├── services/                 # third-party SDK wrappers (analytics, sentry)
│   ├── config/                   # env loader, feature flags, chain map
│   ├── providers/                # React providers (Wagmi, Theme, Query)
│   ├── store/                    # global state (zustand root)
│   ├── styles/                   # tailwind layers, design tokens
│   ├── types/                    # global, framework-level types
│   └── constants/                # global constants, regex, enums
│
├── rules/                        # engineering rules (this file)
├── biome.json
├── next.config.ts
├── postcss.config.mjs
├── tsconfig.json
└── package.json
```

### Folder rules

- A feature folder is **self-contained**. Cross-feature imports MUST go through the feature's `index.ts`.
- `components/` is for **truly reusable** primitives. If a component is used by exactly one feature, it lives in that feature.
- Never reach into another feature's internals (`features/swap/domain/...` from `features/staking` is forbidden).
- All files use `kebab-case` (`swap-form.tsx`, `format-token-amount.ts`). React component identifiers exported from those files remain `PascalCase`.
- One primary component per file. Filename matches the kebab-case form of the exported component (`SwapForm` → `swap-form.tsx`).

### Pages Architecture (route ↔ component split)

The Next.js `app/` directory is **for routing only**. Page UI lives under `src/components/pages/<group>/<page>/`. Every `app/.../page.tsx` MUST be a thin **5-line** binding that imports a single `XxxPage` component from `components/pages` and renders it. **No JSX, no hooks, no logic** in `app/` route files.

Why:

- **Separation of concerns:** routing (URL → file) is decoupled from rendering (UI composition).
- **Discoverability:** every page UI lives at a predictable path under `components/pages/`, mirroring the route structure.
- **Testability:** page components are plain React components — they can be rendered in tests, Storybook, or kitchen-sink routes without invoking the Next.js router.
- **Reusability:** a page component can be embedded in another context (preview, embed, screenshot) without coupling to the route system.

#### Required structure

Mirror the App Router route groups under `components/pages/`. Use the same group names (`(app)`, `(marketing)`, …) so the two trees stay in lock-step.

```
src/
├── app/
│   ├── layout.tsx
│   ├── globals.css
│   └── (app)/                                  # route group
│       ├── pay/page.tsx                        # 5-line route binding
│       ├── claim/page.tsx                      # 5-line route binding
│       └── audit/page.tsx                      # 5-line route binding
│
└── components/
    └── pages/
        └── (app)/                              # mirrors app/(app)/
            ├── pay/
            │   ├── components/                 # page-scoped sub-components
            │   ├── types/                      # page-scoped types (optional)
            │   ├── pay-page.tsx                # the page component
            │   └── index.ts                    # `export { PayPage } from "./pay-page"`
            ├── claim/
            │   ├── components/
            │   ├── claim-page.tsx
            │   └── index.ts
            ├── audit/
            │   ├── components/
            │   ├── audit-page.tsx
            │   └── index.ts
            └── index.ts                        # group barrel
```

#### Naming rules

- Page component file: `<page>-page.tsx` (kebab-case).
- Page component name: `PascalCase` ending in `Page` — `PayPage`, `ClaimPage`, `AuditPage`.
- Per-page barrel: `index.ts` re-exports only the named page component (`export { PayPage } from "./pay-page";`). **No default exports.**
- Group barrel: `components/pages/(app)/index.ts` re-exports every page in the group for convenient cross-import inside other components (never inside `app/`).
- Page-scoped sub-components live in `<page>/components/<sub>.tsx`. They MUST NOT be imported from outside the page folder.
- Page-scoped types live in `<page>/types/*.ts` per `rules.md` §8.

#### The 5-line rule (6 with a typed prop)

Every file in `app/.../page.tsx` MUST follow exactly this shape (≤ 5 lines, blank line included):

```tsx
import { PayPage } from "@/components/pages/(app)/pay";

export default function Page() {
  return <PayPage />;
}
```

When the route forwards `params` or `searchParams`, **one extra import is permitted** for the shared `PageProps<T>` helper from `@/types`, bringing the file to **≤ 6 lines**. Anything beyond that means logic is leaking into the route file — push it into the page component instead.

```tsx
import { PayPage } from "@/components/pages/(app)/pay";
import type { PageProps } from "@/types";

export default async function Page({ searchParams }: PageProps) {
  return <PayPage searchParams={await searchParams} />;
}
```

What is **forbidden** in `app/.../page.tsx`:

- ❌ JSX beyond `<XxxPage />` (no wrappers, no `<Suspense>`, no providers — those go in `layout.tsx` or in the page component itself).
- ❌ Any hook (`useState`, `useEffect`, `useSearchParams`, …).
- ❌ Data fetching (`fetch`, `await`, server-only imports). Lift it into the page component or a co-located server util.
- ❌ Renaming the default export (`export default function PayRoute` is fine, but it MUST do nothing other than render the page component).
- ❌ Multiple imports. Exactly one import: the page component. Route-level metadata (`metadata`, `generateMetadata`, `revalidate`, `dynamic`, …) is the only allowed addition, and goes **above** the import block.

What **is** allowed alongside the 5-line binding (still inside `app/.../page.tsx`):

- ✅ `export const metadata: Metadata = { … };`
- ✅ `export const revalidate = 60;`
- ✅ `export const dynamic = "force-static";`

These route-level constants do not count against the 5-line rule, but the rendered output MUST remain `<XxxPage />`.

#### Passing route params

If the route depends on `params` or `searchParams`, forward them — do **not** parse them in `page.tsx`:

```tsx
import { ClaimPage } from "@/components/pages/(app)/claim";

export default async function Page({ searchParams }: { searchParams: Promise<{ ticket?: string }> }) {
  return <ClaimPage searchParams={await searchParams} />;
}
```

Parsing, validation (`zod`), and any branching live inside `ClaimPage` (or a hook it calls). The route file remains a thin pass-through.

#### Co-location rules

- A sub-component used **only** by one page → `components/pages/<group>/<page>/components/`.
- A sub-component used by **two or more pages** in the same group → `components/pages/<group>/_shared/`.
- A sub-component used by pages **across groups** → promote to `components/ui/` (truly reusable) or to a feature folder.
- Domain logic (use-cases, adapters, stores) **never** lives under `components/pages/`. It belongs in `features/<feat>/` per §7.

#### Imports

- `app/.../page.tsx` imports from `@/components/pages/<group>/<page>` (per-page barrel) — never deep imports.
- Page components import their sub-components via relative paths (`./components/pay-form`).
- Cross-page imports inside the same group go through the group barrel (`@/components/pages/(app)`).
- Cross-group imports are forbidden — promote shared UI to `components/ui/` instead.

---

## 8. Types & Interfaces Separation

**Types and interfaces MUST live in dedicated files**, never co-located inside a component or hook file beyond trivial local aliases.

### Rules

- Each feature owns `features/<feat>/types/` with one file per concern:
  - `<feat>.types.ts` — domain models.
  - `<feat>.dto.ts` — wire / API shapes.
  - `<feat>.props.ts` — component props.
  - `<feat>.store.ts` — store slice types.
- Global, framework-wide types live in `src/types/`.
- Use `interface` for **object shapes that may be extended** (props, models).
- Use `type` for **unions, intersections, mapped types, and primitive aliases**.
- Always export types from a single barrel `types/index.ts` per feature.
- Never re-declare a type that exists in a library — import it.

### Naming

- Interface: `interface UserProfile { ... }` — no `I` prefix.
- Props: `interface SwapFormProps { ... }` — always suffixed `Props`.
- Enums: prefer **string union types** over `enum`. Use `as const` objects when a runtime map is needed.
- DTOs: suffix `Dto` (`SwapQuoteDto`).
- Mappers: `toDomain`, `toDto`.

### Example

```ts
// features/swap/types/swap.types.ts
export interface SwapQuote {
  inputAmount: bigint;
  outputAmount: bigint;
  priceImpactBps: number;
  route: SwapRoute;
}

export type SwapStatus =
  | "idle"
  | "quoting"
  | "ready"
  | "signing"
  | "broadcasting"
  | "confirmed"
  | "failed";
```

```tsx
// features/swap/components/swap-form.tsx
import type { SwapFormProps } from "../types";

export function SwapForm({ onSubmit }: SwapFormProps) { /* ... */ }
```

---

## 9. Naming Conventions

| Entity                  | Convention             | Example                            |
|-------------------------|------------------------|------------------------------------|
| File (any)              | kebab-case             | `swap-form.tsx`, `format-token-amount.ts` |
| React component         | PascalCase             | `SwapForm`                         |
| Hook                    | `useCamelCase`         | `useTokenBalance`                  |
| Boolean                 | `is/has/can/should`    | `isConnected`, `hasAllowance`      |
| Event handler (prop)    | `onPascalCase`         | `onSubmit`, `onChainChange`        |
| Event handler (local)   | `handlePascalCase`     | `handleSwapClick`                  |
| Constant                | `SCREAMING_SNAKE_CASE` | `MAX_SLIPPAGE_BPS`                 |
| Enum-like map           | `PascalCase` `as const`| `ChainId`, `SwapStatus`            |
| Folder                  | kebab-case             | `use-cases/`, `components/`        |
| CSS variable            | `--kebab-case`         | `--color-bg-main`                  |
| Tailwind utility token  | kebab-case             | `bg-main`, `text-primary`          |

---

## 10. TypeScript Rules

- `tsconfig.json` MUST keep `strict: true`, plus `noUncheckedIndexedAccess`, `noImplicitOverride`, `exactOptionalPropertyTypes`.
- ❌ No `any`. Use `unknown` and narrow.
- ❌ No `as` casting except to widen `unknown` after a runtime guard.
- ❌ No `@ts-ignore`. `@ts-expect-error` is allowed only with a written reason on the same line.
- ✅ Prefer `satisfies` over annotations for literal validation.
- ✅ Branded types for domain primitives:
  ```ts
  type Address = `0x${string}` & { readonly __brand: "Address" };
  ```
- ✅ Use `bigint` for token amounts. Never `number`. Never `string` arithmetic.
- ✅ Discriminated unions for state machines (`SwapStatus`, request states).
- ✅ Exhaustive `switch` with `assertNever(x: never): never`.
- ✅ Function signatures use **named object parameters** when ≥ 2 args.
- Imports: use path aliases (`@/features/...`), never deep relative (`../../../`).

---

## 11. React & Next.js Rules

> Confirm Next 16 specifics in `node_modules/next/dist/docs/` before authoring routing files.

### React 19

- Use the **React Compiler** (already in devDeps) — do not hand-write `useMemo`/`useCallback` unless the compiler cannot infer.
- Prefer `use(promise)` and Server Components for async data; avoid `useEffect` for data fetching.
- **No `useEffect`** for: derived state, syncing props to state, fetching data, running once on mount → use a derived value, key-based reset, or Server Component.
- Use Actions (`useActionState`, `useFormStatus`) for mutations.

### Server vs Client

- Default to **Server Components**. Add `"use client"` only when a component needs state, effects, browser APIs, or wallet hooks.
- Push `"use client"` to the leaves. A page should not be a Client Component.
- Server Components MUST NOT import client-only modules (wagmi, framer-motion, anything touching `window`).
- Pass **serializable props only** across the server↔client boundary.

### Routing

- Co-locate `loading.tsx`, `error.tsx`, `not-found.tsx` for every route segment that fetches data.
- `error.tsx` MUST be a Client Component and reset gracefully.
- Use Route Groups `(group)` for layout grouping without affecting the URL.
- Use `route.ts` for API endpoints; never call them via `fetch` from Server Components — call the function directly.

### Components

- **Functional components only.** No classes.
- File order: imports → type imports → component → sub-components → exports.
- Props are destructured in the signature.
- One `return` per component — extract sub-components instead of branching JSX trees.
- Lists MUST have stable, unique `key`s. **Never** `key={index}` for dynamic lists.
- Forms: use uncontrolled inputs + Server Actions where possible; otherwise `react-hook-form` + `zod`.

---

## 12. Web3 Specific Rules

Tirai is a **Solana** application built on the **Cloak SDK**. All Web3 rules below assume the Solana runtime and the Cloak Shield Pool program.

### Libraries

- Wallet: **`@solana/wallet-adapter-react`** with Phantom + Solflare adapters.
- Chain client: **`@solana/web3.js`** (and optionally `@solana/kit`). No alternative RPC clients.
- Privacy SDK: **`@cloak.dev/sdk`** (mainnet) / **`@cloak.dev/sdk-devnet`** (local). Never bypass the SDK to call the Cloak program directly.
- The Tirai API (`lib/tirai/*`) is the **only** allowed call path from UI into the Cloak SDK. Components never import `@cloak.dev/sdk` directly.

### Numbers & Money

- All on-chain amounts are `bigint` (lamports / token base units). **Never** `number` for math.
- Convert to display via a single util (`formatLamports`, `formatTokenAmount`, `formatSol`) — no inline math in JSX.
- Always pair an amount with its `decimals` and `symbol`. No bare numbers in the UI.

### Transactions

Every write call MUST:

1. Pre-validate inputs (amount > 0, label sanitized, balance sufficient).
2. Surface a progress dialog wired to the SDK's progress callback (proof generation can take ~3 s).
3. Show the tx signature + a Solscan link as soon as it is available.
4. Wait for the configured commitment (`confirmed` minimum; `finalized` for irreversible UX states).
5. Decode and surface SDK / program errors via a single `parseError()` helper. Never leak raw stack traces.

Idempotency: dedupe rapid double-clicks with a request id; disable the action button while in flight.
Never broadcast a tx without an explicit user gesture (button click).

### Chain, RPC & Environments

- Cluster + RPC URL come from `src/config/cluster.ts`, sourced from `process.env.NEXT_PUBLIC_*` and validated via `zod`.
- **No public RPCs in production.** Use a paid provider (Helius / Triton / QuickNode).
- The Cloak Shield Pool program ID (`zh1eLd6rSphLejbFfJEneUwzHRfMKxgzrgkfwA6qRkW`) lives in `src/config/cloak.ts`. Never hardcode it in components.
- Detect wrong cluster (e.g. wallet on devnet, app on mainnet) and prompt the user to switch.

### Wallet Modes

- `/claim` MUST offer two modes: **fresh** (SDK-generated keypair, default, maximum privacy) and **existing** (connected wallet adapter).
- Fresh mode MUST display a **modal save-key dialog**:
  - Cannot be dismissed by overlay-click or `Esc`.
  - Provides "Copy", "Download `.txt`", and "I have saved it" actions.
  - The "I have saved it" button is the only path forward.
- The secret key is held in memory only — never written to `localStorage`, cookies, telemetry, or query strings.

### Tickets & Viewing Keys

- **Claim tickets** are opaque strings. Encode/decode lives in `lib/tirai/ticket.ts` and is the only place that touches the format.
- Tickets are surfaced via QR (`qrcode.react`) and a copy-to-clipboard button. The app MUST NOT POST a ticket to any endpoint.
- **Viewing keys** follow the same surfacing rules as tickets and additionally MUST be redacted in logs (`vk_••••`).
- Inspect-before-claim is mandatory: `/claim` previews a ticket via `inspectClaimTicket` before any signing prompt appears.

### Addresses & Identifiers

- Display addresses base58-truncated as `Abcd…WxYz` with a copy button and a Solscan link.
- Validate addresses with `PublicKey` from `@solana/web3.js` at every input boundary.
- Never display the researcher's destination wallet inside the **auditor** surface — that field is intentionally absent from the API contract and MUST stay absent.

### Security

- **Never** ask for a user's seed phrase or imported private key.
- **Never** auto-broadcast a transaction. Every signature requires an explicit user click.
- Sanitize all on-chain string metadata (memo, label) — clamp length and escape before render.
- Do not log secrets, tickets, viewing keys, signatures, or destination wallets to telemetry, Sentry breadcrumbs, or `console`.
- The audit dashboard's column set is allow-listed in code. Adding a column requires explicit review against Privacy Boundary 3 (see §0).

---

## 13. State Management

- **Server state** → React Server Components, `use()`, `@tanstack/react-query` for client-side cache. Never store server data in zustand.
- **Client state** → `zustand` slices per feature. Selectors only — no whole-store subscriptions.
- **URL state** → `useSearchParams` / typed router. Filters, tabs, modals (`?modal=connect`) belong in the URL.
- **Form state** → `react-hook-form` + `zod`.
- **Derived state** → compute on render. Do not store.

Slice rules:

- One file per slice: `features/<feat>/store/<feat>.store.ts`.
- Export a typed hook: `useSwapStore`.
- Actions are colocated; no thunks living elsewhere.
- Persist only what survives a refresh (use `persist` middleware with explicit `partialize`).

---

## 14. Error Handling

- Errors are **typed**. Define an `AppError` discriminated union per domain:

  ```ts
  type SwapError =
    | { kind: "INSUFFICIENT_BALANCE"; required: bigint; available: bigint }
    | { kind: "SLIPPAGE_EXCEEDED"; expected: bigint; got: bigint }
    | { kind: "USER_REJECTED" }
    | { kind: "RPC"; message: string };
  ```

- Use **Result types** at adapter boundaries:
  `type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }`.
- Throw only for **programmer errors** (invariant violations).
- All async UI must render: `idle`, `loading`, `error`, `empty`, `success`.
- Wire errors to **Sentry / logging** in `services/logger.ts`. Never `console.error` in production code.
- Show user-friendly messages from a single `errors.messages.ts` map. Never leak raw RPC strings to users.

---

## 15. Security Rules

- Never log secrets, signatures, or full addresses to telemetry.
- All env vars read through `src/config/env.ts` validated by `zod`. Build fails on missing/invalid env.
- Public env vars MUST start with `NEXT_PUBLIC_`. Anything else is server-only.
- Set strict CSP, `X-Frame-Options`, `Referrer-Policy: strict-origin-when-cross-origin` in `next.config.ts` headers.
- Sanitize all user-rendered HTML through DOMPurify; default is text only.
- External links: `target="_blank" rel="noopener noreferrer"`.
- Never `dangerouslySetInnerHTML` without a written exemption.
- Validate **all** inputs at the boundary with `zod`, even from "trusted" APIs.

---

## 16. Performance Rules

- Lighthouse targets on production: Perf ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95.
- Core Web Vitals: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1.
- Images: `next/image` only. Always set `width`, `height`, `alt`, and `sizes` for responsive images.
- Fonts: `next/font` with `display: "swap"` and subset. No `<link>` to Google Fonts.
- Code-split heavy client components with `dynamic(() => import(...), { ssr: false })` when wallet-only.
- No unnecessary `"use client"`. Each one is a perf debt entry.
- Avoid hydrating large JSON — pass derived primitives instead.
- Memoize expensive lists with stable keys; let the React Compiler handle the rest.
- Bundle budget per route: **≤ 180 KB gz** initial JS. CI fails over budget.

---

## 17. Testing Rules

| Layer            | Tool                                    | Coverage target    |
|------------------|-----------------------------------------|--------------------|
| Unit             | Vitest                                  | ≥ 80 %             |
| Component        | Vitest + Testing Library                | ≥ 80 %             |
| E2E              | Playwright                              | All critical flows |
| Contract types   | viem `Abi` typecheck via `tsc --noEmit` | 100 %              |

Rules:

- Test names: `describe("formatTokenAmount", () => it("rounds to <decimals> places", …))`.
- One assertion concept per test.
- No mocking of network at the unit layer — mock at the **adapter**.
- E2E tests run against an **Anvil** fork, never mainnet.
- Snapshot tests are forbidden for UI; use explicit assertions.

---

## 18. Design System & UI Rules

### Design Direction

- **Aesthetic:** modern, minimal, **strictly monochrome** — only black, white, and grayscale tones.
- **Mood:** confident, technical, generous whitespace, typography-led.
- **Motion:** restrained — `ease-out`, 150–250 ms, no bounce, no parallax.
- **Density:** comfortable, not dense. Touch targets ≥ 44 px.

### Hard Visual Rules — No Exceptions

- ❌ **No gradients.** Not in backgrounds, buttons, text, borders, shadows, or icons. Solid fills only.
- ❌ **No brand colors, no accent hues.** The palette is **black + white + grayscale** only. Status colors (success/warning/danger/info) are reserved for *system states* and must never be used decoratively.
- ❌ **No glassmorphism, blur effects, or backdrop-filter** as a visual flourish. (Allowed only when functionally required, e.g. modal overlay scrim.)
- ❌ **No drop shadows used for "depth" or style.** Borders are the primary separator. Shadows are reserved for floating layers (modals, popovers).
- ❌ **No emoji, illustrations, or 3D renders** as decorative content.
- ❌ **No coloured icons, stickers, or stock imagery.** Iconography is monochrome strokes only.
- ❌ **No animated/looping backgrounds, particles, or noise textures.**
- ❌ **No more than 2 typefaces** on a page (`font-sans` + `font-mono`).
- ✅ Visual hierarchy is achieved through **typography scale, weight, spacing, and grayscale contrast** — never colour.

### Color Palette

Strict **monochrome**. No colored brand accents. Semantic state colors are the only exceptions and are also rendered in grayscale unless a status truly demands hue.

| Role            | Light            | Dark             |
|-----------------|------------------|------------------|
| `bg-main`       | `#FFFFFF`        | `#0A0A0A`        |
| `bg-secondary`  | `#F5F5F5`        | `#141414`        |
| `bg-tertiary`   | `#EAEAEA`        | `#1F1F1F`        |
| `bg-inverse`    | `#0A0A0A`        | `#FFFFFF`        |
| `text-primary`  | `#0A0A0A`        | `#FAFAFA`        |
| `text-secondary`| `#525252`        | `#A3A3A3`        |
| `text-muted`    | `#737373`        | `#737373`        |
| `text-inverse`  | `#FFFFFF`        | `#0A0A0A`        |
| `border-subtle` | `#E5E5E5`        | `#262626`        |
| `border-strong` | `#0A0A0A`        | `#FAFAFA`        |
| `overlay`       | `rgba(0,0,0,.6)` | `rgba(0,0,0,.7)` |

State colors (use sparingly, only when grayscale is ambiguous):

- `success` `#16A34A`
- `warning` `#D97706`
- `danger`  `#DC2626`
- `info`    `#2563EB`

### Typography

- Display: `--font-sans` (Geist Sans).
- Mono / numerals: `--font-mono` (Geist Mono) — use for **all** token amounts and addresses.
- Scale: `xs 12 / sm 14 / base 16 / lg 18 / xl 20 / 2xl 24 / 3xl 30 / 4xl 36 / 5xl 48 / 6xl 60`.
- Line height: tight `1.1` for headings, `1.5` for body.
- Tracking: `-0.02em` for headings ≥ `2xl`, `0` otherwise.
- Weights used: `400`, `500`, `600`. **Never** `700+` (too loud for monochrome minimal).

### Spacing & Layout

- 4-pt grid. Allowed steps: `0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32`.
- Container max-widths: `sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1440`.
- Section vertical rhythm: `py-16 md:py-24 lg:py-32`.

### Radii & Borders

- Radii: `none 0 / sm 4 / md 8 / lg 12 / xl 16 / 2xl 24 / full 9999`.
- Default component radius: `md`.
- Border width: `1px` default, `2px` for emphasized states.

### Elevation

- We avoid heavy shadows. Use **borders** for separation first.
- Allowed shadows: `shadow-sm` (cards on hover), `shadow-md` (modals), `shadow-lg` (popovers). No colored shadows.

### Components (canonical primitives)

`Button`, `IconButton`, `Input`, `Textarea`, `Select`, `Combobox`, `Checkbox`, `Radio`, `Switch`, `Slider`, `Tabs`, `Accordion`, `Dialog`, `Drawer`, `Popover`, `Tooltip`, `Toast`, `Card`, `Badge`, `Avatar`, `Skeleton`, `Spinner`, `Table`, `Pagination`, `Breadcrumb`, `Stepper`, `EmptyState`, `AddressPill`, `TokenAmount`, `TxStatus`, `WalletButton`, `NetworkSwitcher`.

Variants per primitive (Button example): `primary | secondary | ghost | outline | destructive`, sizes `sm | md | lg | icon`. State: `default | hover | active | focus-visible | disabled | loading`.

### Iconography

- Stroke icons only, `1.5px` stroke (Lucide). No filled icons except status dots.
- Icon sizes: `12 / 16 / 20 / 24`. Match adjacent text size.

---

## 19. Styling Rules (Tailwind v4 Tokens)

We use **TailwindCSS v4** with a CSS-first theme. **All styling MUST go through the design tokens** declared in `globals.css`. Raw color literals (`#fff`, `bg-zinc-900`) in components are **forbidden**.

### Token source of truth

`src/app/globals.css`:

```css
@import "tailwindcss";

@theme {
  /* Surfaces */
  --color-bg-main: #ffffff;
  --color-bg-secondary: #f5f5f5;
  --color-bg-tertiary: #eaeaea;
  --color-bg-inverse: #0a0a0a;

  /* Text */
  --color-text-primary: #0a0a0a;
  --color-text-secondary: #525252;
  --color-text-muted: #737373;
  --color-text-inverse: #ffffff;

  /* Borders */
  --color-border-subtle: #e5e5e5;
  --color-border-strong: #0a0a0a;

  /* State */
  --color-success: #16a34a;
  --color-warning: #d97706;
  --color-danger: #dc2626;
  --color-info: #2563eb;

  /* Radii */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-2xl: 24px;

  /* Motion */
  --ease-out-soft: cubic-bezier(0.16, 1, 0.3, 1);
  --duration-fast: 150ms;
  --duration-base: 200ms;
  --duration-slow: 300ms;

  /* Fonts */
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

@layer base {
  :root { color-scheme: light; }
  html.dark {
    --color-bg-main: #0a0a0a;
    --color-bg-secondary: #141414;
    --color-bg-tertiary: #1f1f1f;
    --color-bg-inverse: #ffffff;
    --color-text-primary: #fafafa;
    --color-text-secondary: #a3a3a3;
    --color-text-inverse: #0a0a0a;
    --color-border-subtle: #262626;
    --color-border-strong: #fafafa;
    color-scheme: dark;
  }

  body {
    background: var(--color-bg-main);
    color: var(--color-text-primary);
    font-family: var(--font-sans);
  }
}
```

### How tokens become utilities

Tailwind v4 auto-generates utilities from `@theme` variables, so the above produces:

- Backgrounds: `bg-main`, `bg-secondary`, `bg-tertiary`, `bg-inverse`.
- Text: `text-primary`, `text-secondary`, `text-muted`, `text-inverse`.
- Borders: `border-subtle`, `border-strong`.
- States: `bg-success`, `text-danger`, `border-warning`, etc.
- Radii: `rounded-sm`, `rounded-md`, `rounded-lg`, …
- Fonts: `font-sans`, `font-mono`.

### Usage rules

- ✅ `className="bg-main text-primary border border-subtle rounded-md"`
- ❌ `className="bg-white text-black border border-zinc-200"` — uses raw palette, forbidden.
- ❌ `style={{ backgroundColor: "#fff" }}` — inline literal, forbidden.
- ❌ `className="bg-[#fff]"` — arbitrary literal, forbidden.
- ✅ Arbitrary values are allowed **only** when referencing a token: `bg-[var(--color-bg-main)]` (rare; prefer the utility).

### Class ordering (enforced via Biome / Tailwind sort)

`layout → box → spacing → sizing → typography → background → border → effects → transitions → state variants`.

Example:

```tsx
<button className="
  inline-flex items-center justify-center gap-2
  h-10 px-4
  text-sm font-medium font-sans
  bg-inverse text-inverse
  border border-strong rounded-md
  transition-colors duration-(--duration-fast)
  hover:bg-secondary hover:text-primary
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-strong focus-visible:ring-offset-2
  disabled:opacity-50 disabled:cursor-not-allowed
">
  Connect Wallet
</button>
```

### Reusable styling helpers

- Use **`cva` (class-variance-authority)** to define variants, never long ternaries in JSX.
- Wrap class merging with **`cn(...)`** (clsx + tailwind-merge). Defined in `lib/utils/cn.ts`.
- Component variant files live next to the component: `Button.variants.ts`.

### Dark mode

- Class-based: `<html class="dark">`. Toggle via `next-themes`.
- Never hardcode dark variants per component (`dark:bg-zinc-900`). The token already swaps.

### Responsive

- Mobile-first. Breakpoints: `sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1440`.
- Avoid `md:` for everything — design from mobile up.

### Animations

- Use Tailwind transitions or `framer-motion` for orchestrated motion.
- Respect `prefers-reduced-motion`: wrap nontrivial motion in a guard.

---

## 20. Accessibility (a11y)

- Every interactive element is reachable by `Tab` and operable by `Enter` / `Space`.
- Visible `focus-visible` ring on every focusable element. Never `outline: none` without a replacement.
- Color contrast ≥ **WCAG AA 4.5:1** for body text, **3:1** for large text and UI.
- Forms: every input has a `<label>` (or `aria-label`); errors announced via `aria-describedby` and `role="alert"`.
- Modals trap focus and restore focus on close.
- Images: meaningful `alt` or `alt=""` for decoration.
- `lang` set on `<html>`. Page `<title>` per route.
- No motion that flashes more than 3×/sec.
- Test with a screen reader (VoiceOver / NVDA) before shipping any new primitive.

---

## 21. Tooling & Quality Gates

### Local

- Package manager: **pnpm** only. `pnpm install --frozen-lockfile` in CI.
- `pnpm lint` → `biome check` must pass with 0 errors, 0 warnings.
- `pnpm format` → `biome format --write`.
- Pre-commit hook (Husky + lint-staged): `biome check --apply` on staged files, `tsc --noEmit` on changed packages.
- Pre-push hook: full `biome check` and `tsc --noEmit`.

### CI gates (all required to merge)

1. `pnpm install --frozen-lockfile`
2. `biome ci`
3. `pnpm tsc --noEmit`
4. `pnpm test --run`
5. `pnpm build`
6. Bundle-size check
7. Lighthouse CI on a preview deploy
8. Playwright E2E on critical flows

### Dependency hygiene

- No new dependency without justification in the PR.
- Run `pnpm audit` weekly. CVE ≥ high blocks merges until resolved.
- Pin major versions; allow minor/patch via `^`.

---

## 22. Definition of Done

A change is **done** only when **all** of the following are true:

- [ ] Code follows every rule above.
- [ ] No comments in source.
- [ ] Types and interfaces live in `types/` files.
- [ ] All styling uses design tokens (`bg-main`, `text-primary`, …).
- [ ] No `any`, no `@ts-ignore`, no `console.*` in production paths.
- [ ] All async UI handles `idle`, `loading`, `error`, `empty`, `success`.
- [ ] All Web3 writes simulate, estimate, and confirm with explorer link.
- [ ] Unit + component tests added or updated; coverage gate green.
- [ ] E2E updated for critical flow changes.
- [ ] `biome ci`, `tsc --noEmit`, `pnpm build` all green.
- [ ] Lighthouse and bundle budgets respected.
- [ ] a11y verified (keyboard + screen reader pass).
- [ ] PR title and commits follow Conventional Commits.
- [ ] Screenshots / recording attached for UI changes.
- [ ] Reviewer approved; CI green; squash-merged.

---

**Violations of these rules block merge.** When in doubt, choose the boring, explicit, monochrome, well-typed option.
