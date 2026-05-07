import { afterEach, describe, expect, it, vi } from "vitest";
import { logger } from "@/services/logger";

describe("logger.redact", () => {
  it("masks tk_ tokens", () => {
    expect(logger.redact("tk_ABCDEF12345")).toContain("tk_••••");
  });
  it("masks vk_ tokens", () => {
    expect(logger.redact("vk_aaaaaaaa")).toContain("vk_••••");
  });
  it("masks 64-hex digests", () => {
    expect(logger.redact("a".repeat(64))).toBe("0x••••");
  });
  it("masks base58 address-shaped tokens", () => {
    const addr = "11111111111111111111111111111112";
    expect(logger.redact(addr)).toBe("•••address•••");
  });
  it("redacts sensitive object keys recursively", () => {
    const out = logger.redact({
      ticket: "tk_x",
      viewingKey: "vk_y",
      nested: { secretKey: "anything", innocent: "x" },
    }) as Record<string, unknown>;
    expect(out.ticket).toBe("•••redacted•••");
    expect(out.viewingKey).toBe("•••redacted•••");
    const nested = out.nested as Record<string, unknown>;
    expect(nested.secretKey).toBe("•••redacted•••");
    expect(nested.innocent).toBe("x");
  });
  it("masks Uint8Array as bytes placeholder", () => {
    expect(logger.redact(new Uint8Array(64))).toBe("•••bytes•••");
  });
  it("coerces bigint to string", () => {
    expect(logger.redact(10_000_000n)).toBe("10000000");
  });
  it("preserves null + non-sensitive scalars", () => {
    expect(logger.redact(null)).toBeNull();
    expect(logger.redact(42)).toBe(42);
    expect(logger.redact(true)).toBe(true);
  });
});

describe("logger.emit", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does NOT call console in production mode", () => {
    vi.stubEnv("NODE_ENV", "production");
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    logger.info({ scope: "test", message: "hi" });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("DOES call console in dev with redacted payload", () => {
    vi.stubEnv("NODE_ENV", "development");
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    logger.warn({
      scope: "claim",
      message: "drop",
      data: { secretKey: "AAA" },
    });
    expect(spy).toHaveBeenCalled();
    const args = spy.mock.calls[0];
    expect((args[1] as Record<string, unknown>).secretKey).toBe(
      "•••redacted•••",
    );
    spy.mockRestore();
  });
});
