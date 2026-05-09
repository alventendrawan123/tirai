import type { Metadata } from "next";
import { AuditPage } from "@/components/pages/(app)/audit";

export const metadata: Metadata = {
  title: "Audit",
};

export default function Page() {
  return <AuditPage />;
}
