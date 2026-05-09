"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/providers";
import type { AppError, Bounty, BountyStatus, Result } from "@/types/api";
import { updateBountyStatusAdapter } from "../adapters";

interface UpdateBountyStatusInput {
  id: string;
  status: BountyStatus;
  paymentSignature?: string;
}

export function useUpdateBountyStatusMutation() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<Result<Bounty, AppError>, Error, UpdateBountyStatusInput>({
    mutationFn: async ({ id, status, paymentSignature }) => {
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
      return updateBountyStatusAdapter(id, status, paymentSignature, session.jwt);
    },
    onSuccess: (result, variables) => {
      if (result.ok) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.bountyById(variables.id),
        });
        queryClient.invalidateQueries({ queryKey: ["bounties", "list"] });
      }
    },
  });
}
