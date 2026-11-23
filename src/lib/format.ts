export function titleCase(s: string): string {
  if (!s) return s;
  if (s !== s.toUpperCase() && s !== s.toLowerCase()) return s;
  return s.toLowerCase().replace(/(^|[\s\-/(])([a-z])/g, (_, a, b) => a + b.toUpperCase());
}

export interface Extent {
  acres: number;
  guntas: number;
  anas: number;
}

/** The portal writes extent as Acres.Guntas.Anas, e.g. "12.21.0". */
export function parseExtent(raw: string | null | undefined): Extent | null {
  const m = /^(\d+)(?:\.(\d+))?(?:\.(\d+))?$/.exec((raw ?? "").trim());
  if (!m) return null;
  return { acres: +m[1], guntas: +(m[2] ?? 0), anas: +(m[3] ?? 0) };
}

export function formatExtent(raw: string | null | undefined): string {
  const e = parseExtent(raw);
  if (!e) return raw?.trim() || "Not available";
  return `${e.acres} ac ${e.guntas} gu ${e.anas} an`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "Date not available";
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function formatInr(amount: number): string {
  return "₹" + amount.toLocaleString("en-IN");
}

/** DD/MM/YYYY (portal format) -> ISO date, or null when unparseable. */
export function portalDateToIso(raw: string | null | undefined): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((raw ?? "").trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

// ---------- Kannada term translation ----------
// Only terms whose meaning is established (seen in live portal data or in the
// existing Bhoomi codebase) are mapped. Anything else is shown in the
// original Kannada - never guessed. Longest terms first.
const TERMS: { kn: string; en: string; category: MutationCategory }[] = [
  { kn: "ಆಧಾರ/ಭೋಗ್ಯ", en: "Mortgage / Lease", category: "mortgage" },
  { kn: "ಹಕ್ಕು ಬಿಡುಗಡೆ", en: "Release of rights", category: "release" },
  { kn: "ಹಕ್ಕು ಮತ್ತು ಋಣ", en: "Rights & liabilities", category: "mortgage" },
  { kn: "ಕೋರ್ಟ್ ಡಿಕ್ರಿ", en: "Court decree", category: "court" },
  { kn: "ಕೋರ್ಟ್ ಆದೇಶ", en: "Court order", category: "court" },
  { kn: "ಭೂ ಸ್ವಾಧೀನ", en: "Land acquisition", category: "acquisition" },
  { kn: "ಪಹಣಿ ಬದಲಾವಣೆ", en: "RTC update", category: "other" },
  { kn: "ಖಾತೆ ಬದಲಾವಣೆ", en: "Khata change", category: "other" },
  { kn: "ತಿಳುವಳಿಕೆ ಚೀಟಿ", en: "Intimation notice", category: "other" },
  { kn: "ಒಟ್ಟುಗೂಡಿಸು", en: "Consolidation", category: "other" },
  { kn: "ಬಿಡುಗಡೆ", en: "Release", category: "release" },
  { kn: "ವಿಭಜನೆ", en: "Partition", category: "partition" },
  { kn: "ವಿಭಾಗ", en: "Partition", category: "partition" },
  { kn: "ವಾರಸಾ", en: "Inheritance", category: "inheritance" },
  { kn: "ವಾರಸು", en: "Inheritance", category: "inheritance" },
  { kn: "ಫೋಡಿ", en: "Podi (sub-division)", category: "partition" },
  { kn: "ಕ್ರಯ", en: "Sale / Purchase", category: "sale" },
  { kn: "ದಾನ", en: "Gift", category: "gift" },
  { kn: "ಆಧಾರ", en: "Mortgage", category: "mortgage" },
  { kn: "ಭೋಗ್ಯ", en: "Lease", category: "mortgage" },
];

export type MutationCategory =
  | "sale"
  | "inheritance"
  | "partition"
  | "mortgage"
  | "release"
  | "gift"
  | "court"
  | "acquisition"
  | "other";

export function translateTerm(kn: string): { en: string | null; category: MutationCategory | null } {
  const text = (kn ?? "").trim();
  const hit = TERMS.find((t) => text === t.kn) ?? TERMS.find((t) => text.includes(t.kn));
  return hit ? { en: hit.en, category: hit.category } : { en: null, category: null };
}

export function categorizeMutation(acquisitionType: string, mutationType: string): MutationCategory {
  return translateTerm(acquisitionType).category ?? translateTerm(mutationType).category ?? "other";
}

export const CATEGORY_LABEL: Record<MutationCategory, string> = {
  sale: "Sale deed",
  inheritance: "Inheritance",
  partition: "Partition",
  mortgage: "Mortgage / charge",
  release: "Release",
  gift: "Gift",
  court: "Court order",
  acquisition: "Acquisition",
  other: "Other legal change",
};
