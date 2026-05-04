import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, rows = 4, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          "bg-main text-primary placeholder:text-muted",
          "border-subtle w-full rounded-md border px-3.5 py-3",
          "font-sans text-sm leading-relaxed",
          "transition-colors duration-(--duration-fast)",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-strong focus-visible:ring-offset-2 focus-visible:ring-offset-bg-main",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "resize-y",
          className,
        )}
        {...rest}
      />
    );
  },
);
