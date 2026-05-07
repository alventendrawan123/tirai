import {
  bytesToHex,
  calculateFeeBigint,
  createUtxo,
  createZeroUtxo,
  generateUtxoKeypair,
  getNkFromUtxoPrivateKey,
  NATIVE_SOL_MINT,
  transact,
} from "@cloak.dev/sdk-devnet";
import {
  type Connection,
  PublicKey,
  type Transaction,
  type VersionedTransaction,
} from "@solana/web3.js";
import { getProgramId } from "../config/cloak-program";
import { parseSdkError } from "../errors/parse-sdk-error";
import { err, ok } from "../lib/result";
import { encodeClaimTicket } from "../ticket/encode";
import type {
  ClaimTicket,
  Cluster,
  ProgressEmitter,
  Result,
  Signer,
} from "../types/api";
import type { AppError } from "../types/errors";

export interface CreateBountyPaymentInput {
  amountBaseUnits: bigint;
  tokenMint?: string;
  label: string;
  memo?: string;
}

export interface BountyContext {
  connection: Connection;
  payer: Signer;
  cluster: Cluster;
  onProgress?: ProgressEmitter;
}

export interface BountyPaymentResult {
  ticket: ClaimTicket;
  viewingKey: string;
  signature: string;
  feeLamports: bigint;
}

export async function createBountyPayment(
  input: CreateBountyPaymentInput,
  ctx: BountyContext,
): Promise<Result<BountyPaymentResult, AppError>> {
  let mint: PublicKey;
  if (input.tokenMint === undefined) {
    mint = NATIVE_SOL_MINT;
  } else {
    try {
      mint = new PublicKey(input.tokenMint);
    } catch {
      return err({
        kind: "INVALID_INPUT",
        field: "tokenMint",
        message: "Not a valid base58 public key",
      });
    }
  }

  if (mint.equals(NATIVE_SOL_MINT)) {
    try {
      ctx.onProgress?.("validate");
      const balance = BigInt(
        await ctx.connection.getBalance(ctx.payer.publicKey),
      );
      const networkFeeBuffer = 5_000n;
      const required = input.amountBaseUnits + networkFeeBuffer;
      if (balance < required) {
        return err({
          kind: "INSUFFICIENT_BALANCE",
          required,
          available: balance,
        });
      }
    } catch (error) {
      if (error instanceof Error) {
        return err({ kind: "RPC", message: error.message, retryable: true });
      }
      return err({ kind: "RPC", message: String(error), retryable: true });
    }
  }

  try {
    ctx.onProgress?.("validate");

    const owner = await generateUtxoKeypair();
    const nk = getNkFromUtxoPrivateKey(owner.privateKey);
    const outputUtxo = await createUtxo(input.amountBaseUnits, owner, mint);
    const zeroUtxo = await createZeroUtxo(mint);

    ctx.onProgress?.("generate-proof");

    const result = await transact(
      {
        inputUtxos: [zeroUtxo],
        outputUtxos: [outputUtxo],
        externalAmount: input.amountBaseUnits,
        depositor: ctx.payer.publicKey,
      },
      {
        connection: ctx.connection,
        programId: getProgramId(ctx.cluster),
        signTransaction: <T extends Transaction | VersionedTransaction>(
          tx: T,
        ): Promise<T> => ctx.payer.signTransaction(tx),
        depositorPublicKey: ctx.payer.publicKey,
        walletPublicKey: ctx.payer.publicKey,
        enforceViewingKeyRegistration: false,
        chainNoteViewingKeyNk: nk,
      },
    );

    ctx.onProgress?.("done");

    const outputForTicket = result.outputUtxos[0];
    if (!outputForTicket) {
      return err({
        kind: "UNKNOWN",
        message: "transact did not return output UTXO",
      });
    }

    const ticket = encodeClaimTicket({
      utxo: outputForTicket,
      amountBaseUnits: input.amountBaseUnits,
      tokenMint: mint,
      label: input.label,
      cluster: ctx.cluster,
      ...(input.memo !== undefined ? { memo: input.memo } : {}),
    });

    return ok({
      ticket,
      viewingKey: bytesToHex(nk),
      signature: result.signature,
      feeLamports: calculateFeeBigint(input.amountBaseUnits),
    });
  } catch (error) {
    return err(parseSdkError(error));
  }
}
