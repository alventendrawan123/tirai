import type { Cluster } from "./api";

export interface ClaimTicketEnvelope {
  v: 1;
  c: Cluster;
  m: string;
  a: string;
  l: string;
  n?: string;
  u: string;
  t: number;
}
