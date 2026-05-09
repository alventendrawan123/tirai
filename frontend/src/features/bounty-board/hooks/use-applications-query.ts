"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { AppError, Application, Result } from "@/types/api";
import { listApplicationsAdapter } from "../adapters";

export interface UseApplicationsQueryOptions {
  bountyId: string | null | undefined;
  enabled?: boolean;
}

export function useApplicationsQuery({
  bountyId,
  enabled = true,
}: UseApplicationsQueryOptions) {
  return useQuery<Result<ReadonlyArray<Application>, AppError>>({
    queryKey: queryKeys.applications(bountyId ?? ""),
    enabled: enabled && Boolean(bountyId) && (bountyId?.length ?? 0) > 0,
    staleTime: 15 * 1000,
    gcTime: 5 * 60 * 1000,
    queryFn: () => {
      if (!bountyId) {
        return Promise.resolve({
          ok: false as const,
          error: {
            kind: "INVALID_INPUT" as const,
            field: "bountyId",
            message: "Bounty id required",
          },
        });
      }
      return listApplicationsAdapter(bountyId);
    },
  });
}
