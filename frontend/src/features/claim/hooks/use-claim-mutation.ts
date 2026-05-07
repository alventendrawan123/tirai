"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { useCluster } from "@/providers";
import type {
  AppError,
  ClaimBountyResult,
  ProgressStep,
  Result,
} from "@/types/api";
import { claimExistingAdapter, claimFreshAdapter } from "../adapters";

export type ClaimMode = "fresh" | "existing";

export interface UseClaimMutationInput {
  ticket: string;
  mode: ClaimMode;
}

export interface UseClaimMutationResult {
  submit: (
    input: UseClaimMutationInput,
  ) => Promise<Result<ClaimBountyResult, AppError>>;
  isPending: boolean;
  data?: Result<ClaimBountyResult, AppError>;
  step: ProgressStep | null;
  reset: () => void;
}

export function useClaimMutation(): UseClaimMutationResult {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { cluster } = useCluster();
  const [step, setStep] = useState<ProgressStep | null>(null);

  const handleProgress = useCallback((next: ProgressStep) => {
    setStep(next);
  }, []);

  const mutation = useMutation<
    Result<ClaimBountyResult, AppError>,
    Error,
    UseClaimMutationInput
  >({
    mutationFn: async ({ ticket, mode }) => {
      setStep(null);
      if (mode === "fresh") {
        return claimFreshAdapter(ticket, {
          connection,
          cluster,
          onProgress: handleProgress,
        });
      }
      return claimExistingAdapter(ticket, wallet, {
        connection,
        cluster,
        onProgress: handleProgress,
      });
    },
  });

  return {
    submit: (input) => mutation.mutateAsync(input),
    isPending: mutation.isPending,
    data: mutation.data,
    step,
    reset: () => {
      setStep(null);
      mutation.reset();
    },
  };
}
