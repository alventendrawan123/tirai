import { Connection } from "@solana/web3.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const inspectClaimTicket = vi.fn();
vi.mock("@tirai/api", () => ({
  inspectClaimTicket: (...args: unknown[]) => inspectClaimTicket(...args),
}));

import { inspectTicketAdapter } from "@/features/claim/adapters/inspect.adapter";

describe("inspectTicketAdapter", () => {
  beforeEach(() => {
    inspectClaimTicket.mockReset();
  });

  it("passes through cluster + connection ctx", async () => {
    inspectClaimTicket.mockResolvedValue({
      ok: true,
      value: {
        amountLamports: 10n,
        tokenMint: null,
        label: "x",
        isClaimable: true,
      },
    });
    const connection = new Connection("http://localhost:8899");
    await inspectTicketAdapter("tk_test", { connection, cluster: "devnet" });
    expect(inspectClaimTicket).toHaveBeenCalledWith("tk_test", {
      connection,
      cluster: "devnet",
    });
  });

  it("returns error result on TICKET_DECODE_FAILED", async () => {
    inspectClaimTicket.mockResolvedValue({
      ok: false,
      error: { kind: "TICKET_DECODE_FAILED", message: "bad" },
    });
    const result = await inspectTicketAdapter("garbage", {
      connection: new Connection("http://localhost:8899"),
      cluster: "devnet",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("TICKET_DECODE_FAILED");
  });

  it("returns WRONG_CLUSTER when ticket cluster differs", async () => {
    inspectClaimTicket.mockResolvedValue({
      ok: false,
      error: { kind: "WRONG_CLUSTER", expected: "devnet", got: "mainnet" },
    });
    const result = await inspectTicketAdapter("tk_x", {
      connection: new Connection("http://localhost:8899"),
      cluster: "devnet",
    });
    expect(result.ok).toBe(false);
    if (!result.ok && result.error.kind === "WRONG_CLUSTER") {
      expect(result.error.got).toBe("mainnet");
    }
  });
});
