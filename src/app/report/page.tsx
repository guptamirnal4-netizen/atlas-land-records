import type { Metadata } from "next";
import { ReportBuilder } from "@/components/ReportBuilder";

export const metadata: Metadata = { title: "Property Report" };

export default function Page() {
  return <ReportBuilder />;
}
