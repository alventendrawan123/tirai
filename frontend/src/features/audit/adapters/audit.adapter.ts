import type { Connection } from "@solana/web3.js";
import { scanAuditHistory } from "@tirai/api";
import { safeAdapter } from "@/lib/errors";
import { ensureBufferPolyfill } from "@/lib/polyfills/ensure-buffer";
import type { AppError, AuditHistory, Cluster, Result } from "@/types/api";

export interface ScanAuditAdapterContext {
  connection: Connection;
  cluster: Cluster;
  untilSignature?: string;
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
        ...(ctx.untilSignature !== undefined
          ? { untilSignature: ctx.untilSignature }
          : {}),
      },
    ),
  );
}
