"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/providers";
import type {
  AppError,
  Application,
  ApplicationStatus,
  Result,
} from "@/types/api";
import { updateApplicationStatusAdapter } from "../adapters";

interface UpdateApplicationStatusInput {
  applicationId: string;
  bountyId: string;
  status: ApplicationStatus;
}

export function useUpdateApplicationStatusMutation() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<
    Result<Application, AppError>,
    Error,
    UpdateApplicationStatusInput
  >({
    mutationFn: async ({ applicationId, status }) => {
      if (!session) {
        return {
          ok: false,
          error: {
            kind: "INVALID_INPUT",
            field: "auth",
            message: "Sign in with your wallet first",
          },
        };
      }
      return updateApplicationStatusAdapter(
        applicationId,
        status,
        session.jwt,
      );
    },
    onSuccess: (result, variables) => {
      if (result.ok) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.applications(variables.bountyId),
        });
      }
    },
  });
}
