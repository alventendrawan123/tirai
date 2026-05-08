import { err, ok } from "../lib/result";
import type { Result } from "../types/api";
import type { AppError } from "../types/errors";
import { type BountyRow, rowToBounty } from "./bounty-row";
import { callAuthServer } from "./http-client";
import type { Bounty, BountyManageContext, CreateBountyInput } from "./types";

export async function createBounty(
  input: CreateBountyInput,
  ctx: BountyManageContext,
): Promise<Result<Bounty, AppError>> {
  if (input.title.length === 0 || input.title.length > 120) {
    return err({
      kind: "INVALID_INPUT",
      field: "title",
      message: "Title must be 1-120 characters",
    });
  }
  if (input.description.length === 0 || input.description.length > 5000) {
    return err({
      kind: "INVALID_INPUT",
      field: "description",
      message: "Description must be 1-5000 characters",
    });
  }
  if (input.rewardLamports <= 0n) {
    return err({
      kind: "INVALID_INPUT",
      field: "rewardLamports",
      message: "Reward must be positive",
    });
  }
  if (input.deadline <= Date.now()) {
    return err({
      kind: "INVALID_INPUT",
      field: "deadline",
      message: "Deadline must be in the future",
    });
  }

  const result = await callAuthServer<BountyRow>({
    method: "POST",
    url: `${ctx.authVerifierUrl}/bounties`,
    jwt: ctx.jwt,
    body: {
      title: input.title,
      description: input.description,
      rewardLamports: input.rewardLamports.toString(),
      deadline: input.deadline,
      ...(input.eligibility !== undefined
        ? { eligibility: input.eligibility }
        : {}),
    },
  });
  if (!result.ok) return result;
  return ok(rowToBounty(result.value));
}
