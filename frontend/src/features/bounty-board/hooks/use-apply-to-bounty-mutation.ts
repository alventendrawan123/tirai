"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/providers";
import type { AppError, Application, ApplyInput, Result } from "@/types/api";
import { applyToBountyAdapter } from "../adapters";

export function useApplyToBountyMutation() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<Result<Application, AppError>, Error, ApplyInput>({
    mutationFn: async (input) => {
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
      return applyToBountyAdapter(input, session.jwt);
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
