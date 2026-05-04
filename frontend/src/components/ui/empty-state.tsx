import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "border-subtle bg-main flex flex-col items-center gap-3 rounded-md border p-10 text-center",
        className,
      )}
    >
      <h3 className="text-base font-medium">{title}</h3>
      {description ? (
        <p className="text-secondary max-w-md text-sm leading-relaxed">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
