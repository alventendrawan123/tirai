import type {
  AppError,
  AuditContext,
  AuditEntry,
  AuditExportFormat,
  AuditHistory,
  Result,
  ScanAuditInput,
} from "@/types/api";

const STUB_PREFIX = "vk_stub";

const STUB_ENTRIES: ReadonlyArray<AuditEntry> = [
  {
    timestamp: Date.now() - 1000 * 60 * 60 * 26,
    amountLamports: 500_000_000n,
    tokenMint: null,
    label: "Critical bug · Auth bypass",
    status: "claimed",
    signature: "stubAudit_001",
  },
  {
    timestamp: Date.now() - 1000 * 60 * 60 * 8,
    amountLamports: 1_250_000_000n,
    tokenMint: null,
    label: "High · IDOR in admin route",
    status: "claimed",
    signature: "stubAudit_002",
  },
  {
    timestamp: Date.now() - 1000 * 60 * 30,
    amountLamports: 250_000_000n,
    tokenMint: null,
    label: "Medium · Open redirect",
    status: "deposited",
    signature: "stubAudit_003",
  },
];

export async function scanAuditHistory(
  input: ScanAuditInput,
  _ctx: AuditContext,
): Promise<Result<AuditHistory, AppError>> {
  if (!input.viewingKey || !input.viewingKey.startsWith(STUB_PREFIX)) {
    return { ok: false, error: { kind: "VIEWING_KEY_INVALID" } };
  }

  const entries = STUB_ENTRIES;
  const totalVolumeLamports = entries.reduce(
    (sum, e) => sum + e.amountLamports,
    0n,
  );
  const latestActivityAt = entries.reduce<number | null>(
    (max, e) => (max === null || e.timestamp > max ? e.timestamp : max),
    null,
  );

  return {
    ok: true,
    value: {
      entries,
      summary: {
        totalPayments: entries.length,
        totalVolumeLamports,
        latestActivityAt,
      },
    },
  };
}

export async function exportAuditReport(
  history: AuditHistory,
  format: AuditExportFormat,
): Promise<Result<Blob, AppError>> {
  if (format === "csv") {
    return { ok: true, value: buildCsv(history) };
  }
  return { ok: true, value: buildPdfPlaceholder(history) };
}

function buildCsv(history: AuditHistory): Blob {
  const header = "timestamp,amountLamports,tokenMint,label,status,signature\n";
  const rows = history.entries
    .map((e) =>
      [
        new Date(e.timestamp).toISOString(),
        e.amountLamports.toString(),
        e.tokenMint ?? "SOL",
        escapeCsv(e.label),
        e.status,
        e.signature,
      ].join(","),
    )
    .join("\n");
  return new Blob([header + rows], { type: "text/csv" });
}

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildPdfPlaceholder(history: AuditHistory): Blob {
  const text = `Tirai audit report stub\nentries: ${history.entries.length}\ntotal: ${history.summary.totalVolumeLamports.toString()} lamports\n`;
  return new Blob([text], { type: "application/pdf" });
}
