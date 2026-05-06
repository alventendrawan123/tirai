import type {
  PublicKey,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";

export type Cluster = "mainnet" | "devnet" | "localnet";

export interface ClaimTicket {
  raw: string;
  version: 1;
  cluster: Cluster;
  createdAt: number;
}

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export type Signer = {
  publicKey: PublicKey;
  signTransaction<T extends Transaction | VersionedTransaction>(
    tx: T,
  ): Promise<T>;
};

export type ProgressStep =
  | "validate"
  | "generate-proof"
  | "submit"
  | "confirm"
  | "done";

export type ProgressEmitter = (step: ProgressStep, detail?: string) => void;
