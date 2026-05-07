import { NextResponse } from "next/server";
import { readServerEnv } from "@/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_METHODS = new Set([
  "getAccountInfo",
  "getBalance",
  "getBlockHeight",
  "getBlockTime",
  "getEpochInfo",
  "getFeeForMessage",
  "getGenesisHash",
  "getHealth",
  "getLatestBlockhash",
  "getMinimumBalanceForRentExemption",
  "getMultipleAccounts",
  "getProgramAccounts",
  "getRecentPerformanceSamples",
  "getRecentPrioritizationFees",
  "getSignatureStatuses",
  "getSignaturesForAddress",
  "getSlot",
  "getTokenAccountBalance",
  "getTokenAccountsByOwner",
  "getTransaction",
  "getVersion",
  "isBlockhashValid",
  "sendTransaction",
  "simulateTransaction",
]);

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number | string;
  method: string;
  params?: unknown;
}

function isJsonRpcRequest(value: unknown): value is JsonRpcRequest {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v.jsonrpc === "2.0" &&
    (typeof v.id === "string" || typeof v.id === "number") &&
    typeof v.method === "string"
  );
}

function rejectMethod(id: number | string, method: string) {
  return NextResponse.json(
    {
      jsonrpc: "2.0",
      id,
      error: {
        code: -32601,
        message: `Method '${method}' is not allowed by the Tirai RPC proxy.`,
      },
    },
    { status: 200 },
  );
}

const MAX_CONCURRENCY = Number(process.env.RPC_PROXY_CONCURRENCY ?? 16);
const UPSTREAM_TIMEOUT_MS = 8_000;

let inFlight = 0;
const slotWaiters: Array<() => void> = [];

async function acquireSlot(): Promise<void> {
  if (inFlight < MAX_CONCURRENCY) {
    inFlight++;
    return;
  }
  await new Promise<void>((resolve) => {
    slotWaiters.push(resolve);
  });
}

function releaseSlot(): void {
  const next = slotWaiters.shift();
  if (next) {
    next();
    return;
  }
  inFlight--;
}

async function forwardOnce(url: string, body: unknown): Promise<Response> {
  await acquireSlot();
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: ac.signal,
    });
  } finally {
    clearTimeout(timer);
    releaseSlot();
  }
}

export async function POST(request: Request) {
  const { SOLANA_RPC_URL } = readServerEnv();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: -32700, message: "Parse error" } },
      { status: 400 },
    );
  }

  const requests = Array.isArray(body) ? body : [body];
  for (const item of requests) {
    if (!isJsonRpcRequest(item)) {
      return NextResponse.json(
        { error: { code: -32600, message: "Invalid Request" } },
        { status: 400 },
      );
    }
    if (!ALLOWED_METHODS.has(item.method)) {
      return rejectMethod(item.id, item.method);
    }
  }

  let upstream: Response;
  try {
    upstream = await forwardOnce(SOLANA_RPC_URL, body);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: requests[0]?.id ?? null,
        error: {
          code: -32000,
          message: `Upstream request failed: ${message}`,
        },
      },
      { status: 502 },
    );
  }
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "content-type":
        upstream.headers.get("content-type") ?? "application/json",
      "cache-control": "no-store",
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
