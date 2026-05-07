import { browser } from "k6/browser";

const BASE_URL = __ENV.E2E_BASE_URL || "http://localhost:3000";

export const options = {
  scenarios: {
    ui: {
      executor: "shared-iterations",
      vus: 1,
      iterations: Number(__ENV.K6_ITERATIONS || 5),
      options: { browser: { type: "chromium" } },
    },
  },
  thresholds: {
    browser_web_vital_lcp: ["p(75)<2500"],
    browser_web_vital_inp: ["p(75)<200"],
    browser_web_vital_cls: ["p(75)<0.1"],
  },
};

export default async function () {
  const page = await browser.newPage();
  try {
    await page.goto(`${BASE_URL}/`);
    await page.waitForSelector("h1");
  } finally {
    await page.close();
  }
}
