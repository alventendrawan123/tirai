export type PayPageState = "idle" | "submitting" | "success" | "error";

export type PageSearchParams = Record<string, string | string[] | undefined>;

export interface PayPageProps {
  searchParams?: PageSearchParams;
}

export interface PaySuccessTicket {
  ticket: string;
  amountRaw: bigint;
  decimals: number;
  symbol: string;
  label: string;
  txSignature: string;
}
