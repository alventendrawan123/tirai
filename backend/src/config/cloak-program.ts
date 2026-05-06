import { CLOAK_PROGRAM_ID } from "@cloak.dev/sdk-devnet";
import { PublicKey } from "@solana/web3.js";
import type { Cluster } from "../types/api";

export { CLOAK_PROGRAM_ID as DEVNET_PROGRAM_ID };

const MAINNET_PROGRAM_ID_B58 = "zh1eLd6rSphLejbFfJEneUwzHRfMKxgzrgkfwA6qRkW";

export function getProgramId(cluster: Cluster): PublicKey {
  if (cluster === "mainnet") {
    return new PublicKey(MAINNET_PROGRAM_ID_B58);
  }
  return CLOAK_PROGRAM_ID;
}
