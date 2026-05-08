import { createClient } from "@supabase/supabase-js";
import { extractJwtSub } from "../auth/jwt";
import { err, ok } from "../lib/result";
import type { Result } from "../types/api";
import type { AppError } from "../types/errors";
import { type ApplicationRow, rowToApplication } from "./application-row";
import type { Application, ApplyInput, BountyManageContext } from "./types";

export async function applyToBounty(
  input: ApplyInput,
  ctx: BountyManageContext,
): Promise<Result<Application, AppError>> {
  if (input.bountyId.length === 0) {
    return err({
      kind: "INVALID_INPUT",
      field: "bountyId",
      message: "Bounty id required",
    });
  }
  if (input.submissionText.length === 0 || input.submissionText.length > 5000) {
    return err({
      kind: "INVALID_INPUT",
      field: "submissionText",
      message: "Submission must be 1-5000 characters",
    });
  }

  const applicantWallet = extractJwtSub(ctx.jwt);
  if (applicantWallet === null) {
    return err({
      kind: "INVALID_INPUT",
      field: "jwt",
      message: "JWT does not contain wallet pubkey (sub claim)",
    });
  }

  const supabase = createClient(ctx.supabaseUrl, ctx.jwt, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${ctx.jwt}` } },
  });

  const { data, error } = await supabase
    .from("applications")
    .insert({
      bounty_id: input.bountyId,
      applicant_wallet: applicantWallet,
      submission_text: input.submissionText,
      ...(input.contactHandle !== undefined
        ? { contact_handle: input.contactHandle }
        : {}),
    })
    .select(
      "id, bounty_id, applicant_wallet, submission_text, contact_handle, status, created_at, updated_at",
    )
    .single();

  if (error) {
    return err({
      kind: "RPC",
      message: `Supabase insert failed: ${error.message}`,
      retryable: false,
    });
  }

  return ok(rowToApplication(data as ApplicationRow));
}
