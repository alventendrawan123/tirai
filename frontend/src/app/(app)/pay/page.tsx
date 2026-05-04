import { PayPage } from "@/components/pages/(app)/pay";
import type { PageProps } from "@/types";

export default async function Page({ searchParams }: PageProps) {
  return <PayPage searchParams={await searchParams} />;
}
