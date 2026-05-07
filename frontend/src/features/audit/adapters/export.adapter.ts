import { exportAuditReport } from "@tirai/api";
import { safeAdapter } from "@/lib/errors";
import type {
  AppError,
  AuditExportFormat,
  AuditHistory,
  Result,
} from "@/types/api";

export async function exportAuditAdapter(
  history: AuditHistory,
  format: AuditExportFormat,
): Promise<Result<Blob, AppError>> {
  return safeAdapter(() => exportAuditReport(history, format));
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
