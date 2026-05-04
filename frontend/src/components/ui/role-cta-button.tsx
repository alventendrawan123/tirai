"use client";

import { ArrowUpRight, Eye, Inbox, Send } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { type ButtonVariantProps, buttonVariants } from "./button.variants";
import { Magnet } from "./magnet";

export type RoleCtaIntent = "pay" | "claim" | "audit";

export interface RoleCtaButtonProps {
  href: string;
  intent: RoleCtaIntent;
  label: string;
  hint?: string;
  variant?: ButtonVariantProps["variant"];
  size?: ButtonVariantProps["size"];
  className?: string;
  magnet?: boolean;
}

const INTENT_ICON: Record<RoleCtaIntent, ReactNode> = {
  pay: <Send className="h-4 w-4" aria-hidden="true" strokeWidth={1.5} />,
  claim: <Inbox className="h-4 w-4" aria-hidden="true" strokeWidth={1.5} />,
  audit: <Eye className="h-4 w-4" aria-hidden="true" strokeWidth={1.5} />,
};

const INTENT_KICKER: Record<RoleCtaIntent, string> = {
  pay: "01",
  claim: "02",
  audit: "03",
};

export function RoleCtaButton({
  href,
  intent,
  label,
  hint,
  variant = "primary",
  size = "lg",
  className,
  magnet = true,
}: RoleCtaButtonProps) {
  const inner = (
    <Link
      href={href}
      className={cn(
        buttonVariants({ variant, size }),
        "group relative justify-between gap-4 ps-4 pe-3",
        className,
      )}
      aria-label={hint ? `${label} — ${hint}` : label}
    >
      <span className="inline-flex items-center gap-3">
        <span
          aria-hidden="true"
          className={cn(
            "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors duration-(--duration-fast)",
            variant === "primary"
              ? "border-inverse/30 group-hover:border-strong"
              : "border-subtle group-hover:border-strong",
          )}
        >
          {INTENT_ICON[intent]}
        </span>
        <span className="flex flex-col items-start leading-tight">
          <span className="font-mono text-[10px] tracking-[0.18em] uppercase opacity-60">
            {INTENT_KICKER[intent]} · {intent}
          </span>
          <span className="text-[15px] font-medium">{label}</span>
        </span>
      </span>
      <span
        aria-hidden="true"
        className="ms-2 inline-flex h-7 w-7 items-center justify-center transition-transform duration-(--duration-base) ease-(--ease-out-soft) group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
      >
        <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} />
      </span>
    </Link>
  );

  if (!magnet) return inner;

  return <Magnet magnetStrength={6}>{inner}</Magnet>;
}
