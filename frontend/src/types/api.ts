import type {
  Connection,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import type { Cluster } from "@/config";

export type { Cluster };

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export interface Signer {
  publicKey: PublicKey;
  signTransaction<T extends Transaction | VersionedTransaction>(
    tx: T,
  ): Promise<T>;
}

export interface ClaimTicket {
  raw: string;
  version: 1;
  cluster: Cluster;
  createdAt: number;
}

export type ProgressStep =
  | "validate"
  | "generate-proof"
  | "submit"
  | "confirm"
  | "done";

export type ProgressEmitter = (step: ProgressStep, detail?: string) => void;

export type AppError =
  | { kind: "INVALID_INPUT"; field: string; message: string }
  | { kind: "INSUFFICIENT_BALANCE"; required: bigint; available: bigint }
  | { kind: "USER_REJECTED" }
  | { kind: "NULLIFIER_CONSUMED" }
  | { kind: "WRONG_CLUSTER"; expected: Cluster; got: Cluster }
  | { kind: "RPC"; message: string; retryable: boolean }
  | { kind: "PROOF_GENERATION_FAILED"; message: string }
  | { kind: "TICKET_DECODE_FAILED"; message: string }
  | { kind: "VIEWING_KEY_INVALID" }
  | { kind: "UNKNOWN"; message: string };

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

export interface ScanAuditInput {
  viewingKey: string;
}

export interface AuditContext {
  connection: Connection;
  cluster: Cluster;
}

export interface AuditEntry {
  timestamp: number;
  amountLamports: bigint;
  tokenMint: string | null;
  label: string;
  status: "deposited" | "claimed" | "expired";
  signature: string;
}

export interface AuditSummary {
  totalPayments: number;
  totalVolumeLamports: bigint;
  latestActivityAt: number | null;
}

export interface AuditHistory {
  entries: ReadonlyArray<AuditEntry>;
  summary: AuditSummary;
}

export type AuditExportFormat = "pdf" | "csv";
