"use client";

import type { ReactNode } from "react";
import { ClusterProvider } from "./cluster-provider";
import { QueryProvider } from "./query-provider";
import { ThemeProvider } from "./theme-provider";
import { ToastProvider } from "./toast-provider";
import { WalletProvider } from "./wallet-provider";

export interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider>
      <ClusterProvider>
        <QueryProvider>
          <WalletProvider>
            {children}
            <ToastProvider />
          </WalletProvider>
        </QueryProvider>
      </ClusterProvider>
    </ThemeProvider>
  );
}
