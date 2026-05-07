import type { WalletContextState } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { vi } from "vitest";

export const STUB_PUBKEY = new PublicKey("11111111111111111111111111111112");

export interface MockWalletOptions {
  publicKey?: PublicKey | null;
  connected?: boolean;
  connecting?: boolean;
}

export function makeMockWallet(
  opts: MockWalletOptions = {},
): WalletContextState {
  const publicKey =
    opts.publicKey === null ? null : (opts.publicKey ?? STUB_PUBKEY);
  const connected = opts.connected ?? Boolean(publicKey);
  return {
    autoConnect: false,
    wallets: [],
    wallet: null,
    publicKey,
    connecting: opts.connecting ?? false,
    connected,
    disconnecting: false,
    select: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    sendTransaction: vi.fn(),
    signTransaction: publicKey ? (vi.fn(async (tx) => tx) as never) : undefined,
    signAllTransactions: publicKey
      ? (vi.fn(async (txs) => txs) as never)
      : undefined,
    signMessage: publicKey ? (vi.fn(async (msg) => msg) as never) : undefined,
    signIn: undefined,
  } as unknown as WalletContextState;
}

export const STUB_PUBKEY_BASE58 = STUB_PUBKEY.toBase58();
