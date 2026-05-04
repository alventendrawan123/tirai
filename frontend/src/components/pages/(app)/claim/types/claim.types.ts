export type ClaimPageState =
  | "paste"
  | "inspected"
  | "submitting"
  | "success"
  | "error";

export type WalletMode = "fresh" | "existing";

export type PageSearchParams = Record<string, string | string[] | undefined>;

export interface ClaimPageProps {
  searchParams?: PageSearchParams;
}

export interface ClaimPreview {
  amountRaw: bigint;
  decimals: number;
  symbol: string;
  source: string;
  expiry: string | null;
}

export interface ClaimSuccess {
  destination: string;
  txSignature: string;
  amountRaw: bigint;
  decimals: number;
  symbol: string;
  mode: WalletMode;
  generatedSecret?: string;
}
