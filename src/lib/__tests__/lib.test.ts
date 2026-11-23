import { describe, expect, it } from "vitest";
import { normalizeRtc } from "../normalize";
import { categorizeMutation, formatExtent, parseExtent, portalDateToIso, titleCase, translateTerm } from "../format";
import { buildLoanModel, buildMutationModel, buildRtcModel, mergeModels, neutralize, toCsv } from "../exports";
import type { LoanResponse, MutationResponse, PropertyQuery, RtcHissaResult } from "../types";

const Q: PropertyQuery = { district: "Bagalkote", taluk: "Mudhol", hobli: "LOKAPURA", village: "LOKAPURA", survey_number: "56", hissa_no: "1" };
const T = "2026-11-23T08:00:00Z";

const okHissa = (n: string): RtcHissaResult => ({
  hissa_no: n,
  currentStatus: {
    land_id: "5986 1500 1025", ongoing_mutation: "No", pyki: "No",
    owners: [{ name: "ಕೃಷ್ಣಾ ಭಾಗ್ಯ ಜಲ ನಿಗಮ ನಿಯಮಿತ", extent: "12.21.0", owner_category: "Private", gov_restriction: "No", court_stay: "No", alienated: "No" }],
    verification: { status: "VERIFIED", message: "Blockchain Verified" },
    details: { village: "LOKAPURA", survey_number: "56", surnoc: "*", hissa_no: n, period: "p", year: "2026-2027" },
    sourceUrl: null, fetchedAt: T,
  },
  statusVerification: { verificationRequired: false, reasonCode: "NONE", checkedAt: T, detail: null },
});
const failHissa = (detail: string, reasonCode = "SOURCE_PARSE_FAILED"): RtcHissaResult => ({
  hissa_no: "1", currentStatus: null,
  statusVerification: { verificationRequired: true, reasonCode, checkedAt: T, detail },
});
const raw = (results: RtcHissaResult[]) => ({ success: results.some((r) => r.currentStatus), query: Q, count: results.length, results });

describe("normalizeRtc", () => {
  it("ok when every hissa has data", () => expect(normalizeRtc(raw([okHissa("1")]), T).status).toBe("ok"));
  it("partial when some hissas failed", () => expect(normalizeRtc(raw([okHissa("1"), failHissa("x")]), T).status).toBe("partial"));
  it("a hissa the portal does not list is a definite no_records", () => {
    const r = normalizeRtc(raw([failHissa("Hissa '9' not found among options [('1','1')] for survey '56'")]), T);
    expect(r.status).toBe("no_records");
    expect(r.ambiguous).toBeUndefined();
  });
  it("an empty Surnoc cascade is no_records but flagged ambiguous (portal also does this under load)", () => {
    const r = normalizeRtc(raw([failHissa("No Surnoc options after Go for survey '5'")]), T);
    expect(r.status).toBe("no_records");
    expect(r.ambiguous).toBe(true);
  });
  it("unknown location is an input error, not no_records", () => {
    const r = normalizeRtc(raw([failHissa("Taluk 'X' not found under 'Y'")]), T);
    expect(r.status).toBe("error");
    expect(r.error?.reasonCode).toBe("LOCATION_NOT_FOUND");
  });
  it("portal failures stay errors with their reason code", () => {
    const r = normalizeRtc(raw([failHissa("timeout", "RTC_REQUEST_FAILED")]), T);
    expect(r.status).toBe("error");
    expect(r.error?.reasonCode).toBe("RTC_REQUEST_FAILED");
  });
});

describe("format helpers", () => {
  it("parses A.G.A extents", () => {
    expect(parseExtent("12.21.0")).toEqual({ acres: 12, guntas: 21, anas: 0 });
    expect(parseExtent("5")).toEqual({ acres: 5, guntas: 0, anas: 0 });
    expect(parseExtent("n/a")).toBeNull();
    expect(formatExtent("n/a")).toBe("n/a");
    expect(formatExtent("")).toBe("Not available");
  });
  it("title-cases only all-caps or all-lower names", () => {
    expect(titleCase("BELAGAVI")).toBe("Belagavi");
    expect(titleCase("chitradurga")).toBe("Chitradurga");
    expect(titleCase("Dakshina Kannada")).toBe("Dakshina Kannada");
    expect(titleCase("RABAKAVI BANAHATTI")).toBe("Rabakavi Banahatti");
  });
  it("converts portal dates", () => {
    expect(portalDateToIso("23/02/2004")).toBe("2004-02-23");
    expect(portalDateToIso("garbage")).toBeNull();
  });
  it("translates only known Kannada terms, never guesses", () => {
    expect(translateTerm("ಆಧಾರ/ಭೋಗ್ಯ").en).toBe("Mortgage / Lease");
    expect(translateTerm("ಹಕ್ಕು ಬಿಡುಗಡೆ").en).toBe("Release of rights"); // longer term wins over ಬಿಡುಗಡೆ
    expect(translateTerm("ಅಜ್ಞಾತ")).toEqual({ en: null, category: null });
  });
  it("categorises mutation entries", () => {
    expect(categorizeMutation("ವಿಭಜನೆ", "ಫೋಡಿ")).toBe("partition");
    expect(categorizeMutation("ಬಿಡುಗಡೆ", "ಹಕ್ಕು ಮತ್ತು ಋಣ")).toBe("release");
    expect(categorizeMutation("ಕ್ರಯ", "")).toBe("sale");
    expect(categorizeMutation("ಅಜ್ಞಾತ", "ಅಜ್ಞಾತ")).toBe("other");
  });
});

