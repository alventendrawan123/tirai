import { describe, expect, it } from "vitest";
import { logger } from "@/services/logger";

describe("logger redaction completeness (privacy guard)", () => {
  it("never echoes a 64-hex viewing key in any nested position", () => {
    const VK = "f".repeat(64);
    const result = JSON.stringify(
      logger.redact({
        meta: {
          extra: [VK, { inner: VK }, `prefix-${VK}-suffix`],
        },
      }),
    );
    expect(result).not.toContain(VK);
  });

  it("redacts known sensitive object keys at any depth", () => {
    const tree = {
      a: {
        b: {
          ticket: "tk_DEADBEEF",
          viewingKey: "vk_FEEDFACE",
          secretKey: "AnyThing",
          destination: "11111111111111111111111111111112",
          recipient: "11111111111111111111111111111112",
          to: "11111111111111111111111111111112",
        },
      },
    };
    const out = logger.redact(tree) as Record<string, unknown>;
    const inner = (out.a as Record<string, unknown>).b as Record<
      string,
      unknown
    > as Record<string, unknown>;
    expect(inner.ticket).toBe("•••redacted•••");
    expect(inner.viewingKey).toBe("•••redacted•••");
    expect(inner.secretKey).toBe("•••redacted•••");
    expect(inner.destination).toBe("•••redacted•••");
    expect(inner.recipient).toBe("•••redacted•••");
    expect(inner.to).toBe("•••redacted•••");
  });

  it("strips Uint8Array even when nested in arrays", () => {
    const out = logger.redact({
      keys: [new Uint8Array(64).fill(1), new Uint8Array(32)],
    }) as { keys: unknown[] };
    expect(out.keys[0]).toBe("•••bytes•••");
    expect(out.keys[1]).toBe("•••bytes•••");
  });
});
