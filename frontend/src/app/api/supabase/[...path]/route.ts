import { NextResponse } from "next/server";
import { readServerEnv } from "@/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOP_HEADERS = new Set([
  "host",
  "connection",
  "content-length",
  "transfer-encoding",
  "keep-alive",
  "upgrade",
  "te",
  "trailer",
  "proxy-authorization",
  "proxy-authenticate",
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-real-ip",
]);

const ENCODING_HEADERS = new Set([
  "content-encoding",
  "content-length",
  "transfer-encoding",
]);

function buildHeaders(request: Request, anonKey: string): Headers {
  const headers = new Headers();
  for (const [key, value] of request.headers) {
    const lower = key.toLowerCase();
    if (HOP_HEADERS.has(lower)) continue;
    if (lower === "apikey" || lower === "authorization") continue;
    if (lower === "accept-encoding") continue;
    headers.set(key, value);
  }
  headers.set("apikey", anonKey);
  headers.set("authorization", `Bearer ${anonKey}`);
  headers.set("accept-encoding", "identity");
  return headers;
}

async function proxy(
  request: Request,
  ctx: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = readServerEnv();
  const { path } = await ctx.params;
  const url = new URL(request.url);
  const targetUrl = `${SUPABASE_URL.replace(/\/$/, "")}/${path.join("/")}${url.search}`;

  const init: RequestInit = {
    method: request.method,
    headers: buildHeaders(request, SUPABASE_ANON_KEY),
    cache: "no-store",
    redirect: "manual",
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, init);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Upstream Supabase unreachable: ${message}` },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers();
  for (const [key, value] of upstream.headers) {
    const lower = key.toLowerCase();
    if (HOP_HEADERS.has(lower)) continue;
    if (ENCODING_HEADERS.has(lower)) continue;
    responseHeaders.set(key, value);
  }
  responseHeaders.set("cache-control", "no-store");

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
