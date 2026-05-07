import type { ProgressStep } from "@/types/api";

export type PageSearchParams = Record<string, string | string[] | undefined>;

export interface PayPageProps {
  searchParams?: PageSearchParams;
}

export interface PayFormValues {
  amountSol: string;
  label: string;
  memo: string;
}

export interface PayFormErrors {
  amountSol?: string;
  label?: string;
  memo?: string;
  wallet?: string;
}

export type PayProgressStep = ProgressStep;
