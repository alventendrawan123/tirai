# Tirai Frontend

Next.js 16 app for Tirai — privacy-first bounty payouts on Solana via the Cloak Shield Pool.

Live: https://tirai-frontier.vercel.app · Repo: https://github.com/alventendrawan123/tirai · Root README: [`../README.md`](../README.md)

---

## Stack

- Next.js 16 (App Router, Turbopack) · React 19 · TypeScript
- Tailwind CSS v4 (token-first, monochrome design system)
- React Query · `next-themes` (light + dark)
- `@solana/wallet-adapter-react` (Phantom, Solflare, OKX, Brave) · `@solana/web3.js`
- `@tirai/api` workspace package (wraps `@cloak.dev/sdk-devnet`)
- Biome (lint + format) · Vitest (unit + integration) · Playwright (e2e) · k6 (perf)

---

## Prerequisites

- **Node** ≥ 20 (Node 24 LTS recommended)
- **pnpm** ≥ 9 (`npm i -g pnpm`)
- **Solana wallet** browser extension — Phantom or Solflare
- **Devnet SOL** in that wallet — airdrop at https://faucet.solana.com or `solana airdrop 1 <pubkey> --url devnet`
- *Optional but recommended:* a **Helius devnet RPC key** (the public RPC is rate-limited)

---

## Quickstart

```bash
# from the repo root
git clone https://github.com/alventendrawan123/tirai.git
cd tirai
pnpm install                    # installs frontend + @tirai/api workspace

# env
cp frontend/.env.example frontend/.env.local
# fill in .env.local — see "Environment variables" below

# dev server (Turbopack)
pnpm --filter frontend dev

# open http://localhost:3000
```

That's it for development. The `@tirai/api` workspace is symlinked, so any changes to `backend/src/**` are picked up live by the frontend.

---

## Environment variables

`.env.local` lives at `frontend/.env.local` and is split into client-exposed (`NEXT_PUBLIC_*`) and server-only secrets. The server-only ones are reached through Next.js proxy routes (`/api/auth/*`, `/api/supabase/*`, `/api/rpc`) so the values never appear in the JS bundle.

### Required

| Variable | Scope | Description |
|---|---|---|
| `NEXT_PUBLIC_SOLANA_CLUSTER` | client | `devnet` (default) or `mainnet`. Selects the Cloak program ID. |
| `NEXT_PUBLIC_RPC_PROXY_PATH` | client | Defaults to `/api/rpc`. Where the wallet adapter hits Solana RPC. |
| `NEXT_PUBLIC_DOMAIN` | client | Public origin (e.g. `https://tirai-frontier.vercel.app`). Used in the off-chain claim ticket handoff message so the link points at the right host. |
| `SOLANA_RPC_URL` | server | Upstream RPC the proxy forwards to (e.g. Helius devnet). |
| `SUPABASE_URL` | server | Upstream Supabase REST URL. Hidden from the browser; the proxy injects it. |
| `SUPABASE_ANON_KEY` | server | Upstream Supabase anon key. Hidden from the browser; the proxy injects it as `apikey` + `Authorization`. |
| `AUTH_VERIFIER_URL` | server | Tirai auth-server base URL (`https://tirai-production.up.railway.app` for the shared dev instance). |

### Optional

| Variable | Scope | Description |
|---|---|---|
| `NEXT_PUBLIC_SOLANA_WS_URL` | client | Override the WebSocket endpoint the wallet adapter subscribes to. Defaults to the cluster's public WS. |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | client | Direct browser-side RPC URL. Only set this if you want to bypass `/api/rpc`. |

### Reference `.env.local`

```bash
NEXT_PUBLIC_SOLANA_CLUSTER=devnet
NEXT_PUBLIC_RPC_PROXY_PATH=/api/rpc
NEXT_PUBLIC_SOLANA_WS_URL=wss://devnet.helius-rpc.com/?api-key=YOUR_HELIUS_KEY
NEXT_PUBLIC_DOMAIN=http://localhost:3000

SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
AUTH_VERIFIER_URL=https://tirai-production.up.railway.app

SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_HELIUS_KEY
```

---

## Scripts

All scripts run from `frontend/` (or with `pnpm --filter frontend <cmd>` from the repo root).

| Script | What it does |
|---|---|
| `pnpm dev` | Next.js dev server (Turbopack) on http://localhost:3000 |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | Biome check (lint) |
| `pnpm format` | Biome format-write |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest run (unit + integration) |
| `pnpm test:watch` | Vitest watch mode |
| `pnpm test:unit` | Vitest unit tests only |
| `pnpm test:integration` | Vitest integration tests only |
| `pnpm test:security` | Vitest security suite |
| `pnpm test:coverage` | Vitest with coverage report |
| `pnpm test:e2e` | Playwright end-to-end |
| `pnpm test:e2e:ui` | Playwright UI mode |
| `pnpm test:perf:rpc` | k6 load test against `/api/rpc` |
| `pnpm test:perf:audit` | k6 load test against `/audit` scan |
| `pnpm test:perf:lcp` | k6 LCP measurement on the landing page |

