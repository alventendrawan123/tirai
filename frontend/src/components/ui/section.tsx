import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Section({ className, ...rest }: HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn("border-subtle border-b", className)} {...rest} />
  );
}

export function SectionEyebrow({
  className,
  ...rest
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "text-secondary font-mono text-xs uppercase tracking-[0.2em]",
        className,
      )}
      {...rest}
    />
  );
}

export function SectionHeading({
  className,
  ...rest
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        "mt-4 max-w-2xl text-3xl font-medium tracking-tight md:text-4xl",
        className,
      )}
      {...rest}
    />
  );
}

export function SectionLead({
  className,
  ...rest
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "text-secondary mt-4 max-w-2xl text-base leading-relaxed",
        className,
      )}
      {...rest}
    />
  );
}
