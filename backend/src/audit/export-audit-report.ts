import type { Result } from "../types/api";
import type { AppError } from "../types/errors";
import type { AuditHistory } from "./scan-audit-history";

export async function exportAuditReport(
  _history: AuditHistory,
  _format: "pdf" | "csv",
): Promise<Result<Blob, AppError>> {
  return { ok: false, error: { kind: "UNKNOWN", message: "not implemented" } };
}
