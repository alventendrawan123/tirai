import { err, ok } from "../lib/result";
import type { Result } from "../types/api";
import type { AppError } from "../types/errors";
import { auditHistoryToCsv } from "./csv";
import { auditHistoryToPdf } from "./pdf";
import type { AuditHistory } from "./scan-audit-history";

export async function exportAuditReport(
  history: AuditHistory,
  format: "pdf" | "csv",
): Promise<Result<Blob, AppError>> {
  try {
    if (format === "csv") {
      const csv = auditHistoryToCsv(history);
      return ok(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    }
    const bytes = await auditHistoryToPdf(history);
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    return ok(new Blob([buffer], { type: "application/pdf" }));
  } catch (error) {
    return err({
      kind: "UNKNOWN",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
