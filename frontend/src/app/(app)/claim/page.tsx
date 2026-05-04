import { ClaimPage } from "@/components/pages/(app)/claim";
import type { PageProps } from "@/types";

export default async function Page({ searchParams }: PageProps) {
  return <ClaimPage searchParams={await searchParams} />;
}
