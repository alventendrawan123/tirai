import { createClient } from "@supabase/supabase-js";
import { err, ok } from "../lib/result";
import type { Result } from "../types/api";
import type { AppError } from "../types/errors";
import { type BountyRow, rowToBounty } from "./bounty-row";
import type { Bounty, BountyReadContext } from "./types";

export async function getBountyById(
  id: string,
  ctx: BountyReadContext,
): Promise<Result<Bounty | null, AppError>> {
  if (id.length === 0) {
    return err({
      kind: "INVALID_INPUT",
      field: "id",
      message: "Bounty id required",
    });
  }

  const supabase = createClient(ctx.supabaseUrl, ctx.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from("bounties")
    .select(
      "id, title, description, reward_lamports, deadline, eligibility, owner_wallet, status, payment_signature, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return err({
      kind: "RPC",
      message: `Supabase query failed: ${error.message}`,
      retryable: true,
    });
  }

  if (data === null) return ok(null);
  return ok(rowToBounty(data as BountyRow));
}
