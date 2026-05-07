import { Keypair } from "@solana/web3.js";
import type {
  AppError,
  ClaimBountyInput,
  ClaimBountyResult,
  ClaimContext,
  ClaimTicketPreview,
  InspectContext,
  Result,
} from "@/types/api";
import { decodeTicket } from "./ticket";

const STUB_SIGNATURE_PREFIX = "stubClaim_";

export async function inspectClaimTicket(
  ticket: string,
  ctx: InspectContext,
): Promise<Result<ClaimTicketPreview, AppError>> {
  if (!ticket) {
    return {
      ok: false,
      error: {
        kind: "INVALID_INPUT",
        field: "ticket",
        message: "ticket is required",
      },
    };
  }

  let envelope: ReturnType<typeof decodeTicket>;
  try {
    envelope = decodeTicket(ticket);
  } catch (err) {
    return {
      ok: false,
      error: {
        kind: "TICKET_DECODE_FAILED",
        message: err instanceof Error ? err.message : "decode failed",
      },
    };
  }

  if (envelope.c !== ctx.cluster) {
    return {
      ok: false,
      error: {
        kind: "WRONG_CLUSTER",
        expected: ctx.cluster,
        got: envelope.c,
      },
    };
  }

  return {
    ok: true,
    value: {
      amountLamports: BigInt(envelope.a),
      tokenMint: envelope.m,
      label: envelope.l,
      isClaimable: true,
    },
  };
}

export async function claimBounty(
  input: ClaimBountyInput,
  ctx: ClaimContext,
): Promise<Result<ClaimBountyResult, AppError>> {
  let envelope: ReturnType<typeof decodeTicket>;
  try {
    envelope = decodeTicket(input.ticket);
  } catch (err) {
    return {
      ok: false,
      error: {
        kind: "TICKET_DECODE_FAILED",
        message: err instanceof Error ? err.message : "decode failed",
      },
    };
  }

  if (envelope.c !== ctx.cluster) {
    return {
      ok: false,
      error: {
        kind: "WRONG_CLUSTER",
        expected: ctx.cluster,
        got: envelope.c,
      },
    };
  }

  ctx.onProgress?.("validate");
  await delay(150);
  ctx.onProgress?.("generate-proof");
  await delay(900);
  ctx.onProgress?.("submit");
  await delay(250);
  ctx.onProgress?.("confirm");
  await delay(400);
  ctx.onProgress?.("done");

  const signature = `${STUB_SIGNATURE_PREFIX}${Date.now().toString(36)}`;

  if (input.mode.kind === "fresh") {
    const kp = Keypair.generate();
    return {
      ok: true,
      value: {
        mode: "fresh",
        destination: kp.publicKey.toBase58(),
        secretKey: kp.secretKey,
        signature,
      },
    };
  }

  return {
    ok: true,
    value: {
      mode: "existing",
      destination: input.mode.signer.publicKey.toBase58(),
      signature,
    },
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
