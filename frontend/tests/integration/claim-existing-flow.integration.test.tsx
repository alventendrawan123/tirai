import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildMockPreview, defaultMocks } from "../helpers/mock-tirai-api";
import { STUB_PUBKEY } from "../helpers/mock-wallet";
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

describe("/claim existing-mode flow integration", () => {
  beforeEach(() => {
    mocks.inspectClaimTicket.mockReset();
    mocks.claimBounty.mockReset();
  });

  it("existing mode submits + success card has no SaveKeyDialog leak", async () => {
    mocks.inspectClaimTicket.mockResolvedValue({
      ok: true,
      value: buildMockPreview(true),
    });
    mocks.claimBounty.mockResolvedValueOnce({
      ok: true,
      value: {
        mode: "existing",
        destination: STUB_PUBKEY.toBase58(),
        signature: "sig_e",
      },
    });

    const user = userEvent.setup();
    renderWithProviders(<ClaimPage />, {
      wallet: { publicKey: STUB_PUBKEY },
    });

    fireEvent.change(screen.getByLabelText(/claim ticket/i), {
      target: { value: "tk_x" },
    });
    await waitFor(
      () => {
        expect(screen.getByText(/ticket preview/i)).toBeInTheDocument();
      },
      { timeout: 1500 },
    );

    await user.click(screen.getByLabelText(/existing wallet/i));
    await user.click(screen.getByRole("button", { name: /claim now/i }));

    await waitFor(() => {
      expect(screen.getByText(/withdrawal complete/i)).toBeInTheDocument();
    });

    expect(
      screen.queryByText(/save your fresh wallet secret key/i),
    ).not.toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain("Uint8Array");
  });
});
