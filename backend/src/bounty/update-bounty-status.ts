import { err, ok } from "../lib/result";
import type { Result } from "../types/api";
import type { AppError } from "../types/errors";
import { type BountyRow, rowToBounty } from "./bounty-row";
import { callAuthServer } from "./http-client";
import type { Bounty, BountyManageContext, BountyStatus } from "./types";

export async function updateBountyStatus(
  id: string,
  status: BountyStatus,
  paymentSignature: string | undefined,
  ctx: BountyManageContext,
): Promise<Result<Bounty, AppError>> {
  if (id.length === 0) {
    return err({
      kind: "INVALID_INPUT",
      field: "id",
      message: "Bounty id required",
    });
  }

  const body: Record<string, unknown> = { status };
  if (paymentSignature !== undefined) {
    body.paymentSignature = paymentSignature;
  }

  const result = await callAuthServer<BountyRow>({
    method: "PATCH",
    url: `${ctx.authVerifierUrl}/bounties/${id}`,
    jwt: ctx.jwt,
    body,
  });
  if (!result.ok) return result;
  return ok(rowToBounty(result.value));
}
