import Image from "next/image";
import { cn } from "@/lib/utils";

export interface CloakIconProps {
  size?: number;
  className?: string;
}

export function CloakIcon({ size = 14, className }: CloakIconProps) {
  return (
    <Image
      src="/Assets/Images/Logo/cloak-logo.webp"
      alt="Cloak"
      width={size}
      height={size}
      className={cn("inline-block shrink-0", className)}
      priority={false}
    />
  );
}
