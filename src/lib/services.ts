import type { ServiceKey } from "./types";

export interface ServiceDef {
  key: ServiceKey;
  slug: string;
  navLabel: string;
  title: string;
  subtitle: string;
  populates: string;
  description: string;
  fetchLabel: string;
  tip: string;
  chips: string[];
  hissaRequired: boolean;
  yearRange: boolean;
  summaryPath: string;
}

export const SERVICES: Record<ServiceKey, ServiceDef> = {
  rtc: {
    key: "rtc",
    slug: "trial-centre",
    navLabel: "Trial Centre",
    title: "Trial Centre (RTC / Ownership)",
    subtitle: "Populates Ownership Details",
    populates: "Ownership Details",
    description:
      "Get the current RTC record: owners, extent, ownership category, restrictions and the portal's verification status.",
    fetchLabel: "Fetch Record",
    tip: "Use an accurate survey number for precise results. Leave Hissa blank to see every hissa under the survey.",
    chips: ["Current Owner", "Land Area", "Restrictions", "RTC Details"],
    hissaRequired: false,
    yearRange: false,
    summaryPath: "/trial-centre",
  },
  mutation: {
    key: "mutation",
    slug: "mutation",
    navLabel: "Mutation",
    title: "Mutation (Legal History)",
    subtitle: "Populates Legal History",
    populates: "Legal History",
    description:
      "View every mutation entry recorded against a survey: sale deeds, inheritance, partitions, mortgages and releases.",
    fetchLabel: "Fetch Details",
    tip: "Mutation records may span multiple years. Narrow the range with From / To year if you only need part of the history.",
    chips: ["Mutation Entries", "Sale Deeds", "Inheritance", "Partition"],
    hissaRequired: false,
    yearRange: true,
    summaryPath: "/mutation",
  },
  loan: {
    key: "loan",
    slug: "loan",
    navLabel: "Loan",
    title: "Loan (Financial Charges)",
    subtitle: "Populates Financial Charges",
    populates: "Financial Charges",
    description:
      "Find charges, mortgages and encumbrances recorded against a hissa, and whether each one was later released.",
    fetchLabel: "Fetch Details",
    tip: "Financial charges are linked to the survey number and hissa. Fetching one hissa can take 10 to 30 seconds.",
    chips: ["Loan Details", "Charge Holder", "Encumbrance", "Bank Info"],
    hissaRequired: true,
    yearRange: false,
    summaryPath: "/loan",
  },
};

export const SERVICE_ORDER: ServiceKey[] = ["rtc", "mutation", "loan"];

export function serviceFromSlug(slug: string): ServiceDef | undefined {
  return Object.values(SERVICES).find((s) => s.slug === slug);
}
