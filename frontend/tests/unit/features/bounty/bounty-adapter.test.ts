import { Connection } from "@solana/web3.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultMocks } from "../../../helpers/mock-tirai-api";
import { makeMockWallet, STUB_PUBKEY } from "../../../helpers/mock-wallet";

const mocks = defaultMocks();

vi.mock("@tirai/api", () => ({
  createBountyPayment: (...args: unknown[]) =>
    mocks.createBountyPayment(...args),
}));

import { payBountyAdapter } from "@/features/bounty/adapters/bounty.adapter";

describe("payBountyAdapter", () => {
  beforeEach(() => {
    mocks.createBountyPayment.mockClear();
  });

  it("rejects when wallet is not connected", async () => {
    const wallet = makeMockWallet({ publicKey: null, connected: false });
    const result = await payBountyAdapter(
      { amountSol: 0.01, label: "x" },
      {
        connection: new Connection("http://localhost:8899"),
        wallet,
        cluster: "devnet",
      },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("INVALID_INPUT");
      if (result.error.kind === "INVALID_INPUT") {
        expect(result.error.field).toBe("wallet");
      }
    }
    expect(mocks.createBountyPayment).not.toHaveBeenCalled();
  });

  it("converts amountSol to amountBaseUnits in lamports", async () => {
    const wallet = makeMockWallet({ publicKey: STUB_PUBKEY });
    await payBountyAdapter(
      { amountSol: 0.01, label: "x" },
      {
        connection: new Connection("http://localhost:8899"),
        wallet,
        cluster: "devnet",
      },
    );
    expect(mocks.createBountyPayment).toHaveBeenCalledTimes(1);
    const [input] = mocks.createBountyPayment.mock.calls[0] as [
      { amountBaseUnits: bigint; label: string },
    ];
    expect(input.amountBaseUnits).toBe(10_000_000n);
    expect(input.label).toBe("x");
  });

  it("omits memo when undefined (exactOptionalPropertyTypes safety)", async () => {
    const wallet = makeMockWallet({ publicKey: STUB_PUBKEY });
    await payBountyAdapter(
      { amountSol: 1, label: "y" },
      {
        connection: new Connection("http://localhost:8899"),
        wallet,
        cluster: "devnet",
      },
    );
    const [input] = mocks.createBountyPayment.mock.calls[0] as [
      Record<string, unknown>,
    ];
    expect("memo" in input).toBe(false);
  });

  it("includes memo when present", async () => {
    const wallet = makeMockWallet({ publicKey: STUB_PUBKEY });
    await payBountyAdapter(
      { amountSol: 1, label: "y", memo: "hello" },
      {
        connection: new Connection("http://localhost:8899"),
        wallet,
        cluster: "devnet",
      },
    );
    const [input] = mocks.createBountyPayment.mock.calls[0] as [
      { memo?: string },
    ];
    expect(input.memo).toBe("hello");
  });

  it("forwards onProgress callback", async () => {
    const wallet = makeMockWallet({ publicKey: STUB_PUBKEY });
    const onProgress = vi.fn();
    await payBountyAdapter(
      { amountSol: 1, label: "y" },
      {
        connection: new Connection("http://localhost:8899"),
        wallet,
        cluster: "devnet",
        onProgress,
      },
    );
    const [, ctx] = mocks.createBountyPayment.mock.calls[0] as [
      unknown,
      { onProgress?: unknown },
    ];
    expect(ctx.onProgress).toBe(onProgress);
  });
});
