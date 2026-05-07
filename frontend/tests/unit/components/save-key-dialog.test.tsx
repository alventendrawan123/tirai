import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import bs58 from "bs58";
import { describe, expect, it, vi } from "vitest";
import { SaveKeyDialog } from "@/components/ui/save-key-dialog";

const fakeSecret = new Uint8Array(64).fill(9);
const fakeDestination = "11111111111111111111111111111112";

describe("SaveKeyDialog", () => {
  it("renders the secret as bs58", () => {
    render(
      <SaveKeyDialog
        open
        destination={fakeDestination}
        secretKey={fakeSecret}
        onAcknowledge={() => {}}
      />,
    );
    const expected = bs58.encode(fakeSecret);
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it("acknowledge button is disabled until checkbox is checked", async () => {
    const user = userEvent.setup();
    const onAck = vi.fn();
    render(
      <SaveKeyDialog
        open
        destination={fakeDestination}
        secretKey={fakeSecret}
        onAcknowledge={onAck}
      />,
    );
    const button = screen.getByRole("button", { name: /i have saved it/i });
    expect(button).toBeDisabled();
    await user.click(screen.getByRole("checkbox"));
    expect(button).toBeEnabled();
    await user.click(button);
    expect(onAck).toHaveBeenCalledTimes(1);
  });

  it("Escape key does NOT acknowledge or close", async () => {
    const onAck = vi.fn();
    const user = userEvent.setup();
    render(
      <SaveKeyDialog
        open
        destination={fakeDestination}
        secretKey={fakeSecret}
        onAcknowledge={onAck}
      />,
    );
    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(onAck).not.toHaveBeenCalled();
      expect(
        screen.getByRole("button", { name: /i have saved it/i }),
      ).toBeInTheDocument();
    });
  });

  it("download .txt action triggers blob URL flow", async () => {
    const user = userEvent.setup();
    const createSpy = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:saved");
    render(
      <SaveKeyDialog
        open
        destination={fakeDestination}
        secretKey={fakeSecret}
        onAcknowledge={() => {}}
      />,
    );
    await user.click(screen.getByRole("button", { name: /download \.txt/i }));
    expect(createSpy).toHaveBeenCalled();
  });

  it("does not render any 'Cancel' or close affordance", () => {
    render(
      <SaveKeyDialog
        open
        destination={fakeDestination}
        secretKey={fakeSecret}
        onAcknowledge={() => {}}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /close/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /cancel/i }),
    ).not.toBeInTheDocument();
  });
});
