"use client";

import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { resolveBrowserRpcEndpoint } from "@/config";
import { useCluster } from "./cluster-provider";
import "@solana/wallet-adapter-react-ui/styles.css";

export interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const { rpcProxyPath, wsEndpoint } = useCluster();
  const [endpoint, setEndpoint] = useState<string>(() => {
    if (typeof window === "undefined") return "http://localhost";
    return resolveBrowserRpcEndpoint(rpcProxyPath);
  });

  useEffect(() => {
    setEndpoint(resolveBrowserRpcEndpoint(rpcProxyPath));
  }, [rpcProxyPath]);

  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    [],
  );

  const connectionConfig = useMemo(
    () => ({
      commitment: "confirmed" as const,
      wsEndpoint,
      disableRetryOnRateLimit: true,
      fetchMiddleware: (
        info: Parameters<typeof fetch>[0],
        init: Parameters<typeof fetch>[1],
        next: (
          info: Parameters<typeof fetch>[0],
          init: Parameters<typeof fetch>[1],
        ) => void,
      ) => {
        const ac = new AbortController();
        window.setTimeout(() => ac.abort(), 12_000);
        next(info, { ...(init ?? {}), signal: ac.signal });
      },
    }),
    [wsEndpoint],
  );

  return (
    <ConnectionProvider endpoint={endpoint} config={connectionConfig}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
