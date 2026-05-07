"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { useCluster } from "@/providers";
import type {
  AppError,
  BountyPaymentResult,
  ProgressStep,
  Result,
} from "@/types/api";
import { type PayBountyAdapterInput, payBountyAdapter } from "../adapters";

export interface UseBountyMutationResult {
  submit: (
    input: PayBountyAdapterInput,
  ) => Promise<Result<BountyPaymentResult, AppError>>;
  isPending: boolean;
  data?: Result<BountyPaymentResult, AppError>;
  step: ProgressStep | null;
  reset: () => void;
}

export function useBountyMutation(): UseBountyMutationResult {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { cluster } = useCluster();
  const [step, setStep] = useState<ProgressStep | null>(null);

  const handleProgress = useCallback((next: ProgressStep) => {
    setStep(next);
  }, []);

  const mutation = useMutation<
    Result<BountyPaymentResult, AppError>,
    Error,
    PayBountyAdapterInput
  >({
    mutationFn: async (input) => {
      setStep(null);
      return payBountyAdapter(input, {
        connection,
        wallet,
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
