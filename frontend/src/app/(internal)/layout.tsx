import { notFound } from "next/navigation";
import type { ReactNode } from "react";

export default function InternalLayout({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound();
  return <>{children}</>;
}
