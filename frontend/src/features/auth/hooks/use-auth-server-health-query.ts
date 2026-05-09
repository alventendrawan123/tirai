"use client";

import { useQuery } from "@tanstack/react-query";
import type { AppError, Result } from "@/types/api";
import {
  type AuthServerHealth,
  getAuthServerHealthAdapter,
} from "../adapters/health.adapter";

const HEALTH_QUERY_KEY = ["auth", "health"] as const;

export interface UseAuthServerHealthQueryOptions {
  refetchInterval?: number | false;
  enabled?: boolean;
}

export function useAuthServerHealthQuery(
  options: UseAuthServerHealthQueryOptions = {},
) {
  const { refetchInterval = 60_000, enabled = true } = options;
  return useQuery<Result<AuthServerHealth, AppError>>({
    queryKey: HEALTH_QUERY_KEY,
    enabled,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchInterval,
    refetchOnWindowFocus: false,
    queryFn: () => getAuthServerHealthAdapter(),
  });
}
