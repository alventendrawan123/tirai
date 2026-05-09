import {
  createBounty,
  getBountyById,
  listBounties,
  updateBountyStatus,
} from "@tirai/api";
import { tiraiServices } from "@/config";
import { safeAdapter } from "@/lib/errors";
import type {
  AppError,
  Bounty,
  BountyStatus,
  CreateBountyInput,
  ListBountiesFilter,
  Result,
} from "@/types/api";

export async function listBountiesAdapter(
  filter: ListBountiesFilter,
): Promise<Result<ReadonlyArray<Bounty>, AppError>> {
  return safeAdapter(() =>
    listBounties(filter, {
      supabaseUrl: tiraiServices.supabaseUrl,
      supabaseAnonKey: tiraiServices.supabaseAnonKey,
    }),
  );
}

export async function getBountyByIdAdapter(
  id: string,
): Promise<Result<Bounty | null, AppError>> {
  return safeAdapter(() =>
    getBountyById(id, {
      supabaseUrl: tiraiServices.supabaseUrl,
      supabaseAnonKey: tiraiServices.supabaseAnonKey,
    }),
  );
}

export async function createBountyAdapter(
  input: CreateBountyInput,
  jwt: string,
): Promise<Result<Bounty, AppError>> {
  return safeAdapter(() =>
    createBounty(input, {
      authVerifierUrl: tiraiServices.authVerifierUrl,
      jwt,
    }),
  );
}

export async function updateBountyStatusAdapter(
  id: string,
  status: BountyStatus,
  paymentSignature: string | undefined,
  jwt: string,
): Promise<Result<Bounty, AppError>> {
  return safeAdapter(() =>
    updateBountyStatus(id, status, paymentSignature, {
      authVerifierUrl: tiraiServices.authVerifierUrl,
      jwt,
    }),
  );
}
