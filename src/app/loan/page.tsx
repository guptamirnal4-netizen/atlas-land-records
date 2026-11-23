import { Suspense } from "react";
import type { Metadata } from "next";
import { ServicePage } from "@/components/ServicePage";
import { SERVICES } from "@/lib/services";

export const metadata: Metadata = { title: SERVICES.loan.navLabel };

export default function Page() {
  return (
    <Suspense>
      <ServicePage service="loan" />
    </Suspense>
  );
}
