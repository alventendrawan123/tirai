"use client";

import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/providers";
import type { AppError, AuthSession, Result } from "@/types/api";

export function useSignInMutation() {
  const { signIn } = useAuth();
  return useMutation<Result<AuthSession, AppError>, Error, void>({
    mutationFn: () => signIn(),
  });
}
