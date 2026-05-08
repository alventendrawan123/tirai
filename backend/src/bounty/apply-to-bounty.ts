import { err, ok } from "../lib/result";
import type { Result } from "../types/api";
import type { AppError } from "../types/errors";
import { type ApplicationRow, rowToApplication } from "./application-row";
import { callAuthServer } from "./http-client";
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

  const body: Record<string, unknown> = {
    submissionText: input.submissionText,
  };
  if (input.contactHandle !== undefined) {
    body.contactHandle = input.contactHandle;
  }

  const result = await callAuthServer<ApplicationRow>({
    method: "POST",
    url: `${ctx.authVerifierUrl}/bounties/${input.bountyId}/applications`,
    jwt: ctx.jwt,
    body,
  });
  if (!result.ok) return result;
  return ok(rowToApplication(result.value));
}
