import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildMockAuditHistory, defaultMocks } from "../helpers/mock-tirai-api";
import { STUB_PUBKEY } from "../helpers/mock-wallet";
import { renderWithProviders } from "../helpers/render-with-providers";

const mocks = defaultMocks();

vi.mock("@tirai/api", () => ({
  scanAuditHistory: (...args: unknown[]) => mocks.scanAuditHistory(...args),
  exportAuditReport: (...args: unknown[]) => mocks.exportAuditReport(...args),
}));

vi.mock("@solana/wallet-adapter-react-ui", () => ({
  useWalletModal: () => ({ visible: false, setVisible: vi.fn() }),
}));

import { AuditPage } from "@/components/pages/(app)/audit";

const VK = "a".repeat(64);

describe("/audit scan + export integration", () => {
  beforeEach(() => {
    mocks.scanAuditHistory.mockReset();
    mocks.exportAuditReport.mockReset();
  });

  it("auto-loads viewing key from localStorage on wallet connect", async () => {
    window.localStorage.setItem(`tirai:vk:${STUB_PUBKEY.toBase58()}`, VK);
    renderWithProviders(<AuditPage />, { wallet: { publicKey: STUB_PUBKEY } });
    await waitFor(() => {
      expect(
        (screen.getByLabelText(/paste the viewing key/i) as HTMLTextAreaElement)
          .value,
      ).toBe(VK);
    });
  });

  it("scan renders summary + table without destination column", async () => {
    mocks.scanAuditHistory.mockResolvedValueOnce({
      ok: true,
      value: buildMockAuditHistory(),
    });
    const user = userEvent.setup();
    renderWithProviders(<AuditPage />);

    await user.type(screen.getByLabelText(/paste the viewing key/i), VK);
    await user.click(screen.getByRole("button", { name: /scan history/i }));

    await waitFor(() => {
      expect(screen.getByText(/total payments/i)).toBeInTheDocument();
    });
    const headers = screen
      .getAllByRole("columnheader")
      .map((th) => th.textContent?.toLowerCase() ?? "");
    expect(headers).not.toContain("destination");
    expect(headers).not.toContain("recipient");
    expect(headers).toContain("date");
    expect(headers).toContain("amount");
    expect(headers).toContain("status");
  });

  it("CSV download triggers blob URL flow", async () => {
    mocks.scanAuditHistory.mockResolvedValueOnce({
      ok: true,
      value: buildMockAuditHistory(),
    });
    const blobInstance = new Blob(["csv"], { type: "text/csv" });
    mocks.exportAuditReport.mockResolvedValueOnce({
      ok: true,
      value: blobInstance,
    });

    const createSpy = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:csv");
    const user = userEvent.setup();
    renderWithProviders(<AuditPage />);
    await user.type(screen.getByLabelText(/paste the viewing key/i), VK);
    await user.click(screen.getByRole("button", { name: /scan history/i }));
    await waitFor(() =>
      expect(screen.getByText(/total payments/i)).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: /download csv/i }));
    await waitFor(() => expect(createSpy).toHaveBeenCalled());
    const [arg] = mocks.exportAuditReport.mock.calls[0] as [
      unknown,
      "csv" | "pdf",
    ];
    expect(mocks.exportAuditReport.mock.calls[0]?.[1]).toBe("csv");
    expect(arg).toBeDefined();
  });

  it("empty entries renders empty-state and disables export", async () => {
    mocks.scanAuditHistory.mockResolvedValueOnce({
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
    const user = userEvent.setup();
    renderWithProviders(<AuditPage />);
    await user.type(screen.getByLabelText(/paste the viewing key/i), VK);
    await user.click(screen.getByRole("button", { name: /scan history/i }));
    await waitFor(() => {
      expect(screen.getByText(/no payments visible/i)).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: /download pdf/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /download csv/i }),
    ).toBeDisabled();
  });
});
