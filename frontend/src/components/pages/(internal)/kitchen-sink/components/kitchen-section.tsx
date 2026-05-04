import type { ReactNode } from "react";

export interface KitchenSectionProps {
  title: string;
  children: ReactNode;
}

export function KitchenSection({ title, children }: KitchenSectionProps) {
  return (
    <section className="border-subtle border-b py-10">
      <p className="text-secondary font-mono text-xs uppercase tracking-[0.2em]">
        {title}
      </p>
      <div className="mt-6 flex flex-wrap items-start gap-6">{children}</div>
    </section>
  );
}
