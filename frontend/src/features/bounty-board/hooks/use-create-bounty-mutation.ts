"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/providers";
import type { AppError, Bounty, CreateBountyInput, Result } from "@/types/api";
import { createBountyAdapter } from "../adapters";

export function useCreateBountyMutation() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<Result<Bounty, AppError>, Error, CreateBountyInput>({
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
      return createBountyAdapter(input, session.jwt);
    },
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: ["bounties", "list"] });
      }
    },
  });
}
