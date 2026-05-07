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

describe("secretKey lifecycle privacy invariant", () => {
  beforeEach(() => {
    mocks.inspectClaimTicket.mockReset();
    mocks.claimBounty.mockReset();
  });

  it("zero-outs the underlying Uint8Array after acknowledge", async () => {
    mocks.inspectClaimTicket.mockResolvedValue({
      ok: true,
      value: buildMockPreview(true),
    });
    const secret = new Uint8Array(64).fill(42);
    mocks.claimBounty.mockResolvedValueOnce({
      ok: true,
      value: {
        mode: "fresh",
        destination: "11111111111111111111111111111112",
        secretKey: secret,
        signature: "sig",
      },
    });

    const setItemSpy = vi.spyOn(window.localStorage, "setItem");
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}"));

    const user = userEvent.setup();
    renderWithProviders(<ClaimPage />);

    fireEvent.change(screen.getByLabelText(/claim ticket/i), {
      target: { value: "tk_x" },
    });
    await waitFor(() =>
      expect(screen.getByText(/ticket preview/i)).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: /claim now/i }));
    await waitFor(() =>
      expect(
        screen.getByText(/save your fresh wallet secret key/i),
      ).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /i have saved it/i }));

    await waitFor(() =>
      expect(
        screen.queryByText(/save your fresh wallet secret key/i),
      ).not.toBeInTheDocument(),
    );

    expect(secret.every((b) => b === 0)).toBe(true);

    for (const call of setItemSpy.mock.calls) {
      const [, val] = call;
      expect(val).not.toMatch(/Uint8Array/);
    }

    for (const call of fetchSpy.mock.calls) {
      const body = (call[1] as RequestInit | undefined)?.body;
      if (typeof body === "string") {
        expect(body).not.toContain("\\u002a".repeat(2));
      }
    }
  });
});
