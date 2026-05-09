import type { Metadata } from "next";
import { PayPage } from "@/components/pages/(app)/pay";

export const metadata: Metadata = {
  title: "Pay",
};

export default function Page() {
  return <PayPage />;
}
