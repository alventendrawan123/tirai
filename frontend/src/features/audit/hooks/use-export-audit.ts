"use client";

import { useMutation } from "@tanstack/react-query";
import type {
  AppError,
  AuditExportFormat,
  AuditHistory,
  Result,
} from "@/types/api";
import { downloadBlob, exportAuditAdapter } from "../adapters";

export interface UseExportAuditInput {
  history: AuditHistory;
  format: AuditExportFormat;
  filename?: string;
}

export interface UseExportAuditResult {
  exportReport: (input: UseExportAuditInput) => Promise<Result<Blob, AppError>>;
  isPending: boolean;
}

export function useExportAudit(): UseExportAuditResult {
  const mutation = useMutation<
    Result<Blob, AppError>,
    Error,
    UseExportAuditInput
  >({
    mutationFn: async ({ history, format, filename }) => {
      const result = await exportAuditAdapter(history, format);
      if (result.ok) {
        const date = new Date().toISOString().slice(0, 10);
        downloadBlob(result.value, filename ?? `tirai-audit-${date}.${format}`);
      }
      return result;
    },
  });

  return {
    exportReport: (input) => mutation.mutateAsync(input),
    isPending: mutation.isPending,
  };
}
