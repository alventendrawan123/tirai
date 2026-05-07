import { expect, test } from "@playwright/test";
import { injectMockPhantom, waitForReady } from "./fixtures/wallet";

test.describe("SaveKeyDialog dismissal is blocked", () => {
  test.beforeEach(async ({ context }) => {
    await injectMockPhantom(context);
  });

  test("Esc + overlay click do NOT close the dialog", async ({ page }) => {
    await page.goto("/pay");
    await waitForReady(page);
    await page.getByLabel(/amount/i).fill("0.01");
    await page.getByLabel(/researcher label/i).fill("dismiss-test");
    await page.getByRole("button", { name: /pay bounty/i }).click();
    await expect(page.getByText(/bounty paid/i)).toBeVisible({
      timeout: 60_000,
    });
    const ticket =
      (await page
        .locator("code")
        .filter({ hasText: /^[A-Za-z0-9_-]+$/u })
        .first()
        .textContent()) ?? "";

    await page.goto("/claim");
    await waitForReady(page);
    await page.getByLabel(/claim ticket/i).fill(ticket);
    await expect(page.getByText(/ticket preview/i)).toBeVisible({
      timeout: 30_000,
    });
    await page.getByRole("button", { name: /claim now/i }).click();
    await expect(
      page.getByText(/save your fresh wallet secret key/i),
    ).toBeVisible({ timeout: 90_000 });

    await page.keyboard.press("Escape");
    await expect(
      page.getByText(/save your fresh wallet secret key/i),
    ).toBeVisible();

    await page.mouse.click(2, 2);
    await expect(
      page.getByText(/save your fresh wallet secret key/i),
    ).toBeVisible();

    const ackButton = page.getByRole("button", {
      name: /i have saved it/i,
    });
    await expect(ackButton).toBeDisabled();
    await page.getByRole("checkbox").check();
    await expect(ackButton).toBeEnabled();
  });
});
