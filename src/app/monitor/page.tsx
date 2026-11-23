import type { Metadata } from "next";
import { Monitor } from "@/components/Monitor";

export const metadata: Metadata = { title: "Monitor" };

export default function Page() {
  return <Monitor />;
}
