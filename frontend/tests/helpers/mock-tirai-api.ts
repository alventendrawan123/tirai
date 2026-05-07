import { vi } from "vitest";

export const STUB_VIEWING_KEY = "a".repeat(64);
export const STUB_TICKET = "tk_stub_ticket_for_tests";
export const STUB_SIGNATURE = "stubSig_test_signature_string";

export interface MockTiraiApiOverrides {
  createBountyPayment?: ReturnType<typeof vi.fn>;
  inspectClaimTicket?: ReturnType<typeof vi.fn>;
  claimBounty?: ReturnType<typeof vi.fn>;
  scanAuditHistory?: ReturnType<typeof vi.fn>;
  exportAuditReport?: ReturnType<typeof vi.fn>;
}

export function buildMockTicket(
  overrides?: Partial<{
    raw: string;
    cluster: "devnet" | "mainnet" | "localnet";
    createdAt: number;
  }>,
) {
  return {
    raw: overrides?.raw ?? STUB_TICKET,
    version: 1 as const,
    cluster: overrides?.cluster ?? ("devnet" as const),
    createdAt: overrides?.createdAt ?? Date.now(),
  };
}

export function buildMockBountyResult() {
  return {
    ticket: buildMockTicket(),
    viewingKey: STUB_VIEWING_KEY,
    signature: STUB_SIGNATURE,
    feeLamports: 5_030_000n,
  };
}

export function buildMockPreview(isClaimable = true) {
  return {
    amountLamports: 10_000_000n,
    tokenMint: null as string | null,
    label: "test bounty",
    isClaimable,
  };
}

export function buildMockAuditEntries() {
  const now = Date.now();
  return [
    {
      timestamp: now - 1000 * 60 * 60 * 26,
      amountLamports: 500_000_000n,
      tokenMint: null,
      label: "Auth bypass",
      status: "claimed" as const,
      signature: "stubAudit_001",
    },
    {
      timestamp: now - 1000 * 60 * 30,
      amountLamports: 250_000_000n,
      tokenMint: null,
      label: "Open redirect",
      status: "deposited" as const,
      signature: "stubAudit_002",
    },
  ];
}

export function buildMockAuditHistory() {
  const entries = buildMockAuditEntries();
  return {
    entries,
    summary: {
      totalPayments: entries.length,
      totalVolumeLamports: entries.reduce((s, e) => s + e.amountLamports, 0n),
      latestActivityAt: Math.max(...entries.map((e) => e.timestamp)),
    },
  };
}

export function defaultMocks(): Required<MockTiraiApiOverrides> {
  return {
    createBountyPayment: vi.fn(async () => ({
      ok: true,
      value: buildMockBountyResult(),
    })),
    inspectClaimTicket: vi.fn(async () => ({
      ok: true,
      value: buildMockPreview(true),
    })),
    claimBounty: vi.fn(async () => ({
      ok: true,
      value: {
        mode: "fresh" as const,
        destination: "11111111111111111111111111111112",
        secretKey: new Uint8Array(64).fill(7),
        signature: STUB_SIGNATURE,
      },
    })),
    scanAuditHistory: vi.fn(async () => ({
      ok: true,
      value: buildMockAuditHistory(),
    })),
    exportAuditReport: vi.fn(async (_h: unknown, format: "pdf" | "csv") => ({
      ok: true,
      value: new Blob(["stub"], {
        type: format === "pdf" ? "application/pdf" : "text/csv",
      }),
    })),
  };
}
