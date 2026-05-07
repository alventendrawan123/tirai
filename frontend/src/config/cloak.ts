import { PublicKey } from "@solana/web3.js";
import type { Cluster } from "@/types/api";

export const CLOAK_DEVNET_PROGRAM_ID = new PublicKey(
  "Zc1kHfp4rajSMeASFDwFFgkHRjv7dFQuLheJoQus27h",
);

export const CLOAK_MAINNET_PROGRAM_ID = new PublicKey(
  "zh1eLd6rSphLejbFfJEneUwzHRfMKxgzrgkfwA6qRkW",
);

export function cloakProgramId(cluster: Cluster): PublicKey {
  if (cluster === "mainnet") return CLOAK_MAINNET_PROGRAM_ID;
  return CLOAK_DEVNET_PROGRAM_ID;
}
