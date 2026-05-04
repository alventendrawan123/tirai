import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const containerVariants = cva("mx-auto w-full px-6", {
  variants: {
    size: {
      sm: "max-w-2xl",
      md: "max-w-3xl",
      lg: "max-w-5xl",
      xl: "max-w-6xl",
      full: "max-w-none",
    },
  },
  defaultVariants: {
    size: "lg",
  },
});

export interface ContainerProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof containerVariants> {}

export function Container({ className, size, ...rest }: ContainerProps) {
  return (
    <div className={cn(containerVariants({ size }), className)} {...rest} />
  );
}
