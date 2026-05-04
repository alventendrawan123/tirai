import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  TokenAmount,
} from "@/components/ui";
import { assertNever } from "@/lib/utils";
import { formatAddress, solscanTxUrl } from "@/lib/web3";
import type { AuditPayment, PaymentStatus } from "../types";

export interface AuditPaymentsTableProps {
  payments: ReadonlyArray<AuditPayment>;
}

function statusBadge(status: PaymentStatus) {
  switch (status) {
    case "confirmed":
      return <Badge variant="success">Confirmed</Badge>;
    case "pending":
      return <Badge variant="info">Pending</Badge>;
    case "failed":
      return <Badge variant="danger">Failed</Badge>;
    default:
      return assertNever(status);
  }
}

export function AuditPaymentsTable({ payments }: AuditPaymentsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payments</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-subtle border-y bg-secondary">
              <tr className="text-muted font-mono text-[11px] uppercase tracking-[0.16em]">
                <th className="px-6 py-3 font-normal">Date</th>
                <th className="px-6 py-3 font-normal">Amount</th>
                <th className="px-6 py-3 font-normal">Label</th>
                <th className="px-6 py-3 font-normal">Status</th>
                <th className="px-6 py-3 font-normal">Tx</th>
              </tr>
            </thead>
            <tbody className="divide-border-subtle divide-y">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="text-secondary px-6 py-4 font-mono text-xs">
                    {p.date}
                  </td>
                  <td className="px-6 py-4">
                    <TokenAmount
                      raw={p.amountRaw}
                      decimals={p.decimals}
                      symbol={p.symbol}
                    />
                  </td>
                  <td className="text-primary px-6 py-4">{p.label}</td>
                  <td className="px-6 py-4">{statusBadge(p.status)}</td>
                  <td className="px-6 py-4">
                    <a
                      href={solscanTxUrl(p.txSignature, "devnet")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-secondary hover:text-primary font-mono text-xs underline-offset-2 hover:underline"
                    >
                      {formatAddress(p.txSignature, { head: 6, tail: 4 })}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
