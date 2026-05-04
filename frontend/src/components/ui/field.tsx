import type { HTMLAttributes, LabelHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Field({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-2", className)} {...rest} />;
}

export function FieldLabel({
  className,
  ...rest
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: htmlFor is supplied by callers via rest props
    <label
      className={cn("text-primary text-sm font-medium", className)}
      {...rest}
    />
  );
}

export function FieldHint({
  className,
  ...rest
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-muted text-xs leading-relaxed", className)}
      {...rest}
    />
  );
}

export function FieldError({
  className,
  ...rest
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      role="alert"
      className={cn("text-danger text-xs leading-relaxed", className)}
      {...rest}
    />
  );
}
