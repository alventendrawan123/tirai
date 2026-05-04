import { cn } from "@/lib/utils";
import { Badge } from "./badge";

export type Cluster = "mainnet" | "devnet" | "localnet";

export interface NetworkBadgeProps {
  cluster: Cluster;
  className?: string;
}

const LABEL: Record<Cluster, string> = {
  mainnet: "Mainnet",
  devnet: "Devnet",
  localnet: "Localnet",
};

export function NetworkBadge({ cluster, className }: NetworkBadgeProps) {
  return (
    <Badge
      variant={cluster === "mainnet" ? "solid" : "outline"}
      className={cn(className)}
    >
      <span
        aria-hidden="true"
        className="inline-block h-1.5 w-1.5 rounded-full bg-current"
      />
      {LABEL[cluster]}
    </Badge>
  );
}
