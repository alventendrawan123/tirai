import Image from "next/image";
import { cn } from "@/lib/utils";

export interface SolanaIconProps {
  size?: number;
  className?: string;
}

export function SolanaIcon({ size = 14, className }: SolanaIconProps) {
  return (
    <Image
      src="/Assets/Images/Logo/sol-logo.png"
      alt="Solana"
      width={size}
      height={size}
      className={cn("inline-block shrink-0", className)}
      priority={false}
    />
  );
}
