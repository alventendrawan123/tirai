import { expect, test } from "@playwright/test";
import { injectMockPhantom, waitForReady } from "./fixtures/wallet";

test.describe("/claim invalid ticket handling", () => {
  test.beforeEach(async ({ context }) => {
    await injectMockPhantom(context);
  });

  test("malformed ticket surfaces decode error and never enables Claim", async ({
    page,
  }) => {
    await page.goto("/claim");
    await waitForReady(page);
    await page.getByLabel(/claim ticket/i).fill("notatcket!!!");
    await expect(
      page.getByText(/not in a recognised format|claim failed/i),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: /claim now/i })).toHaveCount(
      0,
    );
  });
});
