import { Connection } from "@solana/web3.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeMockWallet, STUB_PUBKEY } from "../../../helpers/mock-wallet";

const claimBounty = vi.fn();
vi.mock("@tirai/api", () => ({
  claimBounty: (...args: unknown[]) => claimBounty(...args),
}));

import {
  claimExistingAdapter,
  claimFreshAdapter,
} from "@/features/claim/adapters/claim.adapter";

describe("claimFreshAdapter", () => {
  beforeEach(() => claimBounty.mockReset());

  it("calls claimBounty with mode fresh", async () => {
    claimBounty.mockResolvedValue({
      ok: true,
      value: {
        mode: "fresh",
        destination: "11111111111111111111111111111112",
        secretKey: new Uint8Array(64),
        signature: "sig",
      },
    });
    await claimFreshAdapter("tk_x", {
      connection: new Connection("http://localhost:8899"),
      cluster: "devnet",
    });
    const [input] = claimBounty.mock.calls[0] as [
      { ticket: string; mode: { kind: string } },
    ];
    expect(input.ticket).toBe("tk_x");
    expect(input.mode.kind).toBe("fresh");
  });

  it("forwards onProgress when provided", async () => {
    claimBounty.mockResolvedValue({
      ok: true,
      value: {
        mode: "fresh",
        destination: "x",
        secretKey: new Uint8Array(64),
        signature: "s",
      },
    });
    const onProgress = vi.fn();
    await claimFreshAdapter("tk_x", {
      connection: new Connection("http://localhost:8899"),
      cluster: "devnet",
      onProgress,
    });
    const [, ctx] = claimBounty.mock.calls[0] as [
      unknown,
      { onProgress?: unknown },
    ];
    expect(ctx.onProgress).toBe(onProgress);
  });
});

describe("claimExistingAdapter", () => {
  beforeEach(() => claimBounty.mockReset());

  it("rejects when wallet not connected", async () => {
    const wallet = makeMockWallet({ publicKey: null, connected: false });
    const result = await claimExistingAdapter("tk_x", wallet, {
      connection: new Connection("http://localhost:8899"),
      cluster: "devnet",
    });
    expect(result.ok).toBe(false);
    if (!result.ok && result.error.kind === "INVALID_INPUT") {
      expect(result.error.field).toBe("wallet");
    }
    expect(claimBounty).not.toHaveBeenCalled();
  });

  it("calls claimBounty with mode existing + signer", async () => {
    claimBounty.mockResolvedValue({
      ok: true,
      value: {
        mode: "existing",
        destination: STUB_PUBKEY.toBase58(),
        signature: "s",
      },
    });
    const wallet = makeMockWallet({ publicKey: STUB_PUBKEY });
    await claimExistingAdapter("tk_x", wallet, {
      connection: new Connection("http://localhost:8899"),
      cluster: "devnet",
    });
    const [input] = claimBounty.mock.calls[0] as [
      {
        mode: {
          kind: string;
          signer?: { publicKey: { toBase58: () => string } };
        };
      },
    ];
    expect(input.mode.kind).toBe("existing");
    expect(input.mode.signer?.publicKey.toBase58()).toBe(
      STUB_PUBKEY.toBase58(),
    );
  });
});
