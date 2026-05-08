import { createClient } from "@supabase/supabase-js";
import { err, ok } from "../lib/result";
import type { Result } from "../types/api";
import type { AppError } from "../types/errors";
import { type BountyRow, rowToBounty } from "./bounty-row";
import type { Bounty, BountyReadContext, ListBountiesFilter } from "./types";

export async function listBounties(
  filter: ListBountiesFilter,
  ctx: BountyReadContext,
): Promise<Result<ReadonlyArray<Bounty>, AppError>> {
  const supabase = createClient(ctx.supabaseUrl, ctx.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let query = supabase
    .from("bounties")
    .select(
      "id, title, description, reward_lamports, deadline, eligibility, owner_wallet, status, payment_signature, created_at, updated_at",
    )
    .order("created_at", { ascending: false });

  if (filter.status !== undefined) {
    query = query.eq("status", filter.status);
  }
  if (filter.ownerWallet !== undefined) {
    query = query.eq("owner_wallet", filter.ownerWallet);
  }
  if (filter.afterDeadline !== undefined) {
    query = query.gte("deadline", new Date(filter.afterDeadline).toISOString());
  }
  if (filter.limit !== undefined) {
    query = query.limit(filter.limit);
  } else {
    query = query.limit(100);
  }

  const { data, error } = await query;
  if (error) {
    return err({
      kind: "RPC",
      message: `Supabase query failed: ${error.message}`,
      retryable: true,
    });
  }

  const rows = (data ?? []) as BountyRow[];
  return ok(rows.map(rowToBounty));
}
