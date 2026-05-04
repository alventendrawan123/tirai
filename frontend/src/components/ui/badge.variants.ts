import { cva, type VariantProps } from "class-variance-authority";

export const badgeVariants = cva(
  [
    "inline-flex items-center gap-1.5",
    "h-6 px-2",
    "rounded-md border",
    "font-mono text-[11px] uppercase tracking-[0.12em]",
  ],
  {
    variants: {
      variant: {
        default: "bg-secondary text-primary border-subtle",
        outline: "bg-transparent text-secondary border-subtle",
        solid: "bg-inverse text-inverse border-strong",
        success: "bg-transparent text-success border-subtle",
        warning: "bg-transparent text-warning border-subtle",
        danger: "bg-transparent text-danger border-subtle",
        info: "bg-transparent text-info border-subtle",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export type BadgeVariantProps = VariantProps<typeof badgeVariants>;
