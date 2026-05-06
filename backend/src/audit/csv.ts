import type { AuditHistory } from "./scan-audit-history";

const HEADER = [
  "timestamp_iso",
  "status",
  "amount_lamports",
  "token_mint",
  "label",
  "signature",
];

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function auditHistoryToCsv(history: AuditHistory): string {
  const lines: string[] = [HEADER.join(",")];
  for (const entry of history.entries) {
    lines.push(
      [
        new Date(entry.timestamp).toISOString(),
        entry.status,
        entry.amountLamports.toString(),
        entry.tokenMint ?? "",
        entry.label,
        entry.signature,
      ]
        .map(escapeCsv)
        .join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}
