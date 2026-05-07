import { Card, CardContent, TokenAmount } from "@/components/ui";
import type { AuditSummary } from "@/types/api";

export interface AuditSummaryCardsProps {
  summary: AuditSummary;
}

export function AuditSummaryCards({ summary }: AuditSummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card>
        <CardContent className="flex flex-col gap-3 px-6 py-5">
          <p className="text-muted font-mono text-[11px] uppercase tracking-[0.18em]">
            Total payments
          </p>
          <p className="text-primary font-mono text-3xl font-medium tracking-tight tabular-nums">
            {summary.totalPayments}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex flex-col gap-3 px-6 py-5">
          <p className="text-muted font-mono text-[11px] uppercase tracking-[0.18em]">
            Total volume
          </p>
          <TokenAmount
            raw={summary.totalVolumeLamports}
            decimals={9}
            symbol="SOL"
            size="lg"
          />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex flex-col gap-3 px-6 py-5">
          <p className="text-muted font-mono text-[11px] uppercase tracking-[0.18em]">
            Latest activity
          </p>
          <p className="text-primary font-mono text-2xl font-medium tracking-tight">
            {summary.latestActivityAt
              ? new Date(summary.latestActivityAt).toLocaleString()
              : "—"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
