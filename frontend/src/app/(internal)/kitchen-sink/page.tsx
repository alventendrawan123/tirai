import type { Metadata } from "next";
import { KitchenSinkPage } from "@/components/pages/(internal)/kitchen-sink";

export const metadata: Metadata = {
  title: "Kitchen sink",
};

export default function Page() {
  return <KitchenSinkPage />;
}
