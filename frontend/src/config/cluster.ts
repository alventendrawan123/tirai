import { clusterApiUrl } from "@solana/web3.js";
import { env } from "./env";

export type Cluster = "mainnet" | "devnet" | "localnet";

export interface ClusterConfig {
  cluster: Cluster;
  rpcUrl: string;
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

export const clusterConfig: ClusterConfig = {
  cluster: env.NEXT_PUBLIC_SOLANA_CLUSTER,
  rpcUrl: env.NEXT_PUBLIC_SOLANA_RPC_URL,
  label: LABELS[env.NEXT_PUBLIC_SOLANA_CLUSTER],
  explorerBase: EXPLORER_BASES[env.NEXT_PUBLIC_SOLANA_CLUSTER],
};

export function defaultRpcFor(cluster: Cluster): string {
  if (cluster === "localnet") return "http://localhost:8899";
  if (cluster === "devnet") return clusterApiUrl("devnet");
  return clusterApiUrl("mainnet-beta");
}
