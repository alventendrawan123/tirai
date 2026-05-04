import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { type BadgeVariantProps, badgeVariants } from "./badge.variants";

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    BadgeVariantProps {}

export function Badge({ className, variant, ...rest }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...rest} />
  );
}
