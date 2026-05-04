import type { ReactNode } from "react";
import { PageShell } from "@/components/layout";

export default function AppGroupLayout({ children }: { children: ReactNode }) {
  return <PageShell>{children}</PageShell>;
}
