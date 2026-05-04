import { AuditPage } from "@/components/pages/(app)/audit";
import type { PageProps } from "@/types";

export default async function Page({ searchParams }: PageProps) {
  return <AuditPage searchParams={await searchParams} />;
}
