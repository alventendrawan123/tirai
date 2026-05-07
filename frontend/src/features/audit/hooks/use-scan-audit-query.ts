"use client";

import { useConnection } from "@solana/wallet-adapter-react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useCluster } from "@/providers";
import type { AppError, AuditHistory, Result } from "@/types/api";
import { scanAuditAdapter } from "../adapters";

export interface UseScanAuditQueryOptions {
  viewingKey: string;
  enabled?: boolean;
}

const VIEWING_KEY_LENGTH = 64;

export function useScanAuditQuery({
  viewingKey,
  enabled = true,
}: UseScanAuditQueryOptions) {
  const { connection } = useConnection();
  const { cluster } = useCluster();
  const trimmed = viewingKey.trim();

  return useQuery<Result<AuditHistory, AppError>>({
    queryKey: queryKeys.auditHistory(trimmed),
    enabled: enabled && trimmed.length === VIEWING_KEY_LENGTH,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: () => scanAuditAdapter(trimmed, { connection, cluster }),
  });
}