---

## Project structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── (app)/              app routes (bounties / pay / claim / audit)
│   │   ├── (marketing)/        landing
│   │   ├── (internal)/         kitchen-sink
│   │   ├── api/
│   │   │   ├── auth/[...path]/route.ts       proxy → AUTH_VERIFIER_URL
│   │   │   ├── supabase/[...path]/route.ts   proxy → SUPABASE_URL (injects anon key)
│   │   │   └── rpc/route.ts                  proxy → SOLANA_RPC_URL (allow-listed)
│   │   ├── layout.tsx
│   │   └── page.tsx            (landing binding)
│   │
│   ├── components/
│   │   ├── pages/              one folder per route, ≤5-line page bindings call into here
│   │   ├── layout/             header, footer
│   │   └── ui/                 design-system primitives
│   │
│   ├── features/               feature slices (bounty-board, bounty, claim, audit, auth)
│   │   └── <feature>/
│   │       ├── adapters/       safeAdapter wrappers around @tirai/api
│   │       └── hooks/          React Query queries + mutations
│   │
│   ├── providers/              AppProviders, AuthProvider, ThemeProvider, QueryProvider
│   ├── config/                 env, cluster, cloak program IDs, tirai-services
│   ├── lib/                    errors, web3 helpers, query-keys, utils
│   └── types/                  shared API types
│
├── public/Assets/Images/Logo/  brand assets (tirai / cloak / sol)
├── tests/                      unit / integration / e2e / security / perf
├── .env.example                template for .env.local
└── biome.json, tsconfig.json, next.config.ts, vitest.config.ts, ...
```

---

## How the proxies work

To keep the Supabase URL + anon key + auth-server URL out of the JS bundle, all third-party calls go through Next.js catch-all routes:

- **`/api/supabase/[...path]`** — strips client `apikey` / `authorization` headers, injects the server-side `SUPABASE_ANON_KEY`, forwards to `${SUPABASE_URL}/<path>`.
- **`/api/auth/[...path]`** — forwards verbatim to `${AUTH_VERIFIER_URL}/<path>`.
- **`/api/rpc`** — JSON-RPC proxy with a method allow-list, forwards to `${SOLANA_RPC_URL}`.

All three strip `content-encoding` from upstream responses (Node fetch auto-decodes Brotli/gzip) so the browser doesn't try to decode plain text as Brotli. They also force `accept-encoding: identity` upstream.

`tiraiServices` (in `src/config/tirai-services.ts`) lazily resolves the SDK base URLs to `${origin}/api/auth` and `${origin}/api/supabase`, so the SDK never sees an upstream hostname.

---

## Common issues

- **`Could not load bounties` / `ERR_CONTENT_DECODING_FAILED`** — proxy `content-encoding` header is forwarded incorrectly. Restart the dev server; check `src/app/api/supabase/[...path]/route.ts` is up to date.
- **Wallet modal looks dark/light against the wrong background** — toggle with the sun/moon button in the header. The app defaults to light; `next-themes` is configured with `enableSystem={false}`.
- **`Sign in expired` toast on every mutation** — JWT TTL is 1 hour. Click *Sign in with wallet* again.
- **`Supabase request failed` after first deploy** — the proxy needs `SUPABASE_URL` + `SUPABASE_ANON_KEY` set on the server. Add them via `vercel env add` and redeploy.
- **Hydration mismatch on first paint** — usually `next-themes` before mount. The header / theme-toggle components render an opaque placeholder until `mounted` is true; if you see a flash, check that pattern in your component.

---

## Deployment

Frontend runs on Vercel as a standard Next.js project, with the workspace symlink to `@tirai/api` resolved via pnpm.

```bash
# from repo root
vercel link            # link to the tirai-frontier project (root directory: frontend)
vercel env pull frontend/.env.local
vercel --prod          # deploy to https://tirai-frontier.vercel.app
```

When configuring the Vercel project:

- **Root Directory:** `frontend`
- **Install Command:** `pnpm install` (run from repo root automatically)
- **Build Command:** `pnpm build`
- **Output:** Next.js default
- **Env Vars:** mirror `.env.local`. Mark `NEXT_PUBLIC_*` as available in all environments; mark the rest as **Production + Preview** only.

---

## Related docs

- Root README — overall architecture, problem framing, Cloak SDK integration: [`../README.md`](../README.md)
- End-to-end flow walkthrough: [`rules/flow-new.md`](rules/flow-new.md)
- Test plan: [`rules/test-plan.md`](rules/test-plan.md)
- Cloak SDK skill: [`rules/cloak/`](rules/cloak/)

---

## License

MIT
