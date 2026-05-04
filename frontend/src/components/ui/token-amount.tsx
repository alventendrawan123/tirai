import { cn } from "@/lib/utils";
import { formatTokenAmount } from "@/lib/web3";

export interface TokenAmountProps {
  raw: bigint;
  decimals: number;
  symbol: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  maximumFractionDigits?: number;
}

const SIZE_STYLES: Record<NonNullable<TokenAmountProps["size"]>, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-2xl",
  xl: "text-4xl md:text-5xl",
};

export function TokenAmount({
  raw,
  decimals,
  symbol,
  size = "md",
  className,
  maximumFractionDigits,
}: TokenAmountProps) {
  const formatted = formatTokenAmount(raw, decimals, { maximumFractionDigits });
  return (
    <span className={cn("inline-flex items-baseline gap-1.5", className)}>
      <span
        className={cn(
          "text-primary font-mono font-medium tracking-tight tabular-nums",
          SIZE_STYLES[size],
        )}
      >
        {formatted}
      </span>
      <span className="text-secondary font-mono text-xs uppercase tracking-[0.16em]">
        {symbol}
      </span>
    </span>
  );
}
