import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildMockBountyResult,
  buildMockPreview,
  defaultMocks,
} from "../helpers/mock-tirai-api";
import { STUB_PUBKEY } from "../helpers/mock-wallet";
import { renderWithProviders } from "../helpers/render-with-providers";

const mocks = defaultMocks();

vi.mock("@tirai/api", () => ({
  createBountyPayment: (...args: unknown[]) =>
    mocks.createBountyPayment(...args),
  inspectClaimTicket: (...args: unknown[]) => mocks.inspectClaimTicket(...args),
  claimBounty: (...args: unknown[]) => mocks.claimBounty(...args),
  scanAuditHistory: (...args: unknown[]) => mocks.scanAuditHistory(...args),
  exportAuditReport: (...args: unknown[]) => mocks.exportAuditReport(...args),
}));

vi.mock("@solana/wallet-adapter-react-ui", () => ({
  useWalletModal: () => ({ visible: false, setVisible: vi.fn() }),
}));

import { AuditPage } from "@/components/pages/(app)/audit";
import { ClaimPage } from "@/components/pages/(app)/claim";
import { PayPage } from "@/components/pages/(app)/pay";

function assertNoSensitiveInUrl() {
  const search = window.location.search;
  expect(search).not.toMatch(/tk_/u);
  expect(search).not.toMatch(/vk_/u);
  expect(search).not.toMatch(/[0-9a-f]{64}/u);
}

describe("URL never carries ticket / viewing key / secret", () => {
  beforeEach(() => {
    for (const m of Object.values(mocks)) {
      m.mockReset?.();
    }
    window.history.replaceState({}, "", "/");
  });

  it("/pay: ticket + viewing key never appended to query string", async () => {
    mocks.createBountyPayment.mockResolvedValue({
      ok: true,
      value: buildMockBountyResult(),
    });
    const user = userEvent.setup();
    renderWithProviders(<PayPage />, { wallet: { publicKey: STUB_PUBKEY } });
    await user.type(screen.getByLabelText(/amount/i), "0.01");
    await user.type(screen.getByLabelText(/researcher label/i), "x");
    await user.click(screen.getByRole("button", { name: /pay bounty/i }));
    await waitFor(() => {
      expect(screen.getByText(/bounty paid/i)).toBeInTheDocument();
    });
    assertNoSensitiveInUrl();
  });

  it("/claim: pasted ticket never lands in URL", async () => {
    mocks.inspectClaimTicket.mockResolvedValue({
      ok: true,
      value: buildMockPreview(true),
    });
    renderWithProviders(<ClaimPage />);
    fireEvent.change(screen.getByLabelText(/claim ticket/i), {
      target: { value: "tk_secret_value_should_not_leak" },
    });
    await waitFor(
      () => {
        expect(screen.getByText(/ticket preview/i)).toBeInTheDocument();
      },
      { timeout: 1500 },
    );
    assertNoSensitiveInUrl();
  });

  it("/audit: viewing key never lands in URL", async () => {
    mocks.scanAuditHistory.mockResolvedValue({
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
    await user.type(
      screen.getByLabelText(/paste the viewing key/i),
      "f".repeat(64),
    );
    await user.click(screen.getByRole("button", { name: /scan history/i }));
    await waitFor(() => {
      expect(screen.getByText(/no payments visible/i)).toBeInTheDocument();
    });
    assertNoSensitiveInUrl();
  });
});
