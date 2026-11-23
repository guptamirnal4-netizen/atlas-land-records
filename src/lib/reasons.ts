// Plain-language text for the backend's reason codes. Unknown codes are shown
// verbatim rather than guessed at.
const TEXT: Record<string, string> = {
  NONE: "No issues noted",
  LENDER_NOT_STATED_IN_RECORD: "The record states an amount but does not name a lender.",
  COLUMN_ALIGNMENT_AMBIGUOUS: "The source lists several banks or amounts together, so they cannot be safely paired.",
  MULTIPLE_CHARGES_IN_LEDGER: "More than one charge appears in this entry.",
  CHARGE_RELEASE_NOT_MATCHED: "This release could not be matched to a specific charge.",
  RELEASE_MATCH_AMBIGUOUS: "This release refers to more than one charge.",
  SOURCE_PARSE_FAILED: "The portal page was not in the expected format.",
  SESSION_EXPIRED: "The portal session expired during the lookup.",
  PORTAL_UNREACHABLE: "The government portal could not be reached.",
  RTC_REQUEST_FAILED: "The RTC request failed.",
  LOCATION_NOT_FOUND: "One of the location values was not found on the portal.",
  BACKEND_NOT_CONFIGURED: "The data service is not configured on this deployment.",
  BACKEND_UNREACHABLE: "The data service could not be reached.",
  BACKEND_TIMEOUT: "The lookup took too long and was stopped.",
  BACKEND_AUTH_FAILED: "The data service rejected this deployment's credentials.",
  BACKEND_BUSY: "The service is busy with other lookups.",
  BACKEND_ERROR: "The data service returned an error.",
  RATE_LIMITED: "Too many requests in a short time.",
  INVALID_INPUT: "Some search details were not accepted.",
  NETWORK: "Your connection to Atlas was interrupted.",
};

export function reasonText(code: string): string {
  return TEXT[code] ?? code;
}

/** Errors a user can fix by changing the search rather than retrying. */
export function isInputProblem(code: string): boolean {
  return code === "INVALID_INPUT" || code === "LOCATION_NOT_FOUND";
}

export const REASON_TEXT: Readonly<Record<string, string>> = TEXT;
