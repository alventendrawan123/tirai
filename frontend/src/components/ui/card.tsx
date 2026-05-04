import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("bg-main border-subtle rounded-md border", className)}
      {...rest}
    />
  );
}

export function CardHeader({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col gap-1.5 px-6 pt-6 pb-4", className)}
      {...rest}
    />
  );
}

export function CardTitle({
  className,
  ...rest
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-base font-medium tracking-tight", className)}
      {...rest}
    />
  );
}

export function CardDescription({
  className,
  ...rest
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-secondary text-sm leading-relaxed", className)}
      {...rest}
    />
  );
}

export function CardContent({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-6 pb-6", className)} {...rest} />;
}

export function CardFooter({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "border-subtle flex items-center gap-3 border-t px-6 py-4",
        className,
      )}
      {...rest}
    />
  );
}
