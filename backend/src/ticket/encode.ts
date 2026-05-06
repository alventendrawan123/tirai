import { serializeUtxo, type Utxo } from "@cloak.dev/sdk-devnet";
import type { PublicKey } from "@solana/web3.js";
import type { ClaimTicket, Cluster } from "../types/api";
import type { ClaimTicketEnvelope } from "../types/ticket";
import { bytesToBase64Url } from "./base64";

export interface EncodeTicketInput {
  utxo: Utxo;
  amountBaseUnits: bigint;
  tokenMint: PublicKey;
  label: string;
  memo?: string;
  cluster: Cluster;
  createdAt?: number;
}

export function encodeClaimTicket(input: EncodeTicketInput): ClaimTicket {
  const createdAt = input.createdAt ?? Date.now();

  const envelope: ClaimTicketEnvelope = {
    v: 1,
    c: input.cluster,
    m: input.tokenMint.toBase58(),
    a: input.amountBaseUnits.toString(),
    l: input.label,
    u: bytesToBase64Url(serializeUtxo(input.utxo)),
    t: createdAt,
    ...(input.memo !== undefined ? { n: input.memo } : {}),
  };

  const json = JSON.stringify(envelope);
  const raw = bytesToBase64Url(new TextEncoder().encode(json));

  return {
    raw,
    version: 1,
    cluster: envelope.c,
    createdAt,
  };
}
