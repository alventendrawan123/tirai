import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface BentoGridProps {
  children: ReactNode;
  className?: string;
}

export function BentoGrid({ children, className }: BentoGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 md:grid-cols-3 md:grid-rows-2",
        className,
      )}
    >
      {children}
    </div>
  );
}

export type BentoSpan = 1 | 2 | 3;

export interface BentoCardProps {
  eyebrow?: string;
  title: string;
  description: string;
  icon?: ReactNode;
  colSpan?: BentoSpan;
  rowSpan?: 1 | 2;
  className?: string;
  children?: ReactNode;
}

const COL_SPAN: Record<BentoSpan, string> = {
  1: "md:col-span-1",
  2: "md:col-span-2",
  3: "md:col-span-3",
};

const ROW_SPAN: Record<1 | 2, string> = {
  1: "md:row-span-1",
  2: "md:row-span-2",
};

export function BentoCard({
  eyebrow,
  title,
  description,
  icon,
  colSpan = 1,
  rowSpan = 1,
  className,
  children,
}: BentoCardProps) {
  return (
    <article
      className={cn(
        "border-subtle bg-main hover:border-strong group relative flex flex-col gap-4 rounded-md border p-6 transition-colors duration-(--duration-fast)",
        COL_SPAN[colSpan],
        ROW_SPAN[rowSpan],
        className,
      )}
    >
      {icon ? (
        <span className="border-subtle bg-secondary text-primary inline-flex h-9 w-9 items-center justify-center rounded-md border">
          {icon}
        </span>
      ) : null}
      {eyebrow ? (
        <p className="text-muted font-mono text-[10px] tracking-[0.2em] uppercase">
          {eyebrow}
        </p>
      ) : null}
      <div className="flex flex-col gap-2">
        <h3 className="text-primary text-lg font-medium tracking-tight">
          {title}
        </h3>
        <p className="text-secondary text-sm leading-relaxed">{description}</p>
      </div>
      {children}
    </article>
  );
}
