import {
  applyToBounty,
  listApplications,
  updateApplicationStatus,
} from "@tirai/api";
import { tiraiServices } from "@/config";
import { safeAdapter } from "@/lib/errors";
import type {
  AppError,
  Application,
  ApplicationStatus,
  ApplyInput,
  Result,
} from "@/types/api";

export async function listApplicationsAdapter(
  bountyId: string,
): Promise<Result<ReadonlyArray<Application>, AppError>> {
  return safeAdapter(() =>
    listApplications(bountyId, {
      supabaseUrl: tiraiServices.supabaseUrl,
      supabaseAnonKey: tiraiServices.supabaseAnonKey,
    }),
  );
}

export async function applyToBountyAdapter(
  input: ApplyInput,
  jwt: string,
): Promise<Result<Application, AppError>> {
  return safeAdapter(() =>
    applyToBounty(input, {
      authVerifierUrl: tiraiServices.authVerifierUrl,
      jwt,
    }),
  );
}

export async function updateApplicationStatusAdapter(
  applicationId: string,
  status: ApplicationStatus,
  jwt: string,
): Promise<Result<Application, AppError>> {
  return safeAdapter(() =>
    updateApplicationStatus(applicationId, status, {
      authVerifierUrl: tiraiServices.authVerifierUrl,
      jwt,
    }),
  );
}
