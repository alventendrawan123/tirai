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

const MAX_PROOF_RETRIES = 4;
const RETRY_BACKOFF_MS = [3_000, 6_000, 12_000, 20_000];

const PROOF_RETRY_PATTERNS = [
  "error in template",
  "forceequalifenabled",
  "transaction_222",
  "witness",
  "snarkjs",
  "note index is stale",
  "does not match relay tree",
];

function isRetryableProofError(error: unknown): boolean {
  const msg =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase();
  return PROOF_RETRY_PATTERNS.some((p) => msg.includes(p));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

  let lastError: unknown = null;
  for (let attempt = 0; attempt <= MAX_PROOF_RETRIES; attempt++) {
    try {
      ctx.onProgress?.("validate");
      ctx.onProgress?.("generate-proof");
      if (attempt > 0) {
        ctx.onProgress?.(
          "generate-proof",
          `Retrying after relay sync (attempt ${attempt + 1}/${MAX_PROOF_RETRIES + 1})…`,
        );
      }

      const result = await fullWithdraw([decoded.value.utxo], recipient, {
        connection: ctx.connection,
        programId: getProgramId(ctx.cluster),
        enforceViewingKeyRegistration: false,
        useChainRootForProof: true,
        maxRootRetries: 8,
        retryDelayMs: 5_000,
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
      lastError = error;
      if (attempt < MAX_PROOF_RETRIES && isRetryableProofError(error)) {
        const wait = RETRY_BACKOFF_MS[attempt] ?? 20_000;
        ctx.onProgress?.(
          "generate-proof",
          `Relay tree not yet synced — waiting ${Math.round(wait / 1000)}s before retry…`,
        );
        await delay(wait);
        continue;
      }
      return err(parseSdkError(error));
    }
  }
  return err(parseSdkError(lastError));
}
