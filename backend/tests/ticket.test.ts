import {
  createUtxo,
  DEVNET_MOCK_USDC_MINT,
  generateUtxoKeypair,
  NATIVE_SOL_MINT,
} from "@cloak.dev/sdk-devnet";
import { describe, expect, it } from "vitest";
import { bytesToBase64Url } from "../src/ticket/base64";
import { decodeClaimTicket } from "../src/ticket/decode";
import { encodeClaimTicket } from "../src/ticket/encode";

function encodeRawEnvelope(envelope: unknown): string {
  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(envelope)));
}

describe("ticket encode/decode", () => {
  it("round-trips a SOL UTXO without memo", async () => {
    const owner = await generateUtxoKeypair();
    const amount = 1_000_000n;
    const utxo = await createUtxo(amount, owner, NATIVE_SOL_MINT);

    const ticket = encodeClaimTicket({
      utxo,
      amountBaseUnits: amount,
      tokenMint: NATIVE_SOL_MINT,
      label: "Bounty #1",
      cluster: "devnet",
      createdAt: 1_700_000_000_000,
    });

    expect(ticket.version).toBe(1);
    expect(ticket.cluster).toBe("devnet");
    expect(ticket.createdAt).toBe(1_700_000_000_000);
    expect(ticket.raw).toMatch(/^[A-Za-z0-9_-]+$/);

    const result = await decodeClaimTicket(ticket.raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.amountBaseUnits).toBe(amount);
    expect(result.value.tokenMint.equals(NATIVE_SOL_MINT)).toBe(true);
    expect(result.value.label).toBe("Bounty #1");
    expect(result.value.memo).toBeUndefined();
    expect(result.value.cluster).toBe("devnet");
    expect(result.value.createdAt).toBe(1_700_000_000_000);
    expect(result.value.utxo.amount).toBe(amount);
    expect(result.value.utxo.commitment).toBe(utxo.commitment);
    expect(result.value.utxo.keypair.privateKey).toBe(owner.privateKey);
    expect(result.value.utxo.keypair.publicKey).toBe(owner.publicKey);
    expect(result.value.utxo.blinding).toBe(utxo.blinding);
  });

  it("preserves memo and SPL mint through round-trip", async () => {
    const owner = await generateUtxoKeypair();
    const amount = 500_000n;
    const utxo = await createUtxo(amount, owner, DEVNET_MOCK_USDC_MINT);

    const ticket = encodeClaimTicket({
      utxo,
      amountBaseUnits: amount,
      tokenMint: DEVNET_MOCK_USDC_MINT,
      label: "USDC bounty",
      memo: "Critical XSS in admin panel",
      cluster: "devnet",
    });

    const result = await decodeClaimTicket(ticket.raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.memo).toBe("Critical XSS in admin panel");
    expect(result.value.tokenMint.equals(DEVNET_MOCK_USDC_MINT)).toBe(true);
    expect(result.value.amountBaseUnits).toBe(amount);
  });

  it("returns TICKET_DECODE_FAILED for non-base64 input", async () => {
    const result = await decodeClaimTicket("!!!not-valid-base64!!!");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("TICKET_DECODE_FAILED");
  });

  it("returns TICKET_DECODE_FAILED for non-JSON content", async () => {
    const raw = bytesToBase64Url(new TextEncoder().encode("not json"));
    const result = await decodeClaimTicket(raw);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("TICKET_DECODE_FAILED");
  });

  it("returns TICKET_DECODE_FAILED for unknown version", async () => {
    const raw = encodeRawEnvelope({
      v: 2,
      c: "devnet",
      m: NATIVE_SOL_MINT.toBase58(),
      a: "1000",
      l: "x",
      u: "AAAA",
      t: Date.now(),
    });
    const result = await decodeClaimTicket(raw);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("TICKET_DECODE_FAILED");
  });

  it("returns TICKET_DECODE_FAILED for invalid cluster", async () => {
    const raw = encodeRawEnvelope({
      v: 1,
      c: "mainnet-beta",
      m: NATIVE_SOL_MINT.toBase58(),
      a: "1000",
      l: "x",
      u: "AAAA",
      t: Date.now(),
    });
    const result = await decodeClaimTicket(raw);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("TICKET_DECODE_FAILED");
  });

  it("returns TICKET_DECODE_FAILED for invalid mint", async () => {
    const raw = encodeRawEnvelope({
      v: 1,
      c: "devnet",
      m: "not-a-valid-base58-pubkey",
      a: "1000",
      l: "x",
      u: "AAAA",
      t: Date.now(),
    });
    const result = await decodeClaimTicket(raw);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("TICKET_DECODE_FAILED");
  });

  it("returns TICKET_DECODE_FAILED for non-numeric amount", async () => {
    const raw = encodeRawEnvelope({
      v: 1,
      c: "devnet",
      m: NATIVE_SOL_MINT.toBase58(),
      a: "not-a-number",
      l: "x",
      u: "AAAA",
      t: Date.now(),
    });
    const result = await decodeClaimTicket(raw);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("TICKET_DECODE_FAILED");
  });
});
