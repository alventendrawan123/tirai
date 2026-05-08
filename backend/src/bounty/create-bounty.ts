import { createClient } from "@supabase/supabase-js";
import { extractJwtSub } from "../auth/jwt";
import { err, ok } from "../lib/result";
import type { Result } from "../types/api";
import type { AppError } from "../types/errors";
import { type BountyRow, rowToBounty } from "./bounty-row";
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

  const supabase = createClient(ctx.supabaseUrl, ctx.jwt, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${ctx.jwt}` } },
  });

  const ownerWallet = extractJwtSub(ctx.jwt);
  if (ownerWallet === null) {
    return err({
      kind: "INVALID_INPUT",
      field: "jwt",
      message: "JWT does not contain wallet pubkey (sub claim)",
    });
  }

  const { data, error } = await supabase
    .from("bounties")
    .insert({
      title: input.title,
      description: input.description,
      reward_lamports: input.rewardLamports.toString(),
      deadline: new Date(input.deadline).toISOString(),
      ...(input.eligibility !== undefined
        ? { eligibility: input.eligibility }
        : {}),
      owner_wallet: ownerWallet,
    })
    .select("*")
    .single();

  if (error) {
    return err({
      kind: "RPC",
      message: `Supabase insert failed: ${error.message}`,
      retryable: false,
    });
  }

  return ok(rowToBounty(data as BountyRow));
}
