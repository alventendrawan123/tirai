import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildMockPreview, defaultMocks } from "../helpers/mock-tirai-api";
import { renderWithProviders } from "../helpers/render-with-providers";

const mocks = defaultMocks();

vi.mock("@tirai/api", () => ({
  inspectClaimTicket: (...args: unknown[]) => mocks.inspectClaimTicket(...args),
  claimBounty: (...args: unknown[]) => mocks.claimBounty(...args),
}));

vi.mock("@solana/wallet-adapter-react-ui", () => ({
  useWalletModal: () => ({ visible: false, setVisible: vi.fn() }),
}));

import { ClaimPage } from "@/components/pages/(app)/claim";

const VALID_TICKET = "tk_valid_test_ticket";

describe("/claim fresh-mode flow integration", () => {
  beforeEach(() => {
    mocks.inspectClaimTicket.mockReset();
    mocks.claimBounty.mockReset();
  });

  it("debounced inspect → preview renders → fresh claim → SaveKeyDialog", async () => {
    mocks.inspectClaimTicket.mockResolvedValue({
      ok: true,
      value: buildMockPreview(true),
    });
    const secret = new Uint8Array(64).fill(11);
    mocks.claimBounty.mockResolvedValueOnce({
      ok: true,
      value: {
        mode: "fresh",
        destination: "11111111111111111111111111111112",
        secretKey: secret,
        signature: "sig123",
      },
    });

    const user = userEvent.setup();
    renderWithProviders(<ClaimPage />);

    fireEvent.change(screen.getByLabelText(/claim ticket/i), {
      target: { value: VALID_TICKET },
    });

    await waitFor(
      () => {
        expect(screen.getByText(/ticket preview/i)).toBeInTheDocument();
      },
      { timeout: 1500 },
    );

    expect(screen.getByText(/claimable/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /claim now/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/save your fresh wallet secret key/i),
      ).toBeInTheDocument();
    });

    const ackButton = screen.getByRole("button", { name: /i have saved it/i });
    expect(ackButton).toBeDisabled();

    await user.click(screen.getByRole("checkbox"));
    expect(ackButton).toBeEnabled();
    await user.click(ackButton);

    await waitFor(() => {
      expect(
        screen.queryByText(/save your fresh wallet secret key/i),
      ).not.toBeInTheDocument();
    });

    expect(secret.every((b) => b === 0)).toBe(true);
  });

  it("re-inspect of consumed ticket disables Claim button", async () => {
    mocks.inspectClaimTicket.mockResolvedValueOnce({
      ok: true,
      value: buildMockPreview(false),
    });
    renderWithProviders(<ClaimPage />);
    fireEvent.change(screen.getByLabelText(/claim ticket/i), {
      target: { value: VALID_TICKET },
    });
    await waitFor(
      () => {
        expect(
          screen.getByRole("button", { name: /already claimed/i }),
        ).toBeDisabled();
      },
      { timeout: 1500 },
    );
  });
});
