# Frontend Test Plan

Strategy + concrete test inventory for the **Tirai** frontend (Next.js · React 19 · TypeScript · `@tirai/api` workspace).

**Scope:** every test described here lives under `frontend/`. Backend tests (`@tirai/api`) are owned by Alven and run via `pnpm -F @tirai/api test` — out of scope for this document but referenced when integration tests cross the boundary.

**Source of truth alignment:**
- `rules.md` §17 — overall test rules (Vitest unit/component, Playwright E2E, no snapshot tests)
- `plan.md` §7 (Phase 5) — E2E scenarios already locked in
- `tirai/plan.md` (root) — page-level DoD
- `backend/instruction.md` §9 — type-contract integration boundary

---

## Daftar Isi

1. [Tujuan + non-tujuan](#1-tujuan--non-tujuan)
2. [Test pyramid Tirai](#2-test-pyramid-tirai)
3. [Tooling stack](#3-tooling-stack)
4. [Folder layout](#4-folder-layout)
5. [Unit tests](#5-unit-tests)
6. [Integration tests (full business flow)](#6-integration-tests-full-business-flow)
7. [Security tests](#7-security-tests)
8. [E2E tests (Playwright, main flow)](#8-e2e-tests-playwright-main-flow)
9. [Performance tests (K6, fitur utama)](#9-performance-tests-k6-fitur-utama)
10. [Coverage + quality gates](#10-coverage--quality-gates)
11. [CI integration](#11-ci-integration)
12. [Test data + fixtures policy](#12-test-data--fixtures-policy)
13. [Definition of Done per layer](#13-definition-of-done-per-layer)

---

## 1. Tujuan + non-tujuan

**Tujuan:**
- Cegah regresi pada **3 user journey** (project pay · researcher claim · auditor scan/export) sebelum demo Cloak Track 2026-05-14.
- Verifikasi bahwa **3 privacy boundary** (rules.md §0) tetap terjaga di setiap perubahan (no destination wallet di audit, secretKey hidup hanya di SaveKeyDialog scope, tidak ada telemetry sensitive).
- Pastikan kontrak `@tirai/api` (signature + AppError) tidak drift dari sisi konsumen.
- Buktikan flow demo bisa dijalankan ulang (E2E happy path) — supaya recording tidak gagal di hari H.

**Non-tujuan:**
- Tidak mengetes implementasi `@tirai/api` itu sendiri (backend punya 25/25 vitest sendiri).
- Tidak mengetes Cloak SDK internal (`transact`, `fullWithdraw`, `scanTransactions`) — itu vendor surface.
- Tidak mengetes Solana RPC behavior (treat sebagai dependency external — mock di unit/integration, real di E2E happy path).
- Tidak mengetes UI di setiap viewport individu — Lighthouse + visual review cukup untuk mobile (Phase 6 plan.md).

---

## 2. Test pyramid Tirai

```
            ▲  E2E (Playwright)
           /│\  ≤ 8 scenarios, devnet via Surfpool
          / │ \
         /  │  \  Performance (K6) — 3 fitur utama
        /───┴───\
       /         \  Integration (Vitest)
      /           \  — 3 use-case per fitur, mock @tirai/api at boundary
     /─────────────\
    /               \  Security (Vitest, focused)
   /                 \ — 6 invariants, asserted with grep + runtime probes
  /───────────────────\
 /                     \  Unit (Vitest)
/                       \ ≥80% line coverage on lib/, features/<feat>/{adapters,use-cases,hooks}
─────────────────────────
```

Distribusi target (estimasi LOC test : LOC src):
- Unit: ~70% test count, fastest feedback
- Integration: ~20%, heavier
- Security: ~5%, runtime + static
- E2E: ~5%, slowest, runs on PR + main only

---

## 3. Tooling stack

| Concern | Tool | Catatan |
|---|---|---|
| Unit + component + integration | **Vitest** | Sudah selaras dengan backend; rules.md §17 |
| DOM rendering | **@testing-library/react** | + `@testing-library/jest-dom` matchers |
| User events | **@testing-library/user-event** | Realistic event simulation |
| HTTP/RPC mock | **msw** (Mock Service Worker) | Mock `/api/rpc` di unit + integration; tidak dipakai di E2E |
| Playwright | **@playwright/test** | E2E + visual smoke. Browsers: Chromium (must), Firefox + WebKit (CI nightly) |
| Surfpool fork | **surfpool** binary | E2E + integration "real chain" mode. `surfpool start --fork mainnet` lokal |
| K6 | **k6** binary | Performance: RPC proxy + audit scan + page LCP |
| Coverage | **@vitest/coverage-v8** | Threshold gates di config |
| TS strict | `tsc --noEmit` | Sudah di CI |
| Lint | `biome ci` | Test files juga harus lulus |

**Install (sekali setup):**

```bash
cd frontend
pnpm add -D vitest @vitest/coverage-v8 @vitest/ui jsdom \
  @testing-library/react @testing-library/jest-dom @testing-library/user-event \
  msw \
  @playwright/test
pnpm exec playwright install chromium
# K6 native binary, install via brew/apt:
brew install k6   # mac
```

---

## 4. Folder layout

```
frontend/
├── tests/
│   ├── unit/
│   │   ├── lib/
│   │   │   ├── errors/map-tirai-error.test.ts
│   │   │   └── query-keys.test.ts
│   │   ├── features/
│   │   │   ├── bounty/bounty-adapter.test.ts
│   │   │   ├── bounty/use-bounty-mutation.test.tsx
│   │   │   ├── claim/inspect-adapter.test.ts
│   │   │   ├── claim/claim-adapter.test.ts
│   │   │   ├── claim/use-claim-mutation.test.tsx
│   │   │   ├── audit/audit-adapter.test.ts
│   │   │   ├── audit/export-adapter.test.ts
│   │   │   └── audit/use-scan-audit-query.test.tsx
│   │   ├── components/
│   │   │   ├── save-key-dialog.test.tsx
│   │   │   └── network-mismatch-dialog.test.tsx
│   │   └── services/logger.test.ts
│   │
│   ├── integration/
│   │   ├── pay-flow.integration.test.tsx
│   │   ├── claim-fresh-flow.integration.test.tsx
│   │   ├── claim-existing-flow.integration.test.tsx
│   │   └── audit-scan-export.integration.test.tsx
│   │
│   ├── security/
│   │   ├── audit-no-destination.test.ts
│   │   ├── secret-key-lifecycle.test.tsx
│   │   ├── localstorage-allow-list.test.ts
│   │   ├── logger-redaction.test.ts
│   │   ├── rpc-proxy-method-allowlist.test.ts
│   │   └── ticket-vk-not-in-url.test.tsx
│   │
│   ├── e2e/
│   │   ├── playwright.config.ts
│   │   ├── fixtures/wallet.ts          # mocked Phantom for predictable runs
│   │   ├── happy-path.spec.ts
│   │   ├── claim-existing.spec.ts
│   │   ├── invalid-ticket.spec.ts
│   │   ├── invalid-viewing-key.spec.ts
│   │   ├── save-key-dismissal-blocked.spec.ts
│   │   └── wrong-cluster.spec.ts
│   │
│   ├── perf/
│   │   ├── rpc-proxy.k6.js
│   │   ├── audit-scan.k6.js
│   │   └── landing-lcp.k6.js
│   │
│   ├── helpers/
│   │   ├── render-with-providers.tsx   # wraps test render in App providers
│   │   ├── mock-tirai-api.ts           # vi.mock("@tirai/api", ...) factory
│   │   ├── mock-wallet.ts              # WalletContextState double
│   │   └── surfpool.ts                 # spawn / teardown helpers
│   │
│   └── setup.ts                         # global vitest setup
│
├── vitest.config.ts
├── playwright.config.ts                 # symlink or duplicate from tests/e2e/
└── rules/test-plan.md                   # ← this file
```

**Aturan struktur:**
- Test files mirror source folder (`features/bounty/adapters/bounty.adapter.ts` → `tests/unit/features/bounty/bounty-adapter.test.ts`).
- Suffix `.test.ts(x)` untuk Vitest, `.spec.ts` untuk Playwright (consistent with their defaults).
- Tidak ada test code di `src/`. Helpers + fixtures hidup di `tests/helpers/`.
- Snapshot tests **dilarang** (rules.md §17).

---

## 5. Unit tests

**Goal:** isolasi layer terkecil. Run dalam <5 detik untuk full suite.

### 5.1 `lib/errors/`
- `map-tirai-error.test.ts` (12+ cases):
  - Tiap kind di `AppError` → assert mapped message + `retryable` + `silent` + `field?`
  - Edge: unknown kind fallback (TS exhaustive guard) — assert tidak crash
- `messages.test.ts` (paired) — assert string copy stable

### 5.2 `lib/query-keys.test.ts`
- `inspectTicket(raw)` & `auditHistory(vk)` deterministic; same input → same array reference structure (assert `toEqual`)

### 5.3 `features/bounty/`
- `bounty-adapter.test.ts`:
  - Happy: wallet connected + valid input → `createBountyPayment` dipanggil dengan `amountBaseUnits` exact (BigInt conversion 0.01 SOL → 10_000_000n)
  - Wallet not connected → return `INVALID_INPUT` `field: "wallet"` (no SDK call)
  - `memo` undefined → tidak masuk payload (test conditional spread)
  - SDK throw → adapter wraps to `Result.ok=false` (no escape)
- `use-bounty-mutation.test.tsx`:
  - Render via React Testing Library + QueryClientProvider
  - submit() updates `step` via onProgress mock
  - reset() clears step + data

### 5.4 `features/claim/`
- `inspect-adapter.test.ts`:
  - Decode valid ticket → preview shape matches contract
  - Malformed ticket → `TICKET_DECODE_FAILED`
  - Wrong cluster → `WRONG_CLUSTER {expected, got}`
- `claim-adapter.test.ts`:
  - Fresh mode: returns `mode: "fresh"` + `secretKey` length 64 + `destination` base58
  - Existing mode no wallet → `INVALID_INPUT` `field: "wallet"` (no SDK call)
  - Existing mode with wallet → SDK called with signer, no secretKey in result
- `use-claim-mutation.test.tsx`:
  - Mode toggling between submits doesn't leak previous mutation state
  - reset() clears step

### 5.5 `features/audit/`
- `audit-adapter.test.ts`:
  - VK pass-through ke SDK
  - Empty entries → still `ok: true`
- `export-adapter.test.ts`:
  - PDF format → `application/pdf` blob
  - CSV format → `text/csv` blob
  - downloadBlob: assert `URL.createObjectURL` + `revokeObjectURL` called (jsdom mocks)
- `use-scan-audit-query.test.tsx`:
  - VK length < 64 → `enabled: false` (no fetch)
  - VK length === 64 → query fires with correct cache key
  - `staleTime` honored (manual time advance)

### 5.6 `components/`
- `save-key-dialog.test.tsx`:
  - Renders bs58-encoded key
  - "I have saved it" disabled until checkbox checked
  - Esc + overlay-click do NOT trigger `onAcknowledge`
  - Download .txt action triggers blob URL flow (mocked)
- `network-mismatch-dialog.test.tsx`:
  - Genesis hash matching app cluster → not visible
  - Mismatch → visible with correct cluster names
  - Disconnect button calls `wallet.disconnect()`

### 5.7 `services/logger.test.ts`
- redactValue covers:
  - Sensitive keys → `"•••redacted•••"`
  - `Uint8Array` → `"•••bytes•••"`
  - `tk_...` / `vk_...` strings → `••••` masks
  - 64-hex digests → `0x••••`
  - Base58 address-shaped tokens → `•••address•••`
  - bigint coerced to string
- emit() short-circuits when NODE_ENV=production (mock env, assert console not called)

---

## 6. Integration tests (full business flow)

**Goal:** wire 1 use-case end-to-end di JSDOM, mock `@tirai/api` di boundary. Verifikasi UI ↔ adapter ↔ hook ↔ React Query interplay.

Mock pattern:
```ts
import { vi } from "vitest";
vi.mock("@tirai/api", () => mockTiraiApi({
  createBountyPayment: vi.fn().mockResolvedValue({ ok: true, value: {...} }),
  ...
}));
```

### 6.1 `pay-flow.integration.test.tsx`

Render `<PayPage />` di provider stack lengkap. Skenario:

1. **Wallet not connected → form disabled, submit blocked.**
2. **Wallet connected, valid input → submit → progress card appears with `validate` step → mock `onProgress` cycles to `done` → success card renders QR + ticket + viewing key copy.**
3. **On success: assert `localStorage["tirai:vk:<pubkey>"]` contains the viewing key.**
4. **Reset button → form returns to idle, no leftover state.**
5. **Submit returns `RPC` retryable → error card shows mapped message + Retry button → click Retry → state cleared.**

### 6.2 `claim-fresh-flow.integration.test.tsx`

1. **Paste valid ticket → after 300ms debounce, inspect query fires → preview card renders with `isClaimable: true`.**
2. **Mode = fresh, click Claim → progress → mocked success with `Uint8Array(64)` secretKey → SaveKeyDialog opens.**
3. **Click "I have saved it" disabled until checkbox checked.**
4. **Tick + acknowledge → dialog closes → `lastSecretRef.current` is null (assert via test hook or DOM probe) — secret zero-out happened.**
5. **Re-paste same ticket → preview returns `isClaimable: false`, Claim button disabled with "Already claimed" copy.**

### 6.3 `claim-existing-flow.integration.test.tsx`

1. **Wallet connected, paste ticket → preview renders.**
2. **Toggle mode = existing → Claim enabled.**
3. **Submit → success card shows AddressPill of connected wallet, no SaveKeyDialog appears, no secretKey leaks anywhere in the rendered DOM.**

### 6.4 `audit-scan-export.integration.test.tsx`

1. **Wallet connected with `tirai:vk:<pubkey>` already in localStorage → key form auto-prefills.**
2. **Submit → loading skeleton → mocked `scanAuditHistory` returns 3 entries → SummaryCards + table render.**
3. **Assert table headers = `Date | Amount | Token | Label | Status | Tx` — no `Destination` / `Recipient` header.**
4. **Click "Download CSV" → mocked `exportAuditReport` returns blob → `URL.createObjectURL` called, `<a download>` triggered with filename `tirai-audit-YYYY-MM-DD.csv`.**
5. **Empty result (entries.length === 0) → AuditEmpty renders, export buttons disabled.**

---

## 7. Security tests

**Goal:** assert privacy invariants programmatically. These are short, focused, must run in CI gating.

### 7.1 `audit-no-destination.test.ts`
- Static: `grep` `frontend/src/components/pages/(app)/audit/` for tokens `"destination"`, `"recipient"`, `"to:"` in JSX/template literals — must be 0 matches.
- Runtime: render `AuditPaymentsTable` with a mock entry that has an extra `destination` key on its object (loose typing) — assert it does NOT appear in rendered DOM.

### 7.2 `secret-key-lifecycle.test.tsx`
- Render `<ClaimPage />` with mocked claimBounty returning fresh-mode result.
- After SaveKeyDialog acknowledged, probe component refs:
  - `lastSecretRef.current` is null
  - The original `Uint8Array` instance has been zeroed (every byte === 0)
- Assert no `localStorage` write touched the key (spy `localStorage.setItem`).
- Assert no `fetch` call carried bytes from the secretKey body (spy global.fetch).

### 7.3 `localstorage-allow-list.test.ts`
- Static grep: `localStorage.setItem` calls in `frontend/src/` must only target keys starting with `tirai:vk:`.
- Use babel-AST or simple regex; fail CI on any other prefix.

### 7.4 `logger-redaction.test.ts`
- Roundtrip every redaction class with assertion (mirror unit test §5.7 but stricter — fail if a single sensitive class regresses).

### 7.5 `rpc-proxy-method-allowlist.test.ts`
- Probe `POST /api/rpc` with disallowed method (`requestAirdrop`, `getSlotLeader`, etc.) → expect JSON-RPC error code -32601.
- Probe with bad JSON → 400.
- Probe with batch including one disallowed method → reject batch.

### 7.6 `ticket-vk-not-in-url.test.tsx`
- For each route (`/pay`, `/claim`, `/audit`), drive a happy mocked flow then assert `window.location.search` never contains substrings `tk_`, `vk_`, ticket raw fragment, or 64-hex VK.

---

## 8. E2E tests (Playwright, main flow)

**Goal:** validate the **demo path** end-to-end on a real browser against Surfpool fork. Sebelum hari H, ini yang paling penting untuk recording tidak gagal.

**Wallet strategy:** mock Phantom via Playwright fixture (`@solana/wallet-standard-features` test wallet). No real extension. Pre-fund 0.5 SOL to test wallet on Surfpool.

**Setup:**
```bash
# In CI / local before test run
surfpool start --fork mainnet --port 8899 &
SOLANA_RPC_URL=http://localhost:8899 pnpm dev &
# Wait for ports, then:
pnpm exec playwright test
```

Each spec uses a `data-testid` attribute on every interactive primitive (plan §7 §5 task).

### 8.1 `happy-path.spec.ts` — **the demo recording**
Single linear scenario:
1. Open `/`, click `Pay a bounty`.
2. Select wallet (mocked Phantom).
3. Enter `0.01` SOL, label `"e2e demo"`, submit.
4. Assert progress steps cycle.
5. Assert success card shows QR + ticket + viewing key.
6. Capture ticket text + viewing key into Playwright state.
7. Open `/claim`, paste ticket, debounce wait.
8. Assert preview shows `0.01 SOL · "e2e demo" · Claimable`.
9. Mode = fresh, Claim, wait for SaveKeyDialog.
10. Tick checkbox, click "I have saved it".
11. Assert success card with destination + Solscan link.
12. Open `/audit`, viewing key auto-prefilled (or paste manually).
13. Click Scan history, wait up to 90s.
14. Assert summary cards = 1 payment + 0.01 SOL volume.
15. Assert table has 1 row, status `Claimed`, no `Destination` header.
16. Click "Download PDF" → Playwright `page.waitForEvent("download")` → assert filename matches `/tirai-audit-\d{4}-\d{2}-\d{2}\.pdf/`.

### 8.2 `claim-existing.spec.ts`
Variant: mode = existing wallet. Assert no SaveKeyDialog appears, success card shows wallet pubkey as destination.

### 8.3 `invalid-ticket.spec.ts`
Paste random base64 → after debounce, inline error card with `TICKET_DECODE_FAILED` mapped copy. Claim button never enabled.

### 8.4 `invalid-viewing-key.spec.ts`
At `/audit`, paste 32-char garbage → form submit blocked with inline validation error. Paste 64-char garbage that doesn't match VK format → error card with `VIEWING_KEY_INVALID`.

### 8.5 `save-key-dismissal-blocked.spec.ts`
Drive flow until SaveKeyDialog opens. Then:
- Press Escape → dialog still open, no acknowledge fired.
- Click overlay → dialog still open.
- Click outside body region → dialog still open.
- Only the explicit checkbox + button advance.

### 8.6 `wrong-cluster.spec.ts`
Project pays on devnet. Then claimer's wallet set to mainnet. Open `/claim`, paste devnet ticket. Assert NetworkMismatchDialog visible, blocking submission.

**Out of scope for E2E (handled at unit/integration level):**
- Insufficient balance (mock-only, no real fund manipulation needed)
- User rejects signature (driven by mocked wallet rejection)

---

## 9. Performance tests (K6, fitur utama)

**Goal:** memvalidasi bahwa proxy RPC + audit scan + landing page memenuhi target UX bahkan di RPC free-tier.

K6 scripts run dengan `pnpm dev` di port 3000 (next start untuk realistic) + Surfpool fork.

### 9.1 `rpc-proxy.k6.js` — secure RPC proxy throughput

```js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    burst: { executor: 'constant-vus', vus: 30, duration: '60s' },
  },
  thresholds: {
    'http_req_duration{method:getLatestBlockhash}': ['p(95)<400'],
    'http_req_duration{method:sendTransaction}':    ['p(95)<800'],
    'http_req_failed':                               ['rate<0.02'],
  },
};

export default function () {
  const res = http.post('http://localhost:3000/api/rpc', JSON.stringify({
    jsonrpc: '2.0', id: 1, method: 'getLatestBlockhash',
  }), { headers: { 'content-type': 'application/json' }, tags: { method: 'getLatestBlockhash' } });
  check(res, { 'status 200': (r) => r.status === 200 });
}
```

**SLO:**
- `getLatestBlockhash` p95 < 400ms (proxy adds <50ms overhead vs direct)
- `sendTransaction` p95 < 800ms
- Error rate < 2% under 30 VUs sustained

### 9.2 `audit-scan.k6.js` — `/audit` scan latency

Warmup 1 deposit on the Surfpool fork via backend script (`pnpm test:audit`), then K6 hits the page programmatically and waits for table to render.

```js
import http from 'k6/http';
import { check, sleep } from 'k6';
export const options = {
  vus: 5,
  iterations: 20,
  thresholds: { 'http_req_duration': ['p(95)<2000'] },
};
export default function () {
  const res = http.post('http://localhost:3000/api/rpc', JSON.stringify({
    jsonrpc: '2.0', id: 1,
    method: 'getSignaturesForAddress',
    params: ['Zc1kHfp4rajSMeASFDwFFgkHRjv7dFQuLheJoQus27h', { limit: 200 }],
  }), { headers: { 'content-type': 'application/json' } });
  check(res, { '200': (r) => r.status === 200 });
  sleep(1);
}
```

**SLO:**
- p95 single-RPC call latency < 2s under 5 concurrent scans (mirrors free-tier Helius behaviour)
- Full scan flow E2E (orchestrated separately): ≤ 90s for ≤ 200 sigs (matches update.md §7 expected envelope)

### 9.3 `landing-lcp.k6.js` — landing page rendering

Use K6 Browser module (k6 v0.46+) for real-browser timing.

```js
import { browser } from 'k6/browser';
export const options = {
  scenarios: {
    ui: { executor: 'shared-iterations', options: { browser: { type: 'chromium' } } },
  },
  thresholds: {
    'browser_web_vital_lcp': ['p(75)<2500'],
    'browser_web_vital_inp': ['p(75)<200'],
    'browser_web_vital_cls': ['p(75)<0.1'],
  },
};
export default async function () {
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/');
  await page.waitForSelector('h1');
  await page.close();
}
```

**SLO (matches rules.md §16 Core Web Vitals):**
- LCP p75 < 2.5s
- INP p75 < 200ms
- CLS p75 < 0.1

**Run:**
```bash
pnpm exec k6 run tests/perf/rpc-proxy.k6.js
pnpm exec k6 run tests/perf/audit-scan.k6.js
K6_BROWSER_HEADLESS=true pnpm exec k6 run tests/perf/landing-lcp.k6.js
```

---

## 10. Coverage + quality gates

| Layer | Target | Tool | Gate |
|---|---|---|---|
| Unit line coverage | ≥ 80% | `@vitest/coverage-v8` | CI fail |
| Unit branch coverage | ≥ 70% | same | CI fail |
| Integration suites pass | 100% | Vitest | CI fail |
| Security suites pass | 100% | Vitest | CI fail |
| E2E happy-path | 100% on main + nightly | Playwright | CI fail on main |
| E2E variants | 100% on nightly | Playwright | CI fail on nightly |
| K6 RPC proxy | thresholds in script | k6 binary | warning on PR, fail on weekly |
| K6 LCP | per script | k6 browser | warning on PR, fail on weekly |
| TS strict | 0 errors | `tsc --noEmit` | CI fail |
| Biome | 0 errors, 0 warnings | `biome ci` | CI fail |

**Vitest config sketch:**
```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: { lines: 80, branches: 70, functions: 80, statements: 80 },
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/index.ts',
        'src/components/pages/**/__fixtures__/**',
      ],
    },
  },
});
```

---

## 11. CI integration

**GitHub Actions matrix (recommended):**

| Workflow | Trigger | Jobs |
|---|---|---|
| `frontend.yml` (PR + push main) | every PR | `pnpm install` → `biome ci` → `tsc --noEmit` → `vitest --run --coverage` → `pnpm build` |
| `e2e.yml` (PR `[e2e]` label + push main) | on label/main | spin Surfpool + dev server → `playwright test` (Chromium) |
| `nightly.yml` (cron 02:00 UTC) | nightly | E2E full suite all browsers + K6 thresholds |
| `pre-release.yml` (manual) | before tag | full suite + mainnet smoke (manual gate) |

**Secrets needed in CI:**
- `SOLANA_RPC_URL` (private Helius/QuickNode for E2E + K6)
- `TEST_WALLET_SECRET` (Surfpool-funded keypair, NEVER mainnet-funded)

**Local pre-push hook (Husky, optional):**
```sh
pnpm exec biome ci
pnpm exec tsc --noEmit
pnpm exec vitest --run --reporter=dot
```

---

## 12. Test data + fixtures policy

- **No mainnet keys, ever.** Surfpool/devnet only.
- Test wallet secret keys live in `test-wallets/devnet.json` (gitignored, owned by Alven; `pnpm setup:devnet` regenerates).
- Mock viewing keys for unit tests use deterministic 64-hex strings (`"a".repeat(64)`, `"b".repeat(64)`).
- Mock tickets use real `@tirai/api` ticket encoding so decode tests are realistic.
- **No snapshot tests** anywhere (rules.md §17). Always assert specific values.
- Fixture data lives in `tests/helpers/`, never in `src/`.

---

## 13. Definition of Done per layer

A test layer is **done** only when **all** centang true:

### Unit
- [ ] All files in `lib/`, `features/<feat>/`, `services/`, `components/ui/` (interactive ones) have a sibling test file.
- [ ] `vitest --run --coverage` passes thresholds (§10).
- [ ] `pnpm test:watch` is the daily dev loop.

### Integration
- [ ] All four flows (§6.1–§6.4) implemented and green.
- [ ] Each test mocks `@tirai/api` at the boundary, never imports backend internals.
- [ ] Ticket / viewing key strings used in tests are produced by the real `@tirai/api` encoder.

### Security
- [ ] All six invariants (§7.1–§7.6) green.
- [ ] CI fails immediately on any privacy regression.
- [ ] PR template includes a checkbox: "Did this change touch any sensitive surface? If yes, security suite reviewed."

### E2E
- [ ] Happy path (§8.1) recorded as the canonical demo flow; output is the basis for Neysa's video shoot.
- [ ] All six specs green on Chromium pinned in CI.
- [ ] Surfpool spin-up automated in `e2e.yml`.

### Performance
- [ ] All three K6 scripts (§9.1–§9.3) green under nightly schedule.
- [ ] Regression on any threshold blocks pre-release tag.
- [ ] Results archived as artifacts on each nightly run.

---

**Catatan eksekusi:** dokumen ini adalah **rencana**, bukan implementasi. Saat mulai implementasi, ikuti urutan: §5 unit → §6 integration → §7 security → §8 E2E → §9 perf. Skip ke §8 (E2E happy-path) lebih awal kalau demo recording butuh evidence sebelum suite lengkap kelar — sisanya menyusul.
