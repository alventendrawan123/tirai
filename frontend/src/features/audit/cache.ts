import type { AuditEntry, AuditHistory } from "@/types/api";

const NAMESPACE = "tirai:audit-cache:";
const SCHEMA_VERSION = 1;

interface PersistedEntry {
  timestamp: number;
  amountLamports: string;
  tokenMint: string | null;
  label: string;
  status: AuditEntry["status"];
  signature: string;
}

interface PersistedShape {
  v: number;
  entries: PersistedEntry[];
  lastSignature?: string;
  updatedAt: number;
}

export interface CachedAudit {
  entries: AuditEntry[];
  lastSignature?: string;
}

function digestVkSync(viewingKey: string): string {
  let h = 0xdeadbeef ^ 0;
  let h2 = 0x41c6ce57 ^ 0;
  for (let i = 0; i < viewingKey.length; i++) {
    const ch = viewingKey.charCodeAt(i);
    h = Math.imul(h ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 = Math.imul(h2 ^ (h >>> 13), 3266489909);
  const hex = (
    (h >>> 0).toString(16).padStart(8, "0") +
    (h2 >>> 0).toString(16).padStart(8, "0")
  );
  return hex;
}

function storageKey(vkDigest: string): string {
  return `${NAMESPACE}${vkDigest}`;
}

function toPersisted(entry: AuditEntry): PersistedEntry {
  return {
    timestamp: entry.timestamp,
    amountLamports: entry.amountLamports.toString(),
    tokenMint: entry.tokenMint,
    label: entry.label,
    status: entry.status,
    signature: entry.signature,
  };
}

function fromPersisted(p: PersistedEntry): AuditEntry {
  return {
    timestamp: p.timestamp,
    amountLamports: BigInt(p.amountLamports),
    tokenMint: p.tokenMint,
    label: p.label,
    status: p.status,
    signature: p.signature,
  };
}

export function readCache(viewingKey: string): CachedAudit | null {
  if (typeof window === "undefined") return null;
  try {
    const digest = digestVkSync(viewingKey);
    const raw = window.localStorage.getItem(storageKey(digest));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedShape;
    if (!parsed || parsed.v !== SCHEMA_VERSION) return null;
    return {
      entries: parsed.entries.map(fromPersisted),
      ...(parsed.lastSignature !== undefined
        ? { lastSignature: parsed.lastSignature }
        : {}),
    };
  } catch {
    return null;
  }
}

export function writeCache(viewingKey: string, audit: CachedAudit): void {
  if (typeof window === "undefined") return;
  try {
    const digest = digestVkSync(viewingKey);
    const payload: PersistedShape = {
      v: SCHEMA_VERSION,
      entries: audit.entries.map(toPersisted),
      ...(audit.lastSignature !== undefined
        ? { lastSignature: audit.lastSignature }
        : {}),
      updatedAt: Date.now(),
    };
    window.localStorage.setItem(storageKey(digest), JSON.stringify(payload));
  } catch {}
}

export function clearCache(viewingKey: string): void {
  if (typeof window === "undefined") return;
  try {
    const digest = digestVkSync(viewingKey);
    window.localStorage.removeItem(storageKey(digest));
  } catch {}
}

export function mergeEntries(
  fresh: ReadonlyArray<AuditEntry>,
  cached: ReadonlyArray<AuditEntry>,
): AuditEntry[] {
  const seen = new Set<string>();
  const out: AuditEntry[] = [];
  for (const e of fresh) {
    if (seen.has(e.signature)) continue;
    seen.add(e.signature);
    out.push(e);
  }
  for (const e of cached) {
    if (seen.has(e.signature)) continue;
    seen.add(e.signature);
    out.push(e);
  }
  out.sort((a, b) => b.timestamp - a.timestamp);
  return out;
}

export function summarize(
  entries: ReadonlyArray<AuditEntry>,
): AuditHistory["summary"] {
  let totalVolumeLamports = 0n;
  let latestActivityAt: number | null = null;
  for (const e of entries) {
    totalVolumeLamports += e.amountLamports;
    if (latestActivityAt === null || e.timestamp > latestActivityAt) {
      latestActivityAt = e.timestamp;
    }
  }
  return {
    totalPayments: entries.length,
    totalVolumeLamports,
    latestActivityAt,
  };
}
