import { Buffer as BufferPolyfill } from "buffer";

interface BrowserBuffer {
  prototype?: { readBigInt64LE?: unknown };
  from?: unknown;
}

let warned = false;

export function ensureBufferPolyfill(): void {
  if (typeof window === "undefined") return;
  const g = globalThis as unknown as { Buffer?: BrowserBuffer };
  const current = g.Buffer;
  const ok = current && typeof current.prototype?.readBigInt64LE === "function";
  if (!ok) {
    (g as unknown as { Buffer: typeof BufferPolyfill }).Buffer = BufferPolyfill;
    if (!warned) {
      warned = true;
      console.warn(
        "[tirai] Buffer polyfill replaced — original lacked readBigInt64LE.",
        {
          before: {
            present: Boolean(current),
            hasReadBigInt64LE:
              typeof current?.prototype?.readBigInt64LE === "function",
            hasFrom: typeof current?.from === "function",
          },
          after: {
            hasReadBigInt64LE:
              typeof BufferPolyfill.prototype.readBigInt64LE === "function",
          },
        },
      );
    }
  }
}
