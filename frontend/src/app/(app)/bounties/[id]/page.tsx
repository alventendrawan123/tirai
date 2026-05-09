import type { Metadata } from "next";
import { BountyDetailPage } from "@/components/pages/(app)/bounties";

interface Params {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Bounty",
};

export default async function Page({ params }: Params) {
  const { id } = await params;
  return <BountyDetailPage bountyId={id} />;
}
