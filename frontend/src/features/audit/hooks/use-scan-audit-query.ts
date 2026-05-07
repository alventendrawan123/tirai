"use client";

import { useConnection } from "@solana/wallet-adapter-react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useCluster } from "@/providers";
import type { AppError, AuditHistory, Result } from "@/types/api";
import { scanAuditAdapter } from "../adapters";
import {
  type CachedAudit,
  mergeEntries,
  readCache,
  summarize,
  writeCache,
} from "../cache";

export interface UseScanAuditQueryOptions {
  viewingKey: string;
  enabled?: boolean;
}

const VIEWING_KEY_LENGTH = 64;

function cacheToHistory(cached: CachedAudit): AuditHistory {
  return {
    entries: cached.entries,
    summary: summarize(cached.entries),
    ...(cached.lastSignature !== undefined
      ? { lastSignature: cached.lastSignature }
      : {}),
  };
}

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
    initialData: () => {
      const cached = readCache(trimmed);
      if (!cached || cached.entries.length === 0) return undefined;
      return { ok: true, value: cacheToHistory(cached) };
    },
    initialDataUpdatedAt: () => {
      const cached = readCache(trimmed);
      if (!cached || cached.entries.length === 0) return 0;
      return 0;
    },
    queryFn: async () => {
      const cached = readCache(trimmed);
      const result = await scanAuditAdapter(trimmed, {
        connection,
        cluster,
        ...(cached?.lastSignature !== undefined
          ? { untilSignature: cached.lastSignature }
          : {}),
      });
      if (!result.ok) {
        if (cached && cached.entries.length > 0) {
          return { ok: true, value: cacheToHistory(cached) };
        }
        return result;
      }
      const merged = mergeEntries(
        result.value.entries,
        cached?.entries ?? [],
      );
      const nextLastSignature =
        result.value.lastSignature ?? cached?.lastSignature;
      const value: AuditHistory = {
        entries: merged,
        summary: summarize(merged),
        ...(nextLastSignature !== undefined
          ? { lastSignature: nextLastSignature }
          : {}),
      };
      writeCache(trimmed, {
        entries: merged,
        ...(nextLastSignature !== undefined
          ? { lastSignature: nextLastSignature }
          : {}),
      });
      return { ok: true, value };
    },
  });
}
