"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type {
  AppError,
  Bounty,
  ListBountiesFilter,
  Result,
} from "@/types/api";
import { listBountiesAdapter } from "../adapters";

export interface UseBountiesQueryOptions {
  filter?: ListBountiesFilter;
  enabled?: boolean;
}

export function useBountiesQuery({
  filter = {},
  enabled = true,
}: UseBountiesQueryOptions = {}) {
  return useQuery<Result<ReadonlyArray<Bounty>, AppError>>({
    queryKey: queryKeys.bountyList(filter),
    enabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    queryFn: () => listBountiesAdapter(filter),
  });
}
