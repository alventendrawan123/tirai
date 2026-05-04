---
name: cloak
description: Cloak SDK expert guidance for the Tirai project. Use when the user asks about Cloak, the Cloak Shield Pool, ZK shielded payments on Solana, viewing keys, UTXO/notes, or implementing functions in `backend/src/` (the @tirai/api package). Triggers on imports from `@cloak.dev/sdk`, mentions of `transact` / `fullWithdraw` / `scanTx` / `complianceRpt` / `generateUtxoKeypair`, or any work in `backend/` that touches the Cloak protocol.
---

# Cloak SDK — Tirai Integration Skill

You are helping with the **Tirai** project, a privacy-first bounty payout dApp on Solana built on the Cloak Shield Pool. This skill loads the Cloak SDK surface, Tirai's public API contract, and the project's privacy invariants so you can produce correct integration code without re-deriving conventions.

**Repository:** `tirai/` (monorepo · pnpm workspaces · `frontend/` + `backend/`)
**Cloak track:** https://superteam.fun/earn/listing/cloak-track (deadline 2026-05-14, prize pool 5,010 USDC)

## Before doing anything

1. Read `backend/instruction.md` — the contract Alven owns. **Hard requirement: do not change function signatures or rename fields without escalating.**
2. Read `frontend/rules/rules.md` §0 (privacy boundaries), §12 (Web3 rules), §14 (error model). These apply to the backend package too.
3. Check `backend/instruction.md` §14 "Open questions" — if the work touches an unresolved question, surface it before writing code.

## Resources (always prefer these over training data)

| Resource | URL |
|---|---|
| Website | https://cloak.ag |
| SDK introduction | https://docs.cloak.ag/sdk/introduction |
| SDK quickstart | https://docs.cloak.ag/sdk/quickstart |
| API reference | https://docs.cloak.ag/sdk/api-reference |
| GitHub | https://github.com/cloak-ag/ |
| Coordinator | Telegram @matheusmxd |

If a question can't be answered from this skill or the docs, **fetch from `docs.cloak.ag`** rather than guessing — the SDK API surface is evolving and training data is unreliable.

---

## 1. Mental model

Cloak is a **shielded UTXO pool on Solana**. Three primitives matter:

