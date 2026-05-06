import type { Connection } from "@solana/web3.js";
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
  _input: ClaimBountyInput,
  _ctx: ClaimContext,
): Promise<Result<ClaimBountyResult, AppError>> {
  return { ok: false, error: { kind: "UNKNOWN", message: "not implemented" } };
}
