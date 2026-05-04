import { cva, type VariantProps } from "class-variance-authority";

export const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2",
    "font-sans font-medium whitespace-nowrap",
    "rounded-md border border-transparent",
    "transition-colors duration-(--duration-fast) ease-(--ease-out-soft)",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-strong focus-visible:ring-offset-2 focus-visible:ring-offset-bg-main",
    "disabled:opacity-50 disabled:cursor-not-allowed",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-inverse text-inverse border-strong hover:bg-secondary hover:text-primary",
        secondary: "bg-secondary text-primary border-subtle hover:bg-tertiary",
        outline: "bg-transparent text-primary border-subtle hover:bg-secondary",
        ghost:
          "bg-transparent text-primary border-transparent hover:bg-secondary",
        destructive:
          "bg-transparent text-danger border-subtle hover:bg-secondary",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-11 px-5 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;
