import { createClient } from "@supabase/supabase-js";
import { err, ok } from "../lib/result";
import type { Result } from "../types/api";
import type { AppError } from "../types/errors";
import { type ApplicationRow, rowToApplication } from "./application-row";
import type {
  Application,
  ApplicationStatus,
  BountyManageContext,
} from "./types";

export async function updateApplicationStatus(
  applicationId: string,
  status: ApplicationStatus,
  ctx: BountyManageContext,
): Promise<Result<Application, AppError>> {
  if (applicationId.length === 0) {
    return err({
      kind: "INVALID_INPUT",
      field: "applicationId",
      message: "Application id required",
    });
  }

  const supabase = createClient(ctx.supabaseUrl, ctx.jwt, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${ctx.jwt}` } },
  });

  const { data, error } = await supabase
    .from("applications")
    .update({ status })
    .eq("id", applicationId)
    .select(
      "id, bounty_id, applicant_wallet, submission_text, contact_handle, status, created_at, updated_at",
    )
    .single();

  if (error) {
    return err({
      kind: "RPC",
      message: `Supabase update failed: ${error.message}`,
      retryable: false,
    });
  }

  return ok(rowToApplication(data as ApplicationRow));
}
