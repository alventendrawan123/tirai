import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultMocks } from "../../../helpers/mock-tirai-api";
import { buildProviderTree } from "../../../helpers/render-with-providers";

const mocks = defaultMocks();

vi.mock("@tirai/api", () => ({
  createBountyPayment: (...args: unknown[]) =>
    mocks.createBountyPayment(...args),
}));

import { useBountyMutation } from "@/features/bounty/hooks/use-bounty-mutation";

describe("useBountyMutation", () => {
  beforeEach(() => {
    mocks.createBountyPayment.mockClear();
  });

  it("returns step + data after a successful submit", async () => {
    mocks.createBountyPayment.mockImplementationOnce(async (_input, ctx) => {
      const ctxx = ctx as { onProgress?: (s: string) => void };
      ctxx.onProgress?.("validate");
      ctxx.onProgress?.("generate-proof");
      ctxx.onProgress?.("done");
      return {
        ok: true,
        value: {
          ticket: {
            raw: "tk_x",
            version: 1 as const,
            cluster: "devnet" as const,
            createdAt: 0,
          },
          viewingKey: "v".repeat(64),
          signature: "sig",
          feeLamports: 1n,
        },
      };
    });

    const { Wrapper } = buildProviderTree();
    const { result } = renderHook(() => useBountyMutation(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.submit({ amountSol: 0.01, label: "test" });
    });

    await waitFor(() => {
      expect(result.current.data?.ok).toBe(true);
    });
    expect(result.current.step).toBe("done");
  });

  it("reset() clears step + data", async () => {
    const { Wrapper } = buildProviderTree();
    const { result } = renderHook(() => useBountyMutation(), {
      wrapper: Wrapper,
    });
    await act(async () => {
      await result.current.submit({ amountSol: 0.01, label: "y" });
    });
    await waitFor(() => expect(result.current.data).toBeDefined());

    act(() => {
      result.current.reset();
    });
    await waitFor(() => expect(result.current.data).toBeUndefined());
    expect(result.current.step).toBeNull();
  });
});
