import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../src/components/pages/(app)/audit");

const BANNED_PATTERNS: ReadonlyArray<{ name: string; re: RegExp }> = [
  { name: "property access .destination", re: /\.destination\b/u },
  { name: "property access .recipient", re: /\.recipient\b/u },
  { name: "object key 'destination'", re: /["']destination["']\s*:/u },
  { name: "object key 'recipient'", re: /["']recipient["']\s*:/u },
  {
    name: "table header Destination",
    re: /<t[hd][^>]*>\s*Destination/iu,
  },
  {
    name: "table header Recipient",
    re: /<t[hd][^>]*>\s*Recipient/iu,
  },
];

describe("audit page never references destination/recipient as data", () => {
  it("source files do not contain banned data-access patterns", () => {
    const files = collectFiles(ROOT);
    const offences: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, "utf8");
      for (const { name, re } of BANNED_PATTERNS) {
        const match = content.match(re);
        if (match) {
          offences.push(
            `${path.relative(ROOT, file)}: matched ${name} -> "${match[0]}"`,
          );
        }
      }
    }
    expect(
      offences,
      `audit pages contain banned data-access patterns:\n${offences.join("\n")}`,
    ).toEqual([]);
  });
});

function collectFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...collectFiles(full));
    } else if (/\.(ts|tsx)$/u.test(entry)) {
      out.push(full);
    }
  }
  return out;
}
