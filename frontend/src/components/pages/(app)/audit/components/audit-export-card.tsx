"use client";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { useExportAudit } from "@/features/audit";
import { mapTiraiError } from "@/lib/errors";
import type { AuditExportFormat, AuditHistory } from "@/types/api";

export interface AuditExportCardProps {
  history: AuditHistory;
}

export function AuditExportCard({ history }: AuditExportCardProps) {
  const { exportReport, isPending } = useExportAudit();

  const handleExport = async (format: AuditExportFormat) => {
    const result = await exportReport({ history, format });
    if (!result.ok) {
      const mapped = mapTiraiError(result.error);
      window.alert(mapped.message);
    }
  };

  const empty = history.entries.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export report</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-secondary text-sm leading-relaxed">
          Download the current view as PDF or CSV. The export omits destination
          wallets — that is enforced at the API contract.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            variant="primary"
            disabled={isPending || empty}
            onClick={() => handleExport("pdf")}
          >
            {isPending ? "Preparing…" : "Download PDF"}
          </Button>
          <Button
            variant="outline"
            disabled={isPending || empty}
            onClick={() => handleExport("csv")}
          >
            Download CSV
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
