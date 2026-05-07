import { expect, test } from "@playwright/test";
import { injectMockPhantom, waitForReady } from "./fixtures/wallet";

test.describe("Wrong cluster guard", () => {
  test("mainnet wallet on devnet app shows NetworkMismatchDialog", async ({
    context,
    page,
  }) => {
    await injectMockPhantom(context, { cluster: "mainnet" });
    await page.goto("/claim");
    await waitForReady(page);
    await expect(page.getByText(/wrong network|network mismatch/i)).toBeVisible(
      {
        timeout: 30_000,
      },
    );
  });
});
