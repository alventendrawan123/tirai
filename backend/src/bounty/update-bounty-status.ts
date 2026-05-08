import { createClient } from "@supabase/supabase-js";
import { err, ok } from "../lib/result";
import type { Result } from "../types/api";
import type { AppError } from "../types/errors";
import { type BountyRow, rowToBounty } from "./bounty-row";
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

  const supabase = createClient(ctx.supabaseUrl, ctx.jwt, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${ctx.jwt}` } },
  });

  const update: Record<string, string> = { status };
  if (paymentSignature !== undefined) {
    update.payment_signature = paymentSignature;
  }

  const { data, error } = await supabase
    .from("bounties")
    .update(update)
    .eq("id", id)
    .select(
      "id, title, description, reward_lamports, deadline, eligibility, owner_wallet, status, payment_signature, created_at, updated_at",
    )
    .single();

  if (error) {
    return err({
      kind: "RPC",
      message: `Supabase update failed: ${error.message}`,
      retryable: false,
    });
  }

  return ok(rowToBounty(data as BountyRow));
}
