import type { Metadata } from "next";
import { ClaimPage } from "@/components/pages/(app)/claim";

export const metadata: Metadata = {
  title: "Claim",
};

export default function Page() {
  return <ClaimPage />;
}
