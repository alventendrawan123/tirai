import { describe, expect, it } from "vitest";
import { mapTiraiError } from "@/lib/errors/map-tirai-error";
import type { AppError } from "@/types/api";

describe("mapTiraiError", () => {
  it("maps INVALID_INPUT and surfaces field", () => {
    const err: AppError = {
      kind: "INVALID_INPUT",
      field: "amount",
      message: "must be positive",
    };
    const out = mapTiraiError(err);
    expect(out.kind).toBe("INVALID_INPUT");
    expect(out.field).toBe("amount");
    expect(out.retryable).toBe(false);
    expect(out.silent).toBe(false);
    expect(out.message.length).toBeGreaterThan(0);
  });

  it("marks USER_REJECTED retryable + silent", () => {
    const out = mapTiraiError({ kind: "USER_REJECTED" });
    expect(out.retryable).toBe(true);
    expect(out.silent).toBe(true);
  });

  it("preserves RPC retryable flag from source error", () => {
    const out = mapTiraiError({
      kind: "RPC",
      message: "blockhash not found",
      retryable: true,
    });
    expect(out.retryable).toBe(true);
    expect(out.silent).toBe(false);
  });

  it("RPC retryable false propagates", () => {
    const out = mapTiraiError({
      kind: "RPC",
      message: "fatal",
      retryable: false,
    });
    expect(out.retryable).toBe(false);
  });

  it("NULLIFIER_CONSUMED is non-retryable + visible", () => {
    const out = mapTiraiError({ kind: "NULLIFIER_CONSUMED" });
    expect(out.retryable).toBe(false);
    expect(out.silent).toBe(false);
  });

  it("WRONG_CLUSTER is non-retryable", () => {
    const out = mapTiraiError({
      kind: "WRONG_CLUSTER",
      expected: "mainnet",
      got: "devnet",
    });
    expect(out.retryable).toBe(false);
  });

  it("INSUFFICIENT_BALANCE is non-retryable", () => {
    const out = mapTiraiError({
      kind: "INSUFFICIENT_BALANCE",
      required: 100n,
      available: 50n,
    });
    expect(out.retryable).toBe(false);
  });

  it("TICKET_DECODE_FAILED is non-retryable", () => {
    const out = mapTiraiError({
      kind: "TICKET_DECODE_FAILED",
      message: "bad base64",
    });
    expect(out.retryable).toBe(false);
  });

  it("VIEWING_KEY_INVALID is non-retryable", () => {
    const out = mapTiraiError({ kind: "VIEWING_KEY_INVALID" });
    expect(out.retryable).toBe(false);
  });

  it("PROOF_GENERATION_FAILED is retryable", () => {
    const out = mapTiraiError({
      kind: "PROOF_GENERATION_FAILED",
      message: "circuit",
    });
    expect(out.retryable).toBe(true);
  });

  it("UNKNOWN is retryable", () => {
    const out = mapTiraiError({ kind: "UNKNOWN", message: "?" });
    expect(out.retryable).toBe(true);
    expect(out.silent).toBe(false);
  });

  it("never echoes raw sensitive substrings into mapped message", () => {
    const out = mapTiraiError({
      kind: "RPC",
      message: "vk_AAAAAA tk_BBBBBB",
      retryable: true,
    });
    expect(out.message).not.toContain("vk_AAAAAA");
    expect(out.message).not.toContain("tk_BBBBBB");
  });
});
