type Level = "debug" | "info" | "warn" | "error";

const SENSITIVE_KEYS = new Set([
  "ticket",
  "ticketRaw",
  "raw",
  "viewingKey",
  "secretKey",
  "destination",
  "recipient",
  "to",
]);

const TICKET_PATTERN = /\btk_[a-z0-9_]+/giu;
const VIEWING_KEY_PATTERN = /\bvk_[a-z0-9_]+/giu;
const HEX_64_PATTERN = /\b[0-9a-f]{64}\b/gu;
const BASE58_ADDRESS_PATTERN = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/gu;

function redactString(input: string): string {
  return input
    .replace(TICKET_PATTERN, "tk_••••")
    .replace(VIEWING_KEY_PATTERN, "vk_••••")
    .replace(HEX_64_PATTERN, "0x••••")
    .replace(BASE58_ADDRESS_PATTERN, "•••address•••");
}

function redactValue(value: unknown): unknown {
  if (value === null) return value;
  if (value instanceof Uint8Array) return "•••bytes•••";
  if (typeof value === "string") return redactString(value);
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(redactValue);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (SENSITIVE_KEYS.has(k)) {
        out[k] = "•••redacted•••";
      } else {
        out[k] = redactValue(v);
      }
    }
    return out;
  }
  return value;
}

export interface LogPayload {
  scope: string;
  message: string;
  data?: unknown;
}

function emit(level: Level, payload: LogPayload): void {
  if (process.env.NODE_ENV === "production") return;
  const safeData =
    payload.data === undefined ? undefined : redactValue(payload.data);
  const args =
    safeData === undefined
      ? [`[${payload.scope}] ${payload.message}`]
      : [`[${payload.scope}] ${payload.message}`, safeData];
  (console[level] as (...a: unknown[]) => void)(...args);
}

export const logger = {
  debug: (payload: LogPayload) => emit("debug", payload),
  info: (payload: LogPayload) => emit("info", payload),
  warn: (payload: LogPayload) => emit("warn", payload),
  error: (payload: LogPayload) => emit("error", payload),
  redact: redactValue,
};
