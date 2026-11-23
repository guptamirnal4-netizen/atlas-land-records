import {
  CATEGORY_LABEL,
  categorizeMutation,
  formatDate,
  formatDateTime,
  parseExtent,
  portalDateToIso,
  titleCase,
  translateTerm,
} from "./format";
import { reasonText } from "./reasons";
import type { LoanEvent, LoanResponse, MutationResponse, PropertyQuery, RtcResponse, ServiceKey } from "./types";

export type Cell = string | number | null;

export interface ExportSection {
  name: string;
  columns: string[];
  rows: Cell[][];
}

export interface ExportModel {
  title: string;
  filenameBase: string;
  meta: [string, string][];
  sections: ExportSection[];
}

export const SOURCE_NOTE =
  "Source: Karnataka Bhoomi land records portal (landrecords.karnataka.gov.in), retrieved live through ATLAS. " +
  "Only information returned by the portal is included; fields the portal did not provide are left blank.";

export function propertyMeta(q: PropertyQuery): [string, string][] {
  const rows: [string, string][] = [
    ["District", titleCase(q.district)],
    ["Taluk", titleCase(q.taluk)],
    ["Hobli", titleCase(q.hobli)],
    ["Village", titleCase(q.village)],
    ["Survey Number", q.survey_number],
  ];
  if (q.hissa_no) rows.push(["Hissa", q.hissa_no]);
  if (q.from_year) rows.push(["From year", String(q.from_year)]);
  if (q.to_year) rows.push(["To year", String(q.to_year)]);
  return rows;
}

function slug(q: PropertyQuery, suffix: string) {
  const village = q.village.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `atlas-${suffix}-${village || "property"}-sy${q.survey_number}${q.hissa_no ? `-h${q.hissa_no}` : ""}`;
}

function baseMeta(title: string, q: PropertyQuery, fetchedAt: string): [string, string][] {
  return [["Report", title], ...propertyMeta(q), ["Retrieved", formatDateTime(fetchedAt)], ["Note", SOURCE_NOTE]];
}

// ---------- RTC ----------

export function buildRtcModel(r: RtcResponse): ExportModel {
  const ok = r.results.filter((h) => h.currentStatus);
  const details: Cell[][] = ok.map((h) => {
    const c = h.currentStatus!;
    return [
      h.hissa_no ?? "",
      c.land_id,
      c.ongoing_mutation,
      c.pyki,
      c.details.surnoc ?? null,
      c.details.period ?? null,
      c.details.year ?? null,
      c.verification?.message ?? null,
      h.statusVerification.verificationRequired ? reasonText(h.statusVerification.reasonCode) : "",
    ];
  });
  const owners: Cell[][] = ok.flatMap((h) =>
    h.currentStatus!.owners.map((o) => {
      const e = parseExtent(o.extent);
      return [
        h.hissa_no ?? "",
        o.name,
        o.extent,
        e ? e.acres : null,
        e ? e.guntas : null,
        e ? e.anas : null,
        o.owner_category,
        o.gov_restriction,
        o.court_stay,
        o.alienated,
      ];
    }),
  );
  return {
    title: "Ownership Report (RTC)",
    filenameBase: slug(r.query, "rtc"),
    meta: baseMeta("Ownership Report (RTC)", r.query, r.fetchedAt),
    sections: [
      {
        name: "RTC Details",
        columns: ["Hissa", "Land ID", "Ongoing mutation", "PYKI", "Surnoc", "Period", "Year", "Portal verification", "Verification note"],
        rows: details,
      },
      {
        name: "Owners",
        columns: ["Hissa", "Owner", "Extent (A.G.A)", "Acres", "Guntas", "Anas", "Owner category", "Govt restriction", "Court stay", "Alienated"],
        rows: owners,
      },
    ],
  };
}

// ---------- Mutation ----------

export function buildMutationModel(r: MutationResponse): ExportModel {
  const rows: Cell[][] = r.records.map((m) => {
    const mt = translateTerm(m.mutationType);
    const at = translateTerm(m.acquisitionType);
    return [
      m.approvedDateIso ? formatDate(m.approvedDateIso) : m.approvedDate || null,
      m.surveyNo,
      m.transactionYear,
      m.transactionNo,
      m.mrNo,
      m.mutationType,
      mt.en,
      m.acquisitionType,
      at.en,
      CATEGORY_LABEL[categorizeMutation(m.acquisitionType, m.mutationType)],
    ];
  });
  return {
    title: "Legal History Report (Mutation)",
    filenameBase: slug(r.query, "mutation"),
    meta: baseMeta("Legal History Report (Mutation)", r.query, r.fetchedAt),
    sections: [
      {
        name: "Mutation Entries",
        columns: [
          "Approved date", "Survey no.", "Transaction year", "Transaction no.", "MR no.",
          "Mutation type (portal)", "Mutation type (English)", "Acquisition type (portal)", "Acquisition type (English)", "Category",
        ],
        rows,
      },
    ],
  };
}

// ---------- Loan ----------

export function eventLabel(e: LoanEvent): string {
  return e.instrumentClass === "charge_creation" ? "Charge created" : e.instrumentClass === "charge_release" ? "Charge released" : "Unclassified entry";
}

export function releaseLabel(e: LoanEvent): string {
  if (e.instrumentClass !== "charge_creation") return "";
  return e.releaseStatus === "released" ? "Released" : "No release found in mutation history";
}

