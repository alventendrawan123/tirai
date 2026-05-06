import {
  createUtxo,
  generateUtxoKeypair,
  NATIVE_SOL_MINT,
} from "@cloak.dev/sdk-devnet";
import { Connection, Keypair } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import { claimBounty } from "../src/claim/claim-bounty";
import { inspectClaimTicket } from "../src/claim/inspect-claim-ticket";
import { encodeClaimTicket } from "../src/ticket/encode";

const RPC_URL = "https://api.devnet.solana.com";

async function buildDevnetTicket() {
  const owner = await generateUtxoKeypair();
  const amount = 1_000_000n;
  const utxo = await createUtxo(amount, owner, NATIVE_SOL_MINT);
  return encodeClaimTicket({
    utxo,
    amountBaseUnits: amount,
    tokenMint: NATIVE_SOL_MINT,
    label: "test",
    cluster: "devnet",
  });
}

describe("inspectClaimTicket validation", () => {
  it("returns TICKET_DECODE_FAILED for malformed input", async () => {
    const result = await inspectClaimTicket("!!!not-valid!!!", {
      connection: new Connection(RPC_URL),
      cluster: "devnet",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("TICKET_DECODE_FAILED");
  });

  it("returns WRONG_CLUSTER when ticket cluster differs from ctx", async () => {
    const ticket = await buildDevnetTicket();
    const result = await inspectClaimTicket(ticket.raw, {
      connection: new Connection(RPC_URL),
      cluster: "mainnet",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("WRONG_CLUSTER");
    if (result.error.kind !== "WRONG_CLUSTER") return;
    expect(result.error.expected).toBe("mainnet");
    expect(result.error.got).toBe("devnet");
  });
});

describe("claimBounty validation", () => {
  it("returns TICKET_DECODE_FAILED for malformed input", async () => {
    const result = await claimBounty(
      { ticket: "!!!not-valid!!!", mode: { kind: "fresh" } },
      { connection: new Connection(RPC_URL), cluster: "devnet" },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("TICKET_DECODE_FAILED");
  });

  it("returns WRONG_CLUSTER without touching RPC when cluster mismatches", async () => {
    const ticket = await buildDevnetTicket();
    const stubSigner = {
      publicKey: Keypair.generate().publicKey,
      signTransaction: async <T>(tx: T) => tx,
    };
    const result = await claimBounty(
      { ticket: ticket.raw, mode: { kind: "existing", signer: stubSigner } },
      { connection: new Connection(RPC_URL), cluster: "mainnet" },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("WRONG_CLUSTER");
    if (result.error.kind !== "WRONG_CLUSTER") return;
    expect(result.error.expected).toBe("mainnet");
    expect(result.error.got).toBe("devnet");
  });
});
