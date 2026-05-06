import { fullWithdraw } from "@cloak.dev/sdk-devnet";
import { type Connection, Keypair, type PublicKey } from "@solana/web3.js";
import { getProgramId } from "../config/cloak-program";
import { parseSdkError } from "../errors/parse-sdk-error";
import { err, ok } from "../lib/result";
import { decodeClaimTicket } from "../ticket/decode";
import type { Cluster, ProgressEmitter, Result, Signer } from "../types/api";
import type { AppError } from "../types/errors";

export type ClaimWalletMode =
  | { kind: "fresh" }
  | { kind: "existing"; signer: Signer };

export interface ClaimBountyInput {
  ticket: string;
  mode: ClaimWalletMode;
}

export interface ClaimContext {
  connection: Connection;
  cluster: Cluster;
  onProgress?: ProgressEmitter;
}

export type ClaimBountyResult =
  | {
      mode: "fresh";
      destination: string;
      secretKey: Uint8Array;
      signature: string;
    }
  | {
      mode: "existing";
      destination: string;
      signature: string;
    };

export async function claimBounty(
  input: ClaimBountyInput,
  ctx: ClaimContext,
): Promise<Result<ClaimBountyResult, AppError>> {
  const decoded = await decodeClaimTicket(input.ticket);
  if (!decoded.ok) return decoded;

  if (decoded.value.cluster !== ctx.cluster) {
    return err({
      kind: "WRONG_CLUSTER",
      expected: ctx.cluster,
      got: decoded.value.cluster,
    });
  }

  let recipient: PublicKey;
  let freshKeypair: Keypair | null = null;
  if (input.mode.kind === "fresh") {
    freshKeypair = Keypair.generate();
    recipient = freshKeypair.publicKey;
  } else {
    recipient = input.mode.signer.publicKey;
  }

  try {
    ctx.onProgress?.("validate");
    ctx.onProgress?.("generate-proof");

    const result = await fullWithdraw([decoded.value.utxo], recipient, {
      connection: ctx.connection,
      programId: getProgramId(ctx.cluster),
      enforceViewingKeyRegistration: false,
    });

    ctx.onProgress?.("done");

    if (freshKeypair) {
      return ok({
        mode: "fresh",
        destination: recipient.toBase58(),
        secretKey: freshKeypair.secretKey,
        signature: result.signature,
      });
    }
    return ok({
      mode: "existing",
      destination: recipient.toBase58(),
      signature: result.signature,
    });
  } catch (error) {
    return err(parseSdkError(error));
  }
}
