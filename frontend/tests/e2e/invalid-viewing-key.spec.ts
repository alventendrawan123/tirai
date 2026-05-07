import { expect, test } from "@playwright/test";
import { injectMockPhantom, waitForReady } from "./fixtures/wallet";

test.describe("/audit invalid viewing key handling", () => {
  test.beforeEach(async ({ context }) => {
    await injectMockPhantom(context);
  });

  test("non-hex viewing key shows inline validation", async ({ page }) => {
    await page.goto("/audit");
    await waitForReady(page);
    await page.getByLabel(/paste the viewing key/i).fill("not-a-hex-key");
    await page.getByRole("button", { name: /scan history/i }).click();
    await expect(page.getByText(/64 hexadecimal/i)).toBeVisible();
  });

  test("64-char garbage viewing key returns invalid error", async ({
    page,
  }) => {
    await page.goto("/audit");
    await waitForReady(page);
    await page.getByLabel(/paste the viewing key/i).fill("z".repeat(64));
    await page.getByRole("button", { name: /scan history/i }).click();
    await expect(
      page.getByText(/64 hexadecimal/i).or(page.getByText(/could not scan/i)),
    ).toBeVisible({ timeout: 30_000 });
  });
});
