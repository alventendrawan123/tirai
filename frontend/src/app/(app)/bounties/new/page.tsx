import type { Metadata } from "next";
import { NewBountyPage } from "@/components/pages/(app)/bounties";

export const metadata: Metadata = {
  title: "New bounty",
};

export default function Page() {
  return <NewBountyPage />;
}
