import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  TokenAmount,
} from "@/components/ui";
import { formatAddress, solscanTxUrl } from "@/lib/web3";
import type { AuditEntry, Cluster } from "@/types/api";

type AuditStatus = AuditEntry["status"];

const STATUS_LABEL: Record<AuditStatus, string> = {
  deposited: "Deposited",
  claimed: "Claimed",
  expired: "Expired",
};

const STATUS_VARIANT: Record<
  AuditStatus,
  "outline" | "solid" | "success" | "info" | "danger"
> = {
  deposited: "info",
  claimed: "success",
  expired: "outline",
};

export interface AuditPaymentsTableProps {
  entries: ReadonlyArray<AuditEntry>;
  cluster: Cluster;
}

export function AuditPaymentsTable({
  entries,
  cluster,
}: AuditPaymentsTableProps) {
  const explorerCluster = cluster === "mainnet" ? "mainnet" : "devnet";
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payments ({entries.length})</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-subtle border-y bg-secondary">
              <tr className="text-muted font-mono text-[11px] uppercase tracking-[0.16em]">
                <th className="px-6 py-3 font-normal">Date</th>
                <th className="px-6 py-3 font-normal">Amount</th>
                <th className="px-6 py-3 font-normal">Token</th>
                <th className="px-6 py-3 font-normal">Label</th>
                <th className="px-6 py-3 font-normal">Status</th>
                <th className="px-6 py-3 font-normal">Tx</th>
              </tr>
            </thead>
            <tbody className="divide-border-subtle divide-y">
              {entries.map((entry) => (
                <tr key={entry.signature}>
                  <td className="text-secondary px-6 py-4 font-mono text-xs">
                    {new Date(entry.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <TokenAmount
                      raw={entry.amountLamports}
                      decimals={9}
                      symbol="SOL"
                    />
                  </td>
                  <td className="text-secondary px-6 py-4 font-mono text-xs">
                    {entry.tokenMint
                      ? formatAddress(entry.tokenMint, { head: 4, tail: 4 })
                      : "SOL"}
                  </td>
                  <td className="text-primary px-6 py-4">
                    {entry.label && entry.label.length > 0 ? entry.label : "—"}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={STATUS_VARIANT[entry.status]}>
                      {STATUS_LABEL[entry.status]}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <a
                      href={solscanTxUrl(entry.signature, explorerCluster)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-secondary hover:text-primary font-mono text-xs underline-offset-2 hover:underline"
                    >
                      {formatAddress(entry.signature, { head: 6, tail: 4 })}
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
