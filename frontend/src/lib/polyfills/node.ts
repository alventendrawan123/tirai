import { Buffer as BufferPolyfill } from "buffer";
import processPolyfill from "process";

interface NodeGlobals {
  Buffer?: typeof BufferPolyfill;
  process?: typeof processPolyfill;
  global?: typeof globalThis;
}

if (typeof window !== "undefined" && typeof globalThis !== "undefined") {
  const g = globalThis as unknown as NodeGlobals;
  g.Buffer = BufferPolyfill;
  if (!g.process) g.process = processPolyfill;
  if (!g.global) g.global = globalThis;
}