describe("exports", () => {
  it("neutralises spreadsheet formula injection", () => {
    expect(neutralize("=HYPERLINK(\"x\")")).toBe("'=HYPERLINK(\"x\")");
    expect(neutralize("+1")).toBe("'+1");
    expect(neutralize("safe")).toBe("safe");
    expect(neutralize(12)).toBe(12);
    expect(neutralize(null)).toBeNull();
  });

  it("builds RTC export with parsed extent and leaves unknowns blank", () => {
    const m = buildRtcModel({ ...normalizeRtc(raw([okHissa("1")]), T) });
    const owners = m.sections.find((s) => s.name === "Owners")!;
    expect(owners.rows[0].slice(2, 6)).toEqual(["12.21.0", 12, 21, 0]);
  });

  it("mutation export keeps portal Kannada and adds English only when known", () => {
    const res: MutationResponse = {
      status: "ok", error: null, fetchedAt: T, query: Q, count: 2,
      records: [
        { surveyNo: "56/*/1", hissaNumber: "1", transactionYear: "2003-2004", transactionNo: "25023", mrNo: "3760", mutationType: "ಹಕ್ಕು ಮತ್ತು ಋಣ", acquisitionType: "ಆಧಾರ/ಭೋಗ್ಯ", approvedDate: "23/02/2004", approvedDateIso: "2004-02-23" },
        { surveyNo: "56/*/1", hissaNumber: "1", transactionYear: "x", transactionNo: "1", mrNo: "1", mutationType: "ಅಜ್ಞಾತ", acquisitionType: "ಅಜ್ಞಾತ", approvedDate: "n/a", approvedDateIso: null },
      ],
    };
    const rows = buildMutationModel(res).sections[0].rows;
    expect(rows[0][6]).toBe("Rights & liabilities");
    expect(rows[1][0]).toBe("n/a"); // no invented date
    expect(rows[1][6]).toBeNull();
  });

  it("loan export never turns a missing bank or amount into a value", () => {
    const res: LoanResponse = {
      status: "ok", error: null, fetchedAt: T, query: Q, mutationsChecked: 4, previewsOk: 4, previewsFailed: 0, failures: [],
      loanHistory: [{
        sequence: 1, mrNo: "3760", transactionYear: "2003-2004", transactionNo: "25023", approvedDateRaw: "23/02/2004",
        acquisitionType: "ಆಧಾರ/ಭೋಗ್ಯ", mutationType: "ಹಕ್ಕು ಮತ್ತು ಋಣ", instrumentClass: "charge_creation",
        charges: [{ bank: null, bankRaw: null, amount: 12000, amountRaw: "12,000/-", bankNameMatchScore: null }],
        priorMrRefs: [], releaseStatus: "released",
        sourceVerification: { rawSourceText: "raw", narrativeText: "", candidateBankTokensRaw: [], verificationRequired: true, reasonCode: "LENDER_NOT_STATED_IN_RECORD", partyCellRaw: "", areaCell: "", sourceUrl: null },
      }],
    };
    const m = buildLoanModel(res);
    const charge = m.sections.find((s) => s.name === "Charges")!.rows[0];
    expect(charge[2]).toBeNull(); // bank stays empty
    expect(charge[4]).toBe(12000);
    expect(m.sections[0].rows[0][3]).toBe("Charge created");
    expect(m.sections[0].rows[0][6]).toBe("Released");
  });

  it("CSV quotes commas and includes property identification + retrieval time", () => {
    const csv = toCsv({ title: "t", filenameBase: "f", meta: [["Survey Number", "56"], ["Retrieved", "23 Nov 2026, 08:00 am"]], sections: [{ name: "S", columns: ["a", "b"], rows: [["x,y", "=1+1"]] }] });
    expect(csv).toContain("Survey Number,56");
    expect(csv).toContain("\"x,y\",'=1+1");
  });

  it("merged report prefixes each section with its service and keeps names unique", () => {
    const rtc = buildRtcModel(normalizeRtc(raw([okHissa("1")]), T));
    const merged = mergeModels(Q, T, [{ label: "Trial Centre", model: rtc }, { label: "Mutation", model: rtc }]);
    const names = merged.sections.map((s) => s.name);
    expect(names).toContain("Trial Centre - Owners");
    expect(new Set(names).size).toBe(names.length);
  });
});
