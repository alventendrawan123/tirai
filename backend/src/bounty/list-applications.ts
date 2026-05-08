import { createClient } from "@supabase/supabase-js";
import { err, ok } from "../lib/result";
import type { Result } from "../types/api";
import type { AppError } from "../types/errors";
import { type ApplicationRow, rowToApplication } from "./application-row";
import type { Application, BountyReadContext } from "./types";

export async function listApplications(
  bountyId: string,
  ctx: BountyReadContext,
): Promise<Result<ReadonlyArray<Application>, AppError>> {
  if (bountyId.length === 0) {
    return err({
      kind: "INVALID_INPUT",
      field: "bountyId",
      message: "Bounty id required",
    });
  }

  const supabase = createClient(ctx.supabaseUrl, ctx.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from("applications")
    .select(
      "id, bounty_id, applicant_wallet, submission_text, contact_handle, status, created_at, updated_at",
    )
    .eq("bounty_id", bountyId)
    .order("created_at", { ascending: false });

  if (error) {
    return err({
      kind: "RPC",
      message: `Supabase query failed: ${error.message}`,
      retryable: true,
    });
  }

  const rows = (data ?? []) as ApplicationRow[];
  return ok(rows.map(rowToApplication));
}
