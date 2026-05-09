import type { Metadata } from "next";
import { BountiesListPage } from "@/components/pages/(app)/bounties";

export const metadata: Metadata = {
  title: "Bounties",
};

export default function Page() {
  return <BountiesListPage />;
}
