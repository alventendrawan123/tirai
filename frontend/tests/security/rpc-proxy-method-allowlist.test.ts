import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/config", async () => {
  const actual = await vi.importActual<typeof import("@/config")>("@/config");
  return {
    ...actual,
    readServerEnv: () => ({ SOLANA_RPC_URL: "http://localhost:8899" }),
  };
});

import { POST } from "@/app/api/rpc/route";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/rpc", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const fetchSpy = vi.fn(async () => new Response("{}", { status: 200 }));

beforeEach(() => {
  fetchSpy.mockClear();
  globalThis.fetch = fetchSpy as unknown as typeof fetch;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("/api/rpc method allow-list", () => {
  it("rejects disallowed method with JSON-RPC error -32601", async () => {
    const res = await POST(
      makeRequest({ jsonrpc: "2.0", id: 1, method: "requestAirdrop" }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.error.code).toBe(-32601);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("forwards an allowed method to upstream RPC", async () => {
    const res = await POST(
      makeRequest({ jsonrpc: "2.0", id: 2, method: "getLatestBlockhash" }),
    );
    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("rejects bad JSON with 400", async () => {
    const req = new Request("http://localhost:3000/api/rpc", {
      method: "POST",
      body: "not json",
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects batch when one method is disallowed", async () => {
    const res = await POST(
      makeRequest([
        { jsonrpc: "2.0", id: 1, method: "getLatestBlockhash" },
        { jsonrpc: "2.0", id: 2, method: "requestAirdrop" },
      ]),
    );
    const body = await res.json();
    expect(body.error.code).toBe(-32601);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
