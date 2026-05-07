import type { ProgressStep } from "@/types/api";

export type WalletMode = "fresh" | "existing";

export type PageSearchParams = Record<string, string | string[] | undefined>;

export interface ClaimPageProps {
  searchParams?: PageSearchParams;
}

export type ClaimProgressStep = ProgressStep;
