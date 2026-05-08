import { err, ok } from "../lib/result";
import type { Result } from "../types/api";
import type { AppError } from "../types/errors";
import { type ApplicationRow, rowToApplication } from "./application-row";
import { callAuthServer } from "./http-client";
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

  const result = await callAuthServer<ApplicationRow>({
    method: "PATCH",
    url: `${ctx.authVerifierUrl}/applications/${applicationId}`,
    jwt: ctx.jwt,
    body: { status },
  });
  if (!result.ok) return result;
  return ok(rowToApplication(result.value));
}
