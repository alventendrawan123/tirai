"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { AppError, Bounty, Result } from "@/types/api";
import { getBountyByIdAdapter } from "../adapters";

export interface UseBountyQueryOptions {
  id: string | null | undefined;
  enabled?: boolean;
}

export function useBountyQuery({ id, enabled = true }: UseBountyQueryOptions) {
  return useQuery<Result<Bounty | null, AppError>>({
    queryKey: queryKeys.bountyById(id ?? ""),
    enabled: enabled && Boolean(id) && (id?.length ?? 0) > 0,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    queryFn: () => {
      if (!id) {
        return Promise.resolve({
          ok: false as const,
          error: {
            kind: "INVALID_INPUT" as const,
            field: "id",
            message: "Bounty id required",
          },
        });
      }
      return getBountyByIdAdapter(id);
    },
  });
}
