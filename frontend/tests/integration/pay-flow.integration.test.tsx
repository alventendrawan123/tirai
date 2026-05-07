import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildMockBountyResult, defaultMocks } from "../helpers/mock-tirai-api";
import { STUB_PUBKEY } from "../helpers/mock-wallet";
import { renderWithProviders } from "../helpers/render-with-providers";

const mocks = defaultMocks();

vi.mock("@tirai/api", () => ({
  createBountyPayment: (...args: unknown[]) =>
    mocks.createBountyPayment(...args),
}));

vi.mock("@solana/wallet-adapter-react-ui", () => ({
  useWalletModal: () => ({ visible: false, setVisible: vi.fn() }),
}));

import { PayPage } from "@/components/pages/(app)/pay";

describe("/pay full flow integration", () => {
  beforeEach(() => {
    mocks.createBountyPayment.mockReset();
  });

  it("blocks form when wallet is not connected", () => {
    renderWithProviders(<PayPage />, { wallet: { publicKey: null } });
    expect(screen.getByLabelText(/amount/i)).toBeDisabled();
    expect(screen.getByLabelText(/researcher label/i)).toBeDisabled();
  });

  it("submits valid payload + persists viewingKey to localStorage on success", async () => {
    mocks.createBountyPayment.mockResolvedValueOnce({
      ok: true,
      value: buildMockBountyResult(),
    });
    const user = userEvent.setup();
    renderWithProviders(<PayPage />, { wallet: { publicKey: STUB_PUBKEY } });

    await user.clear(screen.getByLabelText(/amount/i));
    await user.type(screen.getByLabelText(/amount/i), "0.01");
    await user.clear(screen.getByLabelText(/researcher label/i));
    await user.type(screen.getByLabelText(/researcher label/i), "demo");
    await user.click(screen.getByRole("button", { name: /pay bounty/i }));

    await waitFor(() => {
      expect(screen.getByText(/bounty paid/i)).toBeInTheDocument();
    });

    const stored = window.localStorage.getItem(
      `tirai:vk:${STUB_PUBKEY.toBase58()}`,
    );
    expect(stored).not.toBeNull();
    expect(stored?.length).toBe(64);
  });

  it("renders error card when adapter returns RPC error", async () => {
    mocks.createBountyPayment.mockResolvedValueOnce({
      ok: false,
      error: { kind: "RPC", message: "blockhash not found", retryable: true },
    });
    const user = userEvent.setup();
    renderWithProviders(<PayPage />, { wallet: { publicKey: STUB_PUBKEY } });

    await user.clear(screen.getByLabelText(/amount/i));
    await user.type(screen.getByLabelText(/amount/i), "0.01");
    await user.clear(screen.getByLabelText(/researcher label/i));
    await user.type(screen.getByLabelText(/researcher label/i), "demo");
    await user.click(screen.getByRole("button", { name: /pay bounty/i }));

    await waitFor(() => {
      expect(screen.getByText(/payment failed/i)).toBeInTheDocument();
    });
    const retryBtn = screen.getByRole("button", { name: /retry/i });
    expect(retryBtn).toBeInTheDocument();

    fireEvent.click(retryBtn);
    await waitFor(() => {
      expect(screen.queryByText(/payment failed/i)).not.toBeInTheDocument();
      expect(screen.getByLabelText(/amount/i)).toBeEnabled();
    });
  });

  it("amount validation blocks submission for negative input", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PayPage />, { wallet: { publicKey: STUB_PUBKEY } });
    await user.clear(screen.getByLabelText(/amount/i));
    await user.type(screen.getByLabelText(/amount/i), "abc");
    await user.clear(screen.getByLabelText(/researcher label/i));
    await user.type(screen.getByLabelText(/researcher label/i), "x");
    await user.click(screen.getByRole("button", { name: /pay bounty/i }));
    await waitFor(() => {
      expect(screen.getByText(/positive decimal/i)).toBeInTheDocument();
    });
    expect(mocks.createBountyPayment).not.toHaveBeenCalled();
  });
});
