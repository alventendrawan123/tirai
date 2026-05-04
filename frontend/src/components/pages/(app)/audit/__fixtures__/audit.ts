import type { AuditPayment, AuditSummary } from "../types";

export const MOCK_PAYMENTS: ReadonlyArray<AuditPayment> = [
  {
    id: "p_001",
    date: "2026-04-22",
    amountRaw: 500_000_000n,
    decimals: 9,
    symbol: "SOL",
    label: "Whitehat #042",
    status: "confirmed",
    txSignature:
      "5VfYQpW8e3JqB2hM1nL4yX7bP2sUe5gKwHzQfA9LpV0EsXrYjN7iHc4MdQ8oG3vKt2HqA",
  },
  {
    id: "p_002",
    date: "2026-04-30",
    amountRaw: 1_250_000_000n,
    decimals: 9,
    symbol: "SOL",
    label: "Reentrancy report",
    status: "confirmed",
    txSignature:
      "8KqB2hM1nL4yX7bP2sUe5gKwHzQfA9LpV0EsXrYjN7iHc4MdQ8oG3vKt2HqAVfYQpW3",
  },
  {
    id: "p_003",
    date: "2026-05-02",
    amountRaw: 25_000_000n,
    decimals: 6,
    symbol: "USDC",
    label: "Whitehat #051",
    status: "pending",
    txSignature:
      "2QwBN1xPzM7yT4bV2cQ4rHk6mLf8sUp9eJxKwC2nDh3KqB1yX7bP2sUe5gKwHzQfA9L",
  },
];

export const MOCK_SUMMARY: AuditSummary = {
  totalPayments: 3,
  totalVolumeRaw: 1_750_000_000n,
  totalVolumeDecimals: 9,
  totalVolumeSymbol: "SOL",
  latestActivity: "2026-05-02",
};
