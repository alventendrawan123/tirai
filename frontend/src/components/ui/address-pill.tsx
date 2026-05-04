import { cn } from "@/lib/utils";
import { formatAddress, solscanAddressUrl } from "@/lib/web3";
import { CopyToClipboard } from "./copy-to-clipboard";

export interface AddressPillProps {
  address: string;
  cluster?: "mainnet" | "devnet";
  className?: string;
  withCopy?: boolean;
  withExplorer?: boolean;
}

export function AddressPill({
  address,
  cluster = "mainnet",
  className,
  withCopy = true,
  withExplorer = true,
}: AddressPillProps) {
  return (
    <span
      className={cn(
        "border-subtle bg-secondary inline-flex items-center gap-2 rounded-md border px-2.5 py-1",
        className,
      )}
    >
      <code className="text-primary font-mono text-xs">
        {formatAddress(address)}
      </code>
      {withExplorer ? (
        <a
          href={solscanAddressUrl(address, cluster)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted hover:text-primary text-[10px] underline-offset-2 hover:underline"
        >
          Solscan
        </a>
      ) : null}
      {withCopy ? <CopyToClipboard value={address} label="Copy" /> : null}
    </span>
  );
}
