// Browser-safe JWT payload extractor. Does NOT verify signature
// (server side does that via RLS). We only use this client-side to
// pull `sub` claim so we can set owner_wallet field consistently.

export function extractJwtSub(jwt: string): string | null {
  const parts = jwt.split(".");
  if (parts.length !== 3) return null;
  const payloadB64 = (parts[1] ?? "").replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (payloadB64.length % 4)) % 4);
  try {
    const json = atob(payloadB64 + padding);
    const payload = JSON.parse(json) as Record<string, unknown>;
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export function extractJwtExp(jwt: string): number | null {
  const parts = jwt.split(".");
  if (parts.length !== 3) return null;
  const payloadB64 = (parts[1] ?? "").replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (payloadB64.length % 4)) % 4);
  try {
    const json = atob(payloadB64 + padding);
    const payload = JSON.parse(json) as Record<string, unknown>;
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}
