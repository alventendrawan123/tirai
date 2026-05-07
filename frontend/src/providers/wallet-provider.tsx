"use client";

import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from "@solana/wallet-adapter-react";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { resolveBrowserRpcEndpoint } from "@/config";
import { useCluster } from "./cluster-provider";

export interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const { rpcProxyPath } = useCluster();
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

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        {children}
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
