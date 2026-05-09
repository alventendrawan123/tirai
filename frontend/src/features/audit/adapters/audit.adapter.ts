import type { Connection } from "@solana/web3.js";
import { scanAuditHistory } from "@tirai/api";
import { tiraiServices } from "@/config";
import { safeAdapter } from "@/lib/errors";
import { ensureBufferPolyfill } from "@/lib/polyfills/ensure-buffer";
import type { AppError, AuditHistory, Cluster, Result } from "@/types/api";

export interface ScanAuditAdapterContext {
  connection: Connection;
  cluster: Cluster;
  untilSignature?: string;
  afterTimestamp?: number;
  onProgress?: (processed: number, total: number) => void;
  onStatus?: (status: string) => void;
}

export async function scanAuditAdapter(
  viewingKey: string,
  ctx: ScanAuditAdapterContext,
): Promise<Result<AuditHistory, AppError>> {
  ensureBufferPolyfill();
  return safeAdapter(() =>
    scanAuditHistory(
      { viewingKey },
      {
        connection: ctx.connection,
        cluster: ctx.cluster,
        supabaseUrl: tiraiServices.supabaseUrl,
        supabaseAnonKey: tiraiServices.supabaseAnonKey,
        ...(ctx.untilSignature !== undefined
          ? { untilSignature: ctx.untilSignature }
          : {}),
        ...(ctx.afterTimestamp !== undefined
          ? { afterTimestamp: ctx.afterTimestamp }
          : {}),
        ...(ctx.onProgress !== undefined ? { onProgress: ctx.onProgress } : {}),
        ...(ctx.onStatus !== undefined ? { onStatus: ctx.onStatus } : {}),
      },
    ),
  );
}
