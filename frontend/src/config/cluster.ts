import { clusterApiUrl } from "@solana/web3.js";
import { env } from "./env";

export type Cluster = "mainnet" | "devnet" | "localnet";

export interface ClusterConfig {
  cluster: Cluster;
  rpcProxyPath: string;
  wsEndpoint: string;
  label: string;
  explorerBase: string;
}

const EXPLORER_BASES: Record<Cluster, string> = {
  mainnet: "https://solscan.io",
  devnet: "https://solscan.io?cluster=devnet",
  localnet: "https://solscan.io?cluster=custom&customUrl=http://localhost:8899",
};

const LABELS: Record<Cluster, string> = {
  mainnet: "Mainnet",
  devnet: "Devnet",
  localnet: "Localnet",
};

export function defaultWsFor(cluster: Cluster): string {
  if (cluster === "localnet") return "ws://localhost:8900";
  if (cluster === "devnet") return "wss://api.devnet.solana.com";
  return "wss://api.mainnet-beta.solana.com";
}

export const clusterConfig: ClusterConfig = {
  cluster: env.NEXT_PUBLIC_SOLANA_CLUSTER,
  rpcProxyPath: env.NEXT_PUBLIC_RPC_PROXY_PATH,
  wsEndpoint:
    env.NEXT_PUBLIC_SOLANA_WS_URL && env.NEXT_PUBLIC_SOLANA_WS_URL.length > 0
      ? env.NEXT_PUBLIC_SOLANA_WS_URL
      : defaultWsFor(env.NEXT_PUBLIC_SOLANA_CLUSTER),
  label: LABELS[env.NEXT_PUBLIC_SOLANA_CLUSTER],
  explorerBase: EXPLORER_BASES[env.NEXT_PUBLIC_SOLANA_CLUSTER],
};

export function defaultRpcFor(cluster: Cluster): string {
  if (cluster === "localnet") return "http://localhost:8899";
  if (cluster === "devnet") return clusterApiUrl("devnet");
  return clusterApiUrl("mainnet-beta");
}

export function resolveBrowserRpcEndpoint(proxyPath: string): string {
  if (typeof window === "undefined") return proxyPath;
  if (proxyPath.startsWith("http")) return proxyPath;
  return new URL(proxyPath, window.location.origin).toString();
}
