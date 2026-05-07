import type {
  AppError,
  BountyContext,
  BountyPaymentResult,
  CreateBountyPaymentInput,
  Result,
} from "@/types/api";
import { buildClaimTicket } from "./ticket";

const STUB_VIEWING_KEY = "vk_stub_replace_with_real_alven_publish";
const STUB_SIGNATURE_PREFIX = "stubSig_";

export async function createBountyPayment(
  input: CreateBountyPaymentInput,
  ctx: BountyContext,
): Promise<Result<BountyPaymentResult, AppError>> {
  if (input.amountBaseUnits <= 0n) {
    return {
      ok: false,
      error: {
        kind: "INVALID_INPUT",
        field: "amountBaseUnits",
        message: "amount must be greater than zero",
      },
    };
  }
  if (input.label.length === 0 || input.label.length > 64) {
    return {
      ok: false,
      error: {
        kind: "INVALID_INPUT",
        field: "label",
        message: "label must be 1..64 chars",
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

  const ticket = buildClaimTicket({
    v: 1,
    c: ctx.cluster,
    m: input.tokenMint ?? "So11111111111111111111111111111111111111112",
    a: input.amountBaseUnits.toString(),
    l: input.label,
    n: input.memo,
    u: { stub: true },
    k: "stub_owner_secret",
    t: Date.now(),
  });

  return {
    ok: true,
    value: {
      ticket,
      viewingKey: STUB_VIEWING_KEY,
      signature: `${STUB_SIGNATURE_PREFIX}${ticket.createdAt.toString(36)}`,
      feeLamports: 5000n,
    },
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
