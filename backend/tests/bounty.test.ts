import {
  Connection,
  Keypair,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import { createBountyPayment } from "../src/bounty/create-bounty-payment";
import { keypairToSigner } from "../src/lib/keypair-signer";

describe("createBountyPayment input validation", () => {
  it("returns INVALID_INPUT when tokenMint is not valid base58", async () => {
    const payer = Keypair.generate();
    const result = await createBountyPayment(
      {
        amountBaseUnits: 10_000_000n,
        tokenMint: "definitely-not-a-valid-mint",
        label: "x",
      },
      {
        connection: new Connection("https://api.devnet.solana.com"),
        payer: keypairToSigner(payer),
        cluster: "devnet",
      },
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("INVALID_INPUT");
    if (result.error.kind !== "INVALID_INPUT") return;
    expect(result.error.field).toBe("tokenMint");
  });
});

describe("keypairToSigner", () => {
  it("exposes the keypair public key", () => {
    const kp = Keypair.generate();
    const signer = keypairToSigner(kp);
    expect(signer.publicKey.equals(kp.publicKey)).toBe(true);
  });

  it("signs a legacy Transaction with the keypair", async () => {
    const kp = Keypair.generate();
    const signer = keypairToSigner(kp);

    const tx = new Transaction();
    tx.recentBlockhash = "1".repeat(32);
    tx.feePayer = kp.publicKey;
    tx.add(
      new TransactionInstruction({
        keys: [],
        programId: kp.publicKey,
        data: Buffer.alloc(0),
      }),
    );

    const signed = await signer.signTransaction(tx);
    expect(signed.signatures.length).toBeGreaterThan(0);
    expect(signed.signatures[0]?.publicKey.equals(kp.publicKey)).toBe(true);
    expect(signed.signatures[0]?.signature).not.toBeNull();
  });
});