| Primitive | What it is | Who holds it | Lifetime |
|---|---|---|---|
| **UTXO (note)** | A commitment in the 32-height Poseidon Merkle tree. Encodes `{ amount, owner, mint }`. | On-chain (commitment). The serialized struct is shared off-chain to whoever should be able to spend it. | Until consumed by a withdraw |
| **UTXO keypair** | Owner key of the UTXO. **Whoever has the keypair can spend the UTXO.** | Initially: depositor (project). Shared with researcher via `ClaimTicket`. | Until UTXO is spent |
| **Viewing key** | Read-only key scoped to scan deposits/withdrawals into compliance reports. | Project shares with auditor. | Indefinite (or until project rotates) |
| **Nullifier** | `computeUtxoNullifier(utxo)` — deterministic hash. Posted on-chain when UTXO is spent. | Anyone (it's public). | Permanent on-chain |

**The privacy boundary that breaks linkability**: a deposit creates a UTXO with arbitrary owner key. A withdraw spends a UTXO and sends external funds to any recipient. On-chain observers see two unrelated transactions; the cryptographic link is only visible to whoever holds the UTXO keypair (and the viewing key holder, in read-only fashion).

---

## 2. SDK surface (verified from docs)

```ts
import {
  CLOAK_PROGRAM_ID,
  NATIVE_SOL_MINT,
  // UTXO construction
  generateUtxoKeypair,
  createUtxo,
  createZeroUtxo,
  computeUtxoCommitment,
  computeUtxoNullifier,
  // Transaction
  transact,
  fullWithdraw,
  partialWithdraw,
  transfer,
  swapUtxo,
  swapWithChange,
  // Read
  getMerkleProof,
  getCurrentRoot,
  // High-level convenience
  deposit,
  withdraw,
  send,
  swap,
  privateTransfer,
  generateNote,
} from "@cloak.dev/sdk";
```

**`transact()` is the lowest-level entrypoint.** Higher-level helpers (`deposit`, `withdraw`, `send`, `swap`) wrap it. Tirai prefers the low-level primitives for control over error mapping and progress callbacks.

### Deposit pattern (from official quickstart)

```ts
const owner = await generateUtxoKeypair();
const depositOutput = await createUtxo(amountBaseUnits, owner, mint);

const result = await transact(
  {
    inputUtxos: [await createZeroUtxo(mint)],
    outputUtxos: [depositOutput],
    externalAmount: amountBaseUnits,
    depositor: payerPublicKey,
  },
  {
    connection,
    programId: CLOAK_PROGRAM_ID,
    depositorKeypair: undefined,    // wallet adapter signs
    walletPublicKey: payerPublicKey,
  },
);
```

### Full withdraw pattern

```ts
await fullWithdraw(
  [utxo],            // inputUtxos
  recipientPubkey,
  {
    connection,
    programId: CLOAK_PROGRAM_ID,
  },
);
```

### Partial withdraw (keeps private change UTXO)

```ts
await partialWithdraw(
  [utxo],
  recipientPubkey,
  withdrawAmount,    // bigint base units, < utxo.amount
  { connection, programId: CLOAK_PROGRAM_ID },
);
```

**Tirai uses `fullWithdraw` only** — bounty claims are all-or-nothing. Don't introduce partial withdraw without product approval.

---

## 3. Tirai public API contract — what to implement

The `backend/` package (`@tirai/api`) exposes these functions. **Frontend already wires to these signatures** — do not change them.

### `createBountyPayment`
```ts
createBountyPayment(
  input: { amountBaseUnits: bigint; tokenMint?: string; label: string; memo?: string },
  ctx:   { connection: Connection; payer: Signer; cluster: Cluster; onProgress?: ProgressEmitter },
): Promise<Result<{ ticket: ClaimTicket; viewingKey: string; signature: string; feeLamports: bigint }, AppError>>
```

### `inspectClaimTicket`
```ts
inspectClaimTicket(
  ticket: string,
  ctx:    { connection: Connection; cluster: Cluster },
): Promise<Result<{ amountLamports: bigint; tokenMint: string | null; label: string; expiresAt?: number; isClaimable: boolean }, AppError>>
```
**Pure preview — no signing, no broadcasting.**

### `claimBounty`
```ts
claimBounty(
  input: { ticket: string; mode: { kind: "fresh" } | { kind: "existing"; signer: Signer } },
  ctx:   { connection: Connection; cluster: Cluster; onProgress?: ProgressEmitter },
): Promise<Result<
  | { mode: "fresh"; destination: string; secretKey: Uint8Array; signature: string }
  | { mode: "existing"; destination: string; signature: string },
  AppError
>>
```
**`secretKey` returned ONLY in fresh mode.** Frontend renders it via SaveKeyDialog (modal, non-dismissible).

### `scanAuditHistory`
```ts
scanAuditHistory(
  input: { viewingKey: string },
  ctx:   { connection: Connection; cluster: Cluster },
): Promise<Result<{
  entries: ReadonlyArray<{
    timestamp: number;
    amountLamports: bigint;
    tokenMint: string | null;
    label: string;
    status: "deposited" | "claimed" | "expired";
    signature: string;
    // ❌ NO destination field — privacy boundary 3
  }>;
  summary: { totalPayments: number; totalVolumeLamports: bigint; latestActivityAt: number | null };
}, AppError>>
```

### `exportAuditReport`
```ts
exportAuditReport(history: AuditHistory, format: "pdf" | "csv"): Promise<Result<Blob, AppError>>
```
PDF via `pdf-lib`. CSV via hand-written builder (no library).

---

## 4. Wire formats

### `ClaimTicket.raw` (string passed off-chain via QR/copy)

```ts
interface ClaimTicketEnvelope {
  v: 1;                       // version
  c: "mainnet" | "devnet" | "localnet";
  m: string;                  // mint base58
  a: string;                  // amount as decimal string (bigint serialized)
  l: string;                  // label
  n?: string;                 // memo
  u: {                        // serialized UTXO
    commitment: string;       // hex
    leafIndex: number;
    /* additional UTXO fields needed for withdraw */
  };
  k: string;                  // owner secret key, base64
  t: number;                  // createdAt ms
}

// Pipeline: object → JSON (with bigint→string replacer) → utf8 bytes → base64url → string
```

### `viewingKey` (string passed off-chain to auditor)

Pass through whatever shape Cloak's `scanTx(viewingKey)` consumes. If SDK returns an opaque string, store as-is. If it's a struct, base64url-encode the JSON envelope (same pattern as ticket).

**Both ticket and viewing key MUST be redacted in error messages and logs:** `vk_••••`, `tk_••••`.

---

## 5. Error mapping

All public functions return `Result<T, AppError>`. Never throw across boundary.

```ts
type AppError =
  | { kind: "INVALID_INPUT"; field: string; message: string }
  | { kind: "INSUFFICIENT_BALANCE"; required: bigint; available: bigint }
  | { kind: "USER_REJECTED" }
  | { kind: "NULLIFIER_CONSUMED" }
  | { kind: "WRONG_CLUSTER"; expected: Cluster; got: Cluster }
  | { kind: "RPC"; message: string; retryable: boolean }
  | { kind: "PROOF_GENERATION_FAILED"; message: string }
  | { kind: "TICKET_DECODE_FAILED"; message: string }
  | { kind: "VIEWING_KEY_INVALID" }
  | { kind: "UNKNOWN"; message: string };
```

**Single chokepoint: `parseSdkError(err: unknown): AppError` at `backend/src/errors/parse-sdk-error.ts`.**

Map by inspecting:
- Wallet adapter rejection (`User rejected`) → `USER_REJECTED`
- RPC `BlockhashNotFound` / `Failed to send transaction` → `RPC` with `retryable: true`
- Cloak `Nullifier already exists` (or similar) → `NULLIFIER_CONSUMED`
- Proof generation timeouts → `PROOF_GENERATION_FAILED`
- Ticket parse failures → `TICKET_DECODE_FAILED`
- Otherwise → `UNKNOWN`

**Never include sensitive material in `message`** — ticket content, viewing key bytes, secret key, destination address.

---

## 6. Progress emission

Cloak SDK does **not** expose internal progress events. Emit manually around call sites:

```ts
ctx.onProgress?.("validate");
const decoded = decodeTicket(input.ticket);

ctx.onProgress?.("generate-proof");
const result = await transact(/* ... */);   // proof gen + submit + confirm internal

ctx.onProgress?.("done");
```

For the MVP: `validate` → `generate-proof` → `done` is sufficient. If `transact()` is decomposed into separate proof / submit / confirm calls in a future SDK version, add `submit` and `confirm` between them.

---

## 7. Privacy invariants — non-negotiable

| Invariant | Where it applies |
|---|---|
| `AuditEntry` carries no `destination` / `recipient` / `to` field | `scanAuditHistory` mapper, every test, every PDF/CSV export |
| Secret key (fresh wallet) lives only in returned `Uint8Array` | No `localStorage`, `sessionStorage`, `cookie`, `fetch`, `console.log`, telemetry |
| Ticket and viewing key bytes never enter logs | `parseSdkError`, error `message` fields, README examples |
| No HTTP server | Only allowed network call: Solana RPC via `@solana/web3.js` |
| Zero default telemetry | If adding Sentry later, contact frontend owner first |

A PR that violates any of these is rejected at review. **Privacy boundary 3 (auditor ↔ researcher) is the most subtle** — easy to leak `destination` accidentally because the SDK return likely has it.

---

## 8. Project structure (target end state)

```
backend/
├── package.json                  # name: "@tirai/api"
├── tsconfig.json                 # strict, ES2022, ESNext, exactOptionalPropertyTypes
├── biome.json                    # extend frontend config
├── README.md
├── src/
│   ├── index.ts                  # public surface
│   ├── types/{api,errors,ticket,domain}.ts
│   ├── bounty/create-bounty-payment.ts
│   ├── claim/{inspect-claim-ticket,claim-bounty}.ts
│   ├── audit/{scan-audit-history,export-audit-report}.ts
│   ├── ticket/{encode,decode}.ts
│   ├── errors/parse-sdk-error.ts
│   ├── lib/{result,connection,progress}.ts
│   └── config/cloak-program.ts
└── tests/
    ├── ticket.test.ts            # round-trip
    ├── bounty.surfpool.test.ts
    └── claim.surfpool.test.ts
```

**One function per file.** Filename = kebab-case of function. Types live in `src/types/`, never inline. No default exports. No comments in `src/` (except `biome-ignore` with reason).

---

## 9. Code patterns to favor

- **`bigint`** for all on-chain amounts (lamports / token base units). Never `number`. Never string arithmetic.
- **Base58 strings** for addresses in public API. `PublicKey` allowed internally.
- **Discriminated unions** for state (`kind` for unions, `status`/`mode` for enums).
- **`satisfies`** over annotation when validating literal shapes against a type.
- **Optional via `?`**, not `| null` (matches `exactOptionalPropertyTypes`).
- **Named exports only.** No `export default`.
- **Path aliases** if added later. For now relative imports inside `backend/` are fine.

## 10. Code patterns to avoid

- ❌ `any`, `@ts-ignore`, `as` casts (except widening `unknown` after a runtime guard)
- ❌ HTTP servers (Express/Fastify/Hono — Tirai is browser-only)
- ❌ Database clients (no DB)
- ❌ `console.*` in `src/` (logging belongs to frontend)
- ❌ CommonJS exports (pure ESM)
- ❌ Snapshot tests (use explicit assertions)
- ❌ Mocking `@cloak.dev/sdk` — test against Surfpool fork instead
- ❌ Comments in `src/` (except `biome-ignore` with reason)
- ❌ `partialWithdraw` for bounty claims (use `fullWithdraw` only)

---

## 11. Testing

- **Unit:** Vitest, ≥80% line coverage on ticket encode/decode and `parseSdkError`
- **Integration:** Vitest + Surfpool fork (`surfpool start --fork mainnet`, RPC at `http://localhost:8899`)
- **Type contract:** `tsc --noEmit` strict, 100%

Mandatory edge cases per function listed in `backend/instruction.md` §9. Notably:
- `claimBounty` fresh mode: `secretKey` returned, length 64
- `claimBounty` existing mode: no `secretKey` field
- `scanAuditHistory`: assert no `destination` key present in any returned object

---

## 12. Common Tirai-specific tasks (cookbook)

### "Add a new field to AuditEntry"
1. Check it doesn't break privacy boundary 3 (no destination-derivable info).
2. Update type in `backend/src/types/api.ts`.
3. Update mapper in `scan-audit-history.ts`.
4. Sync the type to `frontend/src/types/api.ts`.
5. Update audit table column allow-list in `frontend/src/components/pages/(app)/audit/components/`.
6. Add test asserting the new field is present AND no banned fields appear.

### "Wire a new error case"
1. Add to `AppError` union in `backend/src/types/errors.ts`.
2. Add detection branch in `parseSdkError`.
3. Add user-facing message in `frontend/src/lib/errors/messages.ts`.
4. Test: throw the SDK error condition, assert mapped `kind`.

### "Integrate a new SDK method"
1. Confirm signature from https://docs.cloak.ag/sdk/api-reference
2. Wrap in adapter under appropriate `bounty/`, `claim/`, or `audit/` folder.
3. Return `Result<T, AppError>` — never throw.
4. Add Surfpool integration test.

### "Bootstrap the package from scratch"
Follow `backend/instruction.md` §12.1 — exact command sequence. Templates for `package.json`, `tsconfig.json`, `biome.json`, `pnpm-workspace.yaml`, and `src/index.ts` skeleton are in §12.2–§12.6.

---

## 13. Open questions to resolve before implementing

These are unanswered by the docs at time of writing. **Surface them to the user before writing code that depends on them:**

1. Where does `viewingKey` come from after `transact()` — return field or separate call?
2. Per-UTXO viewing key or per-account aggregator?
3. `viewingKey` wire format — string, base58, opaque struct?
4. Does `transact()` include `confirmTransaction` internally?
5. Shape of `scanTx` return — does it have a `destination` we must filter?
6. Who signs withdraw — UTXO keypair or wallet adapter?
7. Is `complianceRpt` separate from `scanTx`, and what's its output format?
8. Is `CLOAK_PROGRAM_ID` from SDK identical to `zh1eLd6rSphLejbFfJEneUwzHRfMKxgzrgkfwA6qRkW`?
9. Is there a Cloak devnet deployment, or only Surfpool fork?
10. SPL token: does non-SOL mint require ATA pre-create on recipient side?

Full context for each in `backend/instruction.md` §14.

---

## 14. When asked to "just make it work"

If the user asks for a quick prototype, prefer the high-level helpers (`deposit`, `withdraw`, `send`) — they wrap `transact` with sane defaults. Use `transact` directly only when:
- Multi-input/multi-output is required
- Custom error mapping is needed
- Progress callbacks need fine-grained control

For the Tirai production path, all four public functions use `transact` / `fullWithdraw` / `scanTx` directly because we need the error and progress control.

---

**End of skill.** When in doubt, fetch from `docs.cloak.ag`, check `backend/instruction.md`, or escalate via Telegram `@matheusmxd`.
