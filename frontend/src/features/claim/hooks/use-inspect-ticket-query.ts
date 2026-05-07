"use client";

import { useConnection } from "@solana/wallet-adapter-react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useCluster } from "@/providers";
import type { AppError, ClaimTicketPreview, Result } from "@/types/api";
import { inspectTicketAdapter } from "../adapters";

export interface UseInspectTicketQueryOptions {
  ticketRaw: string;
  enabled?: boolean;
}

export function useInspectTicketQuery({
  ticketRaw,
  enabled = true,
}: UseInspectTicketQueryOptions) {
  const { connection } = useConnection();
  const { cluster } = useCluster();
  const trimmed = ticketRaw.trim();

  return useQuery<Result<ClaimTicketPreview, AppError>>({
    queryKey: queryKeys.inspectTicket(trimmed),
    enabled: enabled && trimmed.length > 0,
    staleTime: 30_000,
    queryFn: () => inspectTicketAdapter(trimmed, { connection, cluster }),
  });
}
