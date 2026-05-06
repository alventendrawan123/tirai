import { deserializeUtxo, type Utxo } from "@cloak.dev/sdk-devnet";
import { PublicKey } from "@solana/web3.js";
import { z } from "zod";
import { err, ok } from "../lib/result";
import type { Cluster, Result } from "../types/api";
import type { AppError } from "../types/errors";
import type { ClaimTicketEnvelope } from "../types/ticket";
import { base64UrlToBytes } from "./base64";

const EnvelopeSchema = z.object({
  v: z.literal(1),
  c: z.enum(["mainnet", "devnet", "localnet"]),
  m: z.string().min(1),
  a: z.string().min(1),
  l: z.string(),
  n: z.string().optional(),
  u: z.string().min(1),
  t: z.number(),
});

export interface DecodedTicket {
  envelope: ClaimTicketEnvelope;
  utxo: Utxo;
  amountBaseUnits: bigint;
  tokenMint: PublicKey;
  cluster: Cluster;
  label: string;
  memo?: string;
  createdAt: number;
}

export async function decodeClaimTicket(
  raw: string,
): Promise<Result<DecodedTicket, AppError>> {
  let envelope: ClaimTicketEnvelope;
  try {
    const bytes = base64UrlToBytes(raw);
    const json = new TextDecoder().decode(bytes);
    const parsed: unknown = JSON.parse(json);
    const schema = EnvelopeSchema.parse(parsed);
    envelope = {
      v: schema.v,
      c: schema.c,
      m: schema.m,
      a: schema.a,
      l: schema.l,
      u: schema.u,
      t: schema.t,
      ...(schema.n !== undefined ? { n: schema.n } : {}),
    };
  } catch (error) {
    return err({
      kind: "TICKET_DECODE_FAILED",
      message: error instanceof Error ? error.message : String(error),
    });
  }

  let tokenMint: PublicKey;
  let amountBaseUnits: bigint;
  let utxo: Utxo;
  try {
    tokenMint = new PublicKey(envelope.m);
    amountBaseUnits = BigInt(envelope.a);
    utxo = await deserializeUtxo(base64UrlToBytes(envelope.u));
  } catch (error) {
    return err({
      kind: "TICKET_DECODE_FAILED",
      message: error instanceof Error ? error.message : String(error),
    });
  }

  return ok({
    envelope,
    utxo,
    amountBaseUnits,
    tokenMint,
    cluster: envelope.c,
    label: envelope.l,
    createdAt: envelope.t,
    ...(envelope.n !== undefined ? { memo: envelope.n } : {}),
  });
}
