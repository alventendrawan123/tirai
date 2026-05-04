"use client";

import type { Cluster } from "@/config";
import { cn } from "@/lib/utils";
import { useCluster } from "@/providers";
import { Badge } from "./badge";

export type { Cluster };

export interface NetworkBadgeProps {
  cluster?: Cluster;
  className?: string;
}

const LABEL: Record<Cluster, string> = {
  mainnet: "Mainnet",
  devnet: "Devnet",
  localnet: "Localnet",
};

export function NetworkBadge({ cluster, className }: NetworkBadgeProps) {
  const ctx = useCluster();
  const active = cluster ?? ctx.cluster;
  return (
    <Badge
      variant={active === "mainnet" ? "solid" : "outline"}
      className={cn(className)}
    >
      <span
        aria-hidden="true"
        className="inline-block h-1.5 w-1.5 rounded-full bg-current"
      />
      {LABEL[active]}
    </Badge>
  );
}
