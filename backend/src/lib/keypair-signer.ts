import {
  type Keypair,
  type Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import type { Signer } from "../types/api";

export function keypairToSigner(keypair: Keypair): Signer {
  return {
    publicKey: keypair.publicKey,
    async signTransaction<T extends Transaction | VersionedTransaction>(
      tx: T,
    ): Promise<T> {
      if (tx instanceof VersionedTransaction) {
        tx.sign([keypair]);
      } else {
        tx.partialSign(keypair);
      }
      return tx;
    },
  };
}
