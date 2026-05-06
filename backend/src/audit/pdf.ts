import {
  PDFDocument,
  type PDFFont,
  type PDFPage,
  StandardFonts,
} from "pdf-lib";
import type { AuditHistory } from "./scan-audit-history";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 40;
const TITLE_SIZE = 18;
const SUBTITLE_SIZE = 10;
const HEADER_SIZE = 9;
const ROW_SIZE = 8;
const ROW_HEIGHT = 14;
const HEADER_HEIGHT = 18;

const COLUMNS: ReadonlyArray<{ label: string; width: number }> = [
  { label: "Timestamp (UTC)", width: 130 },
  { label: "Status", width: 60 },
  { label: "Amount (lamports)", width: 100 },
  { label: "Token mint", width: 120 },
  { label: "Signature", width: 105 },
];

function truncate(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, Math.max(0, maxChars - 1))}…`;
}

function drawHeaderRow(page: PDFPage, font: PDFFont, y: number): void {
  let x = MARGIN;
  for (const col of COLUMNS) {
    page.drawText(col.label, { x, y, size: HEADER_SIZE, font });
    x += col.width;
  }
}

function drawEntryRow(
  page: PDFPage,
  font: PDFFont,
  y: number,
  cells: ReadonlyArray<string>,
): void {
  let x = MARGIN;
  for (let i = 0; i < COLUMNS.length; i++) {
    const col = COLUMNS[i];
    const cell = cells[i];
    if (col === undefined || cell === undefined) continue;
    const maxChars = Math.floor(col.width / (ROW_SIZE * 0.55));
    page.drawText(truncate(cell, maxChars), {
      x,
      y,
      size: ROW_SIZE,
      font,
    });
    x += col.width;
  }
}

export async function auditHistoryToPdf(
  history: AuditHistory,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const usableHeight = PAGE_HEIGHT - MARGIN * 2;
  const headerBlockHeight =
    TITLE_SIZE + 4 + SUBTITLE_SIZE * 3 + 8 + HEADER_HEIGHT;
  const rowsPerFirstPage = Math.floor(
    (usableHeight - headerBlockHeight) / ROW_HEIGHT,
  );
  const rowsPerOtherPage = Math.floor(
    (usableHeight - HEADER_HEIGHT) / ROW_HEIGHT,
  );

  const formatRow = (entry: AuditHistory["entries"][number]) => [
    new Date(entry.timestamp).toISOString(),
    entry.status,
    entry.amountLamports.toString(),
    entry.tokenMint ?? "SOL",
    entry.signature,
  ];

  let pageIndex = 0;
  let entryIndex = 0;

  while (entryIndex < history.entries.length || pageIndex === 0) {
    const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN;

    if (pageIndex === 0) {
      page.drawText("Tirai Audit Report", {
        x: MARGIN,
        y: y - TITLE_SIZE,
        size: TITLE_SIZE,
        font: fontBold,
      });
      y -= TITLE_SIZE + 8;

      const generatedAt = new Date().toISOString();
      const summaryLines = [
        `Generated: ${generatedAt}`,
        `Total payments: ${history.summary.totalPayments}`,
        `Total volume (lamports): ${history.summary.totalVolumeLamports}`,
        `Latest activity: ${
          history.summary.latestActivityAt === null
            ? "—"
            : new Date(history.summary.latestActivityAt).toISOString()
        }`,
      ];
      for (const line of summaryLines) {
        page.drawText(line, {
          x: MARGIN,
          y: y - SUBTITLE_SIZE,
          size: SUBTITLE_SIZE,
          font,
        });
        y -= SUBTITLE_SIZE + 2;
      }
      y -= 6;
    }

    drawHeaderRow(page, fontBold, y - HEADER_SIZE);
    y -= HEADER_HEIGHT;

    const rowsForPage = pageIndex === 0 ? rowsPerFirstPage : rowsPerOtherPage;
    const sliceEnd = Math.min(history.entries.length, entryIndex + rowsForPage);
    for (let i = entryIndex; i < sliceEnd; i++) {
      const entry = history.entries[i];
      if (entry === undefined) continue;
      drawEntryRow(page, font, y - ROW_SIZE, formatRow(entry));
      y -= ROW_HEIGHT;
    }
    entryIndex = sliceEnd;
    pageIndex += 1;
    if (history.entries.length === 0) break;
  }

  return doc.save();
}
