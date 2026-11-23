// Shapes mirror the live backend (bhoomimonitor/api.py + atlas_service.py).
// Nothing here is invented: optional fields are optional because the
// portal does not always provide them.

export type ServiceKey = "rtc" | "mutation" | "loan";

export type Status = "ok" | "no_records" | "partial" | "error";

export interface PropertyQuery {
  district: string;
  taluk: string;
  hobli: string;
  village: string;
  survey_number: string;
  hissa_no?: string;
  from_year?: number;
  to_year?: number;
}

export interface ApiError {
  reasonCode: string;
  detail: string;
}

/** Added by the Atlas proxy layer to every response. */
export interface Envelope {
  status: Status;
  error: ApiError | null;
  fetchedAt: string;
  /** True when "no records" could also be a portal under-response (see normalize.ts). */
  ambiguous?: boolean;
}

// ---------- RTC / Ownership ----------

export interface RtcOwner {
  name: string;
  extent: string;
  owner_category: string;
  gov_restriction: string;
  court_stay: string;
  alienated: string;
}

export interface RtcCurrentStatus {
  land_id: string | null;
  ongoing_mutation: string | null;
  pyki: string | null;
  owners: RtcOwner[];
  verification: { status: string; message: string } | null;
  details: {
    village?: string;
    survey_number?: string;
    surnoc?: string;
    hissa_no?: string;
    period?: string;
    year?: string;
  };
  sourceUrl: string | null;
  fetchedAt: string;
}

export interface StatusVerification {
  verificationRequired: boolean;
  reasonCode: string;
  checkedAt: string;
  detail: string | null;
}

export interface RtcHissaResult {
  hissa_no: string | null;
  currentStatus: RtcCurrentStatus | null;
  statusVerification: StatusVerification;
}

export interface RtcResponse extends Envelope {
  query: PropertyQuery;
  count: number;
  results: RtcHissaResult[];
}

// ---------- Mutation / Legal history ----------

export interface MutationRecord {
  surveyNo: string;
  hissaNumber: string | null;
  transactionYear: string;
  transactionNo: string;
  mrNo: string;
  mutationType: string;
  acquisitionType: string;
  approvedDate: string;
  approvedDateIso: string | null;
}

export interface MutationResponse extends Envelope {
  query: PropertyQuery;
  totalOnPortalForSurvey?: number;
  count: number;
  records: MutationRecord[];
}

// ---------- Loan / Financial charges ----------

export interface LoanCharge {
  bank: string | null;
  bankRaw: string | null;
  amount: number | null;
  amountRaw: string | null;
  bankNameMatchScore: number | null;
}

export interface LoanSourceVerification {
  rawSourceText: string;
  narrativeText: string;
  candidateBankTokensRaw: string[];
  verificationRequired: boolean;
  reasonCode: string;
  partyCellRaw: string;
  areaCell: string;
  sourceUrl: string | null;
}

export interface LoanEvent {
  sequence: number;
  mrNo: string;
  transactionYear: string;
  transactionNo: string;
  approvedDateRaw: string;
  acquisitionType: string;
  mutationType: string;
  instrumentClass: "charge_creation" | "charge_release" | "unknown";
  charges: LoanCharge[];
  priorMrRefs: string[];
  sourceVerification: LoanSourceVerification;
  releaseStatus?: "released" | "unreleased_as_of_crawl";
  releasedMrNo?: string | null;
  releasedTransactionYear?: string | null;
  releasedChargeMatched?: boolean;
}

export interface LoanFailure {
  mrNo: string;
  reasonCode: string;
  detail: string;
}

export interface LoanResponse extends Envelope {
  query: PropertyQuery;
  mutationsChecked: number;
  previewsOk: number;
  previewsFailed: number;
  failures: LoanFailure[];
  loanHistory: LoanEvent[];
}

export type AnyResponse = RtcResponse | MutationResponse | LoanResponse;

export interface OptionsResponse {
  level: string;
  options: string[];
  cached: boolean;
  fetchedAt: string;
}
