import type { ClaimTicket, Cluster } from "@/types/api";

interface TicketEnvelope {
  v: 1;
  c: Cluster;
  m: string;
  a: string;
  l: string;
  n?: string;
  u: { stub: true };
  k: string;
  t: number;
}

function bigintReplacer(_key: string, value: unknown): unknown {
  return typeof value === "bigint" ? value.toString() : value;
}

function toBase64Url(input: string): string {
  if (typeof window === "undefined") {
    return Buffer.from(input, "utf8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }
  return btoa(unescape(encodeURIComponent(input)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding =
    padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  if (typeof window === "undefined") {
    return Buffer.from(padded + padding, "base64").toString("utf8");
  }
  return decodeURIComponent(escape(atob(padded + padding)));
}

export function encodeTicket(envelope: TicketEnvelope): string {
  const json = JSON.stringify(envelope, bigintReplacer);
  return toBase64Url(json);
}

export function decodeTicket(raw: string): TicketEnvelope {
  const json = fromBase64Url(raw);
  return JSON.parse(json) as TicketEnvelope;
}

export function buildClaimTicket(envelope: TicketEnvelope): ClaimTicket {
  return {
    raw: encodeTicket(envelope),
    version: 1,
    cluster: envelope.c,
    createdAt: envelope.t,
  };
}

export type { TicketEnvelope };
