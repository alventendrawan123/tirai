import { NATIVE_SOL_MINT, verifyUtxos } from "@cloak.dev/sdk-devnet";
import type { Connection } from "@solana/web3.js";
import { getProgramId } from "../config/cloak-program";
import { parseSdkError } from "../errors/parse-sdk-error";
import { err, ok } from "../lib/result";
import { decodeClaimTicket } from "../ticket/decode";
import type { Cluster, Result } from "../types/api";
import type { AppError } from "../types/errors";

export interface InspectContext {
  connection: Connection;
  cluster: Cluster;
}

export interface ClaimTicketPreview {
  amountLamports: bigint;
  tokenMint: string | null;
  label: string;
  expiresAt?: number;
  isClaimable: boolean;
}

export async function inspectClaimTicket(
  ticket: string,
  ctx: InspectContext,
): Promise<Result<ClaimTicketPreview, AppError>> {
  const decoded = await decodeClaimTicket(ticket);
  if (!decoded.ok) return decoded;

  if (decoded.value.cluster !== ctx.cluster) {
    return err({
      kind: "WRONG_CLUSTER",
      expected: ctx.cluster,
      got: decoded.value.cluster,
    });
  }

  let isClaimable: boolean;
  try {
    const verifyResult = await verifyUtxos(
      [decoded.value.utxo],
      ctx.connection,
      getProgramId(ctx.cluster),
    );
    isClaimable = verifyResult.unspent.length === 1;
  } catch (error) {
    return err(parseSdkError(error));
  }

  const isNative = decoded.value.tokenMint.equals(NATIVE_SOL_MINT);
  return ok({
    amountLamports: decoded.value.amountBaseUnits,
    tokenMint: isNative ? null : decoded.value.tokenMint.toBase58(),
    label: decoded.value.label,
    isClaimable,
  });
}
