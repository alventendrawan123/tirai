"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";
import { type ClusterConfig, clusterConfig } from "@/config";

const ClusterContext = createContext<ClusterConfig | null>(null);

export interface ClusterProviderProps {
  value?: ClusterConfig;
  children: ReactNode;
}

export function ClusterProvider({ value, children }: ClusterProviderProps) {
  const resolved = useMemo(() => value ?? clusterConfig, [value]);
  return (
    <ClusterContext.Provider value={resolved}>
      {children}
    </ClusterContext.Provider>
  );
}

export function useCluster(): ClusterConfig {
  const ctx = useContext(ClusterContext);
  if (!ctx) {
    throw new Error("useCluster must be used inside <ClusterProvider>");
  }
  return ctx;
}
