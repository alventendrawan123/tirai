import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, type = "text", ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        "bg-main text-primary placeholder:text-muted",
        "border-subtle h-11 w-full rounded-md border px-3.5",
        "font-sans text-sm",
        "transition-colors duration-(--duration-fast)",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-strong focus-visible:ring-offset-2 focus-visible:ring-offset-bg-main",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className,
      )}
      {...rest}
    />
  );
});
