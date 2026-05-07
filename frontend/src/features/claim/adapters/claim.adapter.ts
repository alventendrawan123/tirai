import type { WalletContextState } from "@solana/wallet-adapter-react";
import type { Connection } from "@solana/web3.js";
import { claimBounty } from "@tirai/api";
import { safeAdapter } from "@/lib/errors";
import type {
  AppError,
  ClaimBountyResult,
  Cluster,
  ProgressEmitter,
  Result,
} from "@/types/api";

export interface ClaimAdapterContext {
  connection: Connection;
  cluster: Cluster;
  onProgress?: ProgressEmitter;
}

export async function claimFreshAdapter(
  ticketRaw: string,
  ctx: ClaimAdapterContext,
): Promise<Result<ClaimBountyResult, AppError>> {
  return safeAdapter(() =>
    claimBounty(
      { ticket: ticketRaw, mode: { kind: "fresh" } },
      {
        connection: ctx.connection,
        cluster: ctx.cluster,
        ...(ctx.onProgress !== undefined ? { onProgress: ctx.onProgress } : {}),
      },
    ),
  );
}

export async function claimExistingAdapter(
  ticketRaw: string,
  wallet: WalletContextState,
  ctx: ClaimAdapterContext,
): Promise<Result<ClaimBountyResult, AppError>> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    return {
      ok: false,
      error: {
        kind: "INVALID_INPUT",
        field: "wallet",
        message: "wallet must be connected for existing-mode claim",
      },
    };
  }
  const publicKey = wallet.publicKey;
  const signTransaction = wallet.signTransaction;
  return safeAdapter(() =>
    claimBounty(
      {
        ticket: ticketRaw,
        mode: {
          kind: "existing",
          signer: { publicKey, signTransaction },
        },
      },
      {
        connection: ctx.connection,
        cluster: ctx.cluster,
        ...(ctx.onProgress !== undefined ? { onProgress: ctx.onProgress } : {}),
      },
    ),
  );
}
