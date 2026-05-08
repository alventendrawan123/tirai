import { Connection } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import { auditHistoryToCsv } from "../src/audit/csv";
import { exportAuditReport } from "../src/audit/export-audit-report";
import { auditHistoryToPdf } from "../src/audit/pdf";
import {
  type AuditEntry,
  type AuditHistory,
  scanAuditHistory,
} from "../src/audit/scan-audit-history";

const RPC_URL = "https://api.devnet.solana.com";

describe("scanAuditHistory input validation", () => {
  it("returns VIEWING_KEY_INVALID when length is wrong", async () => {
    const result = await scanAuditHistory(
      { viewingKey: "abc" },
      {
        connection: new Connection(RPC_URL),
        cluster: "devnet",
        supabaseUrl: "https://example.supabase.co",
        supabaseAnonKey: "test-anon",
      },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("VIEWING_KEY_INVALID");
  });

  it("returns VIEWING_KEY_INVALID when chars are non-hex", async () => {
    const result = await scanAuditHistory(
      { viewingKey: "Z".repeat(64) },
      {
        connection: new Connection(RPC_URL),
        cluster: "devnet",
        supabaseUrl: "https://example.supabase.co",
        supabaseAnonKey: "test-anon",
      },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("VIEWING_KEY_INVALID");
  });
});

const sampleEntries: ReadonlyArray<AuditEntry> = [
  {
    timestamp: 1_715_000_000_000,
    amountLamports: 10_000_000n,
    tokenMint: null,
    label: "",
    status: "deposited",
    signature: "depositSig123",
  },
  {
    timestamp: 1_715_000_500_000,
    amountLamports: 5_000_000n,
    tokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    label: "",
    status: "claimed",
    signature: "claimSig456,with-comma",
  },
];

const sampleHistory: AuditHistory = {
  entries: sampleEntries,
  summary: {
    totalPayments: sampleEntries.length,
    totalVolumeLamports: 15_000_000n,
    latestActivityAt: 1_715_000_500_000,
  },
};

describe("auditHistoryToCsv", () => {
  it("emits header row + one row per entry", () => {
    const csv = auditHistoryToCsv(sampleHistory);
    const lines = csv.trim().split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe(
      "timestamp_iso,status,amount_lamports,token_mint,label,signature",
    );
  });

  it("renders tokenMint null as empty cell, ISO timestamp", () => {
    const csv = auditHistoryToCsv(sampleHistory);
    const lines = csv.trim().split("\n");
    expect(lines[1]).toContain("2024-05-06");
    expect(lines[1]).toContain(",,"); // empty token_mint between status and label
    expect(lines[1]).toContain("10000000");
  });

  it("escapes commas in cell values", () => {
    const csv = auditHistoryToCsv(sampleHistory);
    expect(csv).toContain(`"claimSig456,with-comma"`);
  });

  it("never leaks recipient field (it's not in AuditEntry shape)", () => {
    const csv = auditHistoryToCsv(sampleHistory);
    const header = csv.split("\n")[0] ?? "";
    expect(header).not.toContain("recipient");
  });
});

describe("exportAuditReport", () => {
  it("returns text/csv Blob for csv format", async () => {
    const result = await exportAuditReport(sampleHistory, "csv");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.type).toBe("text/csv;charset=utf-8");
    const text = await result.value.text();
    expect(text).toContain("timestamp_iso,status");
  });

  it("returns application/pdf Blob for pdf format", async () => {
    const result = await exportAuditReport(sampleHistory, "pdf");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.type).toBe("application/pdf");
    expect(result.value.size).toBeGreaterThan(0);
  });
});

describe("auditHistoryToPdf", () => {
  it("produces non-empty PDF bytes starting with %PDF", async () => {
    const bytes = await auditHistoryToPdf(sampleHistory);
    expect(bytes.length).toBeGreaterThan(100);
    const header = new TextDecoder().decode(bytes.slice(0, 4));
    expect(header).toBe("%PDF");
  });

  it("handles empty history without crashing", async () => {
    const bytes = await auditHistoryToPdf({
      entries: [],
      summary: {
        totalPayments: 0,
        totalVolumeLamports: 0n,
        latestActivityAt: null,
      },
    });
    expect(bytes.length).toBeGreaterThan(100);
  });
});