export function buildLoanModel(r: LoanResponse): ExportModel {
  const events: Cell[][] = r.loanHistory.map((e) => [
    e.sequence,
    e.approvedDateRaw,
    e.mrNo,
    eventLabel(e),
    e.mutationType,
    e.acquisitionType,
    releaseLabel(e) || (e.releasedMrNo ? `Releases MR ${e.releasedMrNo}` : ""),
    e.sourceVerification.verificationRequired ? "Yes" : "No",
    e.sourceVerification.verificationRequired ? reasonText(e.sourceVerification.reasonCode) : "",
  ]);
  const charges: Cell[][] = r.loanHistory.flatMap((e) =>
    e.charges.map((c) => [e.sequence, e.mrNo, c.bank, c.bankRaw, c.amount, c.amountRaw, c.bankNameMatchScore]),
  );
  const source: Cell[][] = r.loanHistory.map((e) => [
    e.sequence,
    e.mrNo,
    e.sourceVerification.areaCell || null,
    e.sourceVerification.rawSourceText || null,
    e.sourceVerification.narrativeText || null,
    e.priorMrRefs.join(", ") || null,
  ]);
  return {
    title: "Financial Charges Report (Loan)",
    filenameBase: slug(r.query, "loan"),
    meta: baseMeta("Financial Charges Report (Loan)", r.query, r.fetchedAt),
    sections: [
      {
        name: "Charge Events",
        columns: ["#", "Approved date", "MR no.", "Event", "Mutation type (portal)", "Acquisition type (portal)", "Status", "Needs verification", "Verification note"],
        rows: events,
      },
      {
        name: "Charges",
        columns: ["Event #", "MR no.", "Bank / lender", "As written in record", "Amount (INR)", "Amount as written", "Name match score"],
        rows: charges,
      },
      {
        name: "Encumbrance Source",
        columns: ["Event #", "MR no.", "Affected area", "Source text (verbatim)", "Mutation order narrative", "Referenced MRs"],
        rows: source,
      },
    ],
  };
}

export function buildModel(service: ServiceKey, response: RtcResponse | MutationResponse | LoanResponse): ExportModel {
  if (service === "rtc") return buildRtcModel(response as RtcResponse);
  if (service === "mutation") return buildMutationModel(response as MutationResponse);
  return buildLoanModel(response as LoanResponse);
}

/** Consolidated report: one workbook, every requested service as its own sheets. */
export function mergeModels(query: PropertyQuery, fetchedAt: string, entries: { label: string; model: ExportModel }[]): ExportModel {
  return {
    title: "Property Report",
    filenameBase: slug(query, "property-report"),
    meta: [["Report", "Property Report"], ...propertyMeta(query), ["Retrieved", formatDateTime(fetchedAt)], ["Note", SOURCE_NOTE]],
    sections: entries.flatMap(({ label, model }) => model.sections.map((s) => ({ ...s, name: `${label} - ${s.name}` }))),
  };
}

// ---------- Serialisation ----------

/** Spreadsheet apps execute cells that start with these characters. */
export function neutralize(v: Cell): Cell {
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(v)) return "'" + v;
  return v;
}

function csvCell(v: Cell): string {
  const s = v === null || v === undefined ? "" : String(neutralize(v));
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(model: ExportModel): string {
  const lines: string[] = [];
  for (const [k, v] of model.meta) lines.push([k, v].map(csvCell).join(","));
  for (const s of model.sections) {
    lines.push("");
    lines.push(csvCell(s.name));
    lines.push(s.columns.map(csvCell).join(","));
    for (const row of s.rows) lines.push(row.map(csvCell).join(","));
  }
  return lines.join("\r\n");
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function downloadCsv(model: ExportModel) {
  // BOM so Excel opens Kannada text as UTF-8.
  download(new Blob(["﻿" + toCsv(model)], { type: "text/csv;charset=utf-8" }), `${model.filenameBase}.csv`);
}

function sheetName(name: string, used: Set<string>) {
  let base = name.replace(/[\\/?*[\]:]/g, " ").slice(0, 31).trim() || "Sheet";
  let n = base;
  for (let i = 2; used.has(n.toLowerCase()); i++) n = `${base.slice(0, 28)} ${i}`;
  used.add(n.toLowerCase());
  return n;
}

export async function downloadXlsx(model: ExportModel) {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const used = new Set<string>();
  const header = (v: string) => ({ value: v, fontWeight: "bold" as const, backgroundColor: "#EEF2FF" });
  const cell = (v: Cell) => {
    const n = neutralize(v);
    return n === null || n === "" ? null : n;
  };

  const overview = {
    data: [
      [{ value: model.title, fontWeight: "bold" as const, fontSize: 14 }, null],
      ...model.meta.map(([k, v]) => [{ value: k, fontWeight: "bold" as const }, v]),
    ],
    sheet: sheetName("Overview", used),
    columns: [{ width: 20 }, { width: 100 }],
  };

  const sheets = model.sections.map((s) => ({
    data: [s.columns.map(header), ...s.rows.map((r) => r.map(cell))],
    sheet: sheetName(s.name, used),
    columns: s.columns.map((c, i) => ({
      width: Math.min(60, Math.max(12, c.length + 2, ...s.rows.slice(0, 50).map((r) => String(r[i] ?? "").length + 2))),
    })),
  }));

  const blob = await writeXlsxFile([overview, ...sheets] as never).toBlob();
  download(blob, `${model.filenameBase}.xlsx`);
}

/** Browser print dialog: choose "Save as PDF" to download. Keeps Kannada text correctly shaped. */
export function printReport() {
  const closed = Array.from(document.querySelectorAll<HTMLDetailsElement>("details.disclosure:not(.raw-details):not([open])"));
  closed.forEach((d) => (d.open = true));
  const restore = () => {
    closed.forEach((d) => (d.open = false));
    window.removeEventListener("afterprint", restore);
  };
  window.addEventListener("afterprint", restore);
  window.print();
}

export function dateForSort(raw: string): string {
  return portalDateToIso(raw) ?? "";
}
