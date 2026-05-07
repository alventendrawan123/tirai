import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { STUB_PUBKEY } from "../../../helpers/mock-wallet";
import { buildProviderTree } from "../../../helpers/render-with-providers";

const claimBounty = vi.fn();
vi.mock("@tirai/api", () => ({
  claimBounty: (...args: unknown[]) => claimBounty(...args),
}));

import { useClaimMutation } from "@/features/claim/hooks/use-claim-mutation";

describe("useClaimMutation", () => {
  beforeEach(() => {
    claimBounty.mockReset();
  });

  it("submits fresh-mode claim and surfaces secretKey", async () => {
    const secret = new Uint8Array(64).fill(3);
    claimBounty.mockResolvedValue({
      ok: true,
      value: {
        mode: "fresh",
        destination: "11111111111111111111111111111112",
        secretKey: secret,
        signature: "sig",
      },
    });
    const { Wrapper } = buildProviderTree();
    const { result } = renderHook(() => useClaimMutation(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.submit({ ticket: "tk_x", mode: "fresh" });
    });

    await waitFor(() => expect(result.current.data?.ok).toBe(true));
    if (result.current.data?.ok && result.current.data.value.mode === "fresh") {
      expect(result.current.data.value.secretKey).toBe(secret);
    } else {
      throw new Error("expected fresh mode result");
    }
  });

  it("existing-mode claim does not return a secretKey", async () => {
    claimBounty.mockResolvedValue({
      ok: true,
      value: {
        mode: "existing",
        destination: STUB_PUBKEY.toBase58(),
        signature: "sig",
      },
    });
    const { Wrapper } = buildProviderTree({
      wallet: { publicKey: STUB_PUBKEY },
    });
    const { result } = renderHook(() => useClaimMutation(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.submit({ ticket: "tk_x", mode: "existing" });
    });
    await waitFor(() => expect(result.current.data?.ok).toBe(true));
    if (
      result.current.data?.ok &&
      result.current.data.value.mode === "existing"
    ) {
      expect("secretKey" in result.current.data.value).toBe(false);
    } else {
      throw new Error("expected existing mode result");
    }
  });

  it("reset clears step + data", async () => {
    claimBounty.mockResolvedValue({
      ok: true,
      value: {
        mode: "fresh",
        destination: "x",
        secretKey: new Uint8Array(64),
        signature: "s",
      },
    });
    const { Wrapper } = buildProviderTree();
    const { result } = renderHook(() => useClaimMutation(), {
      wrapper: Wrapper,
    });
    await act(async () => {
      await result.current.submit({ ticket: "tk", mode: "fresh" });
    });
    await waitFor(() => expect(result.current.data).toBeDefined());
    act(() => result.current.reset());
    await waitFor(() => expect(result.current.data).toBeUndefined());
    expect(result.current.step).toBeNull();
  });
});
