"use client";

import { useAuthServerHealthQuery } from "@/features/auth";
import { cn } from "@/lib/utils";

export interface AuthServerStatusProps {
  className?: string;
}

export function AuthServerStatus({ className }: AuthServerStatusProps) {
  const { data, isLoading, isError } = useAuthServerHealthQuery();

  let label = "API …";
  let dotColor = "bg-tertiary";
  let title = "Checking auth server";

  if (isLoading) {
    label = "API checking…";
    dotColor = "bg-tertiary";
  } else if (isError || !data || !data.ok || data.value.status !== "ok") {
    label = "API down";
    dotColor = "bg-danger";
    title = "Auth server unreachable";
  } else {
    label = "API ok";
    dotColor = "bg-success";
    title = `Auth server OK · ${data.value.challenges} active challenges`;
  }

  return (
    <span
      title={title}
      className={cn(
        "border-subtle text-muted inline-flex items-center gap-2 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em]",
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dotColor)} />
      {label}
    </span>
  );
}
