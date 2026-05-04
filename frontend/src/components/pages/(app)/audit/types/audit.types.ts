export type AuditPageState = "empty" | "loaded" | "scanning" | "error";

export type PageSearchParams = Record<string, string | string[] | undefined>;

export interface AuditPageProps {
  searchParams?: PageSearchParams;
}

export type PaymentStatus = "confirmed" | "pending" | "failed";

export interface AuditPayment {
  id: string;
  date: string;
  amountRaw: bigint;
  decimals: number;
  symbol: string;
  label: string;
  status: PaymentStatus;
  txSignature: string;
}

export interface AuditSummary {
  totalPayments: number;
  totalVolumeRaw: bigint;
  totalVolumeDecimals: number;
  totalVolumeSymbol: string;
  latestActivity: string;
}
