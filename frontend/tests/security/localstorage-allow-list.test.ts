import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC = path.resolve(__dirname, "../../src");

interface Hit {
  file: string;
  line: number;
  context: string;
}

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

function findCalls(method: "setItem" | "getItem"): Hit[] {
  const out: Hit[] = [];
  const needle = `localStorage.${method}(`;
  for (const file of collectFiles(SRC)) {
    const lines = readFileSync(file, "utf8").split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].includes(needle)) continue;
      const window = lines.slice(Math.max(0, i - 2), i + 6).join("\n");
      out.push({
        file: path.relative(SRC, file),
        line: i + 1,
        context: window,
      });
    }
  }
  return out;
}

function isAllowed(hit: Hit): boolean {
  return (
    hit.context.includes("tirai:vk:") ||
    hit.context.includes("VK_STORAGE_NAMESPACE")
  );
}

describe("localStorage usage allow-list", () => {
  it("setItem only writes keys under tirai:vk: namespace", () => {
    const offending = findCalls("setItem").filter((h) => !isAllowed(h));
    expect(
      offending,
      `unexpected setItem outside tirai:vk:\n${offending
        .map((h) => `${h.file}:${h.line}\n${h.context}`)
        .join("\n---\n")}`,
    ).toEqual([]);
  });

  it("getItem only reads keys under tirai:vk: namespace", () => {
    const offending = findCalls("getItem").filter((h) => !isAllowed(h));
    expect(
      offending,
      `unexpected getItem outside tirai:vk:\n${offending
        .map((h) => `${h.file}:${h.line}\n${h.context}`)
        .join("\n---\n")}`,
    ).toEqual([]);
  });
});
