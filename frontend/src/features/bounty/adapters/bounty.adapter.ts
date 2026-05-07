import type { WalletContextState } from "@solana/wallet-adapter-react";
import type { Connection } from "@solana/web3.js";
import { createBountyPayment } from "@tirai/api";
import { safeAdapter } from "@/lib/errors";
import type {
  AppError,
  BountyPaymentResult,
  Cluster,
  ProgressEmitter,
  Result,
} from "@/types/api";

export interface PayBountyAdapterInput {
  amountSol: number;
  label: string;
  memo?: string;
  tokenMint?: string;
}

export interface PayBountyAdapterContext {
  connection: Connection;
  wallet: WalletContextState;
  cluster: Cluster;
  onProgress?: ProgressEmitter;
}

const LAMPORTS_PER_SOL = 1_000_000_000;

export async function payBountyAdapter(
  input: PayBountyAdapterInput,
  ctx: PayBountyAdapterContext,
): Promise<Result<BountyPaymentResult, AppError>> {
  if (!ctx.wallet.publicKey || !ctx.wallet.signTransaction) {
    return {
      ok: false,
      error: {
        kind: "INVALID_INPUT",
        field: "wallet",
        message: "wallet must be connected",
      },
    };
  }
  const publicKey = ctx.wallet.publicKey;
  const signTransaction = ctx.wallet.signTransaction;
  return safeAdapter(() =>
    createBountyPayment(
      {
        amountBaseUnits: BigInt(Math.floor(input.amountSol * LAMPORTS_PER_SOL)),
        label: input.label,
        ...(input.memo !== undefined ? { memo: input.memo } : {}),
        ...(input.tokenMint !== undefined
          ? { tokenMint: input.tokenMint }
          : {}),
      },
      {
        connection: ctx.connection,
        payer: { publicKey, signTransaction },
        cluster: ctx.cluster,
        ...(ctx.onProgress !== undefined ? { onProgress: ctx.onProgress } : {}),
      },
    ),
  );
}
