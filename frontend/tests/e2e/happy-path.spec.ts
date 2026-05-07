import { expect, test } from "@playwright/test";
import { injectMockPhantom, waitForReady } from "./fixtures/wallet";

test.describe("Tirai demo happy path", () => {
  test.beforeEach(async ({ context }) => {
    await injectMockPhantom(context);
  });

  test("project pays → researcher claims fresh → auditor scans + exports", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForReady(page);
    await expect(
      page.getByRole("link", { name: /pay a bounty/i }).first(),
    ).toBeVisible();

    await page.goto("/pay");
    await waitForReady(page);
    await page.getByLabel(/amount/i).fill("0.01");
    await page.getByLabel(/researcher label/i).fill("e2e demo");

    await page.getByRole("button", { name: /pay bounty/i }).click();
    await expect(page.getByText(/bounty paid/i)).toBeVisible({
      timeout: 60_000,
    });

    const ticketCode = await page
      .locator("code")
      .filter({ hasText: /^[A-Za-z0-9_-]+$/u })
      .first()
      .textContent();
    expect(ticketCode?.length).toBeGreaterThan(20);

    await page.goto("/claim");
    await waitForReady(page);
    await page.getByLabel(/claim ticket/i).fill(ticketCode ?? "");
    await expect(page.getByText(/ticket preview/i)).toBeVisible({
      timeout: 30_000,
    });
    await page.getByRole("button", { name: /claim now/i }).click();

    await expect(
      page.getByText(/save your fresh wallet secret key/i),
    ).toBeVisible({ timeout: 90_000 });
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: /i have saved it/i }).click();
    await expect(page.getByText(/withdrawal complete/i)).toBeVisible();

    await page.goto("/audit");
    await waitForReady(page);
    await page.getByRole("button", { name: /scan history/i }).click();
    await expect(page.getByText(/total payments/i)).toBeVisible({
      timeout: 120_000,
    });

    const headers = await page.locator("th").allTextContents();
    expect(headers.map((h) => h.toLowerCase())).not.toContain("destination");
    expect(headers.map((h) => h.toLowerCase())).not.toContain("recipient");

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /download pdf/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(
      /tirai-audit-\d{4}-\d{2}-\d{2}\.pdf/u,
    );
  });
});
