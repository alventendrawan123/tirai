import { Connection } from "@solana/web3.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const scanAuditHistory = vi.fn();
vi.mock("@tirai/api", () => ({
  scanAuditHistory: (...args: unknown[]) => scanAuditHistory(...args),
}));

import { scanAuditAdapter } from "@/features/audit/adapters/audit.adapter";

describe("scanAuditAdapter", () => {
  beforeEach(() => scanAuditHistory.mockReset());

  it("forwards viewingKey + ctx", async () => {
    scanAuditHistory.mockResolvedValue({
      ok: true,
      value: {
        entries: [],
        summary: {
          totalPayments: 0,
          totalVolumeLamports: 0n,
          latestActivityAt: null,
        },
      },
    });
    const connection = new Connection("http://localhost:8899");
    await scanAuditAdapter("v".repeat(64), { connection, cluster: "devnet" });
    expect(scanAuditHistory).toHaveBeenCalledWith(
      { viewingKey: "v".repeat(64) },
      expect.objectContaining({
        connection,
        cluster: "devnet",
        supabaseUrl: expect.any(String),
        supabaseAnonKey: expect.any(String),
      }),
    );
  });

  it("returns ok:true for empty entries", async () => {
    scanAuditHistory.mockResolvedValue({
      ok: true,
      value: {
        entries: [],
        summary: {
          totalPayments: 0,
          totalVolumeLamports: 0n,
          latestActivityAt: null,
        },
      },
    });
    const result = await scanAuditAdapter("v".repeat(64), {
      connection: new Connection("http://localhost:8899"),
      cluster: "devnet",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.entries.length).toBe(0);
  });

  it("propagates VIEWING_KEY_INVALID", async () => {
    scanAuditHistory.mockResolvedValue({
      ok: false,
      error: { kind: "VIEWING_KEY_INVALID" },
    });
    const result = await scanAuditAdapter("bad", {
      connection: new Connection("http://localhost:8899"),
      cluster: "devnet",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("VIEWING_KEY_INVALID");
  });
});
