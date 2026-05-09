import { ApplyToBountyPage } from "@/components/pages/(app)/bounties";

interface Params {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: Params) {
  const { id } = await params;
  return <ApplyToBountyPage bountyId={id} />;
}
