import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildProviderTree } from "../../../helpers/render-with-providers";

const scanAuditHistory = vi.fn();
vi.mock("@tirai/api", () => ({
  scanAuditHistory: (...args: unknown[]) => scanAuditHistory(...args),
}));

import { useScanAuditQuery } from "@/features/audit/hooks/use-scan-audit-query";

describe("useScanAuditQuery", () => {
  beforeEach(() => scanAuditHistory.mockReset());

  it("does NOT fire when viewingKey length < 64", () => {
    const { Wrapper } = buildProviderTree();
    renderHook(() => useScanAuditQuery({ viewingKey: "abc" }), {
      wrapper: Wrapper,
    });
    expect(scanAuditHistory).not.toHaveBeenCalled();
  });

  it("does NOT fire when enabled=false even with valid key", () => {
    const { Wrapper } = buildProviderTree();
    renderHook(
      () => useScanAuditQuery({ viewingKey: "v".repeat(64), enabled: false }),
      { wrapper: Wrapper },
    );
    expect(scanAuditHistory).not.toHaveBeenCalled();
  });

  it("fires when key length === 64", async () => {
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
    const { Wrapper } = buildProviderTree();
    renderHook(() => useScanAuditQuery({ viewingKey: "a".repeat(64) }), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(scanAuditHistory).toHaveBeenCalledTimes(1));
    const [input] = scanAuditHistory.mock.calls[0] as [{ viewingKey: string }];
    expect(input.viewingKey).toBe("a".repeat(64));
  });
});
