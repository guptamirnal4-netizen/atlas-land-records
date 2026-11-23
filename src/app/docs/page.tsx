import type { Metadata } from "next";
import { CopyPre } from "@/components/CopyPre";
import { REASON_TEXT } from "@/lib/reasons";

export const metadata: Metadata = { title: "API Documentation" };

const TOC = [
  ["overview", "Overview"],
  ["flow", "Request flow"],
  ["endpoints", "Endpoints"],
  ["envelope", "Response envelope"],
  ["rtc", "RTC response"],
  ["mutation", "Mutation response"],
  ["loan", "Loan response"],
  ["status", "Status values"],
  ["errors", "Reason codes"],
  ["http", "HTTP status codes"],
  ["timing", "Timing"],
  ["curl", "Examples"],
  ["notes", "Notes"],
] as const;

const Q = "district=Bagalkote&taluk=Mudhol&hobli=LOKAPURA&village=LOKAPURA&survey_number=56";

const ENVELOPE = `{
  "status": "ok",            // ok | no_records | partial | error
  "error": null,             // { "reasonCode": "...", "detail": "..." } when status is "error"
  "fetchedAt": "2026-11-23T08:17:59.264Z",
  "ambiguous": false,        // RTC only: true when "no_records" may be a portal under-response
  "query": { "district": "Bagalkote", "taluk": "Mudhol", "hobli": "LOKAPURA",
             "village": "LOKAPURA", "survey_number": "56", "hissa_no": "1" }
}`;

const RTC = `{
  "status": "ok",
  "error": null,
  "fetchedAt": "2026-11-23T08:17:59.264Z",
  "query": { "district": "Bagalkote", "taluk": "Mudhol", "hobli": "LOKAPURA",
             "village": "LOKAPURA", "survey_number": "56", "hissa_no": "1" },
  "count": 1,
  "results": [
    {
      "hissa_no": "1",
      "currentStatus": {
        "land_id": "5986 1500 1025",
        "ongoing_mutation": "No",
        "pyki": "No",
        "owners": [
          { "name": "ಕೃಷ್ಣಾ ಭಾಗ್ಯ ಜಲ ನಿಗಮ ನಿಯಮಿತ", "extent": "12.21.0",
            "owner_category": "Private", "gov_restriction": "No",
            "court_stay": "No", "alienated": "No" }
        ],
        "verification": { "status": "VERIFIED",
                          "message": "RTC Documents you view here, are Blockchain Verified now" },
        "details": { "village": "LOKAPURA", "survey_number": "56", "surnoc": "*",
                     "hissa_no": "1", "period": "2017-08-20 12:20:00 To Till Date (2026-2027)",
                     "year": "2026-2027" },
        "sourceUrl": "https://landrecords.karnataka.gov.in/Service2/",
        "fetchedAt": "2026-11-23T08:17:59.264Z"
      },
      "statusVerification": { "verificationRequired": false, "reasonCode": "NONE",
                              "checkedAt": "2026-11-23T08:17:59.264Z", "detail": null }
    }
  ]
}`;

const MUTATION = `{
  "status": "ok",
  "error": null,
  "fetchedAt": "2026-11-23T08:19:50.100Z",
  "query": { "district": "Bagalkote", "taluk": "Mudhol", "hobli": "LOKAPURA",
             "village": "LOKAPURA", "survey_number": "56", "hissa_no": "1" },
  "totalOnPortalForSurvey": 9,
  "count": 1,
  "records": [
    {
      "surveyNo": "56/*/1",
      "hissaNumber": "1",
      "transactionYear": "2003-2004",
      "transactionNo": "25023",
      "mrNo": "3760",
      "mutationType": "ಹಕ್ಕು ಮತ್ತು ಋಣ",
      "acquisitionType": "ಆಧಾರ/ಭೋಗ್ಯ",
      "approvedDate": "23/02/2004",
      "approvedDateIso": "2004-02-23"
    }
  ]
}`;

const LOAN = `{
  "status": "ok",
  "error": null,
  "fetchedAt": "2026-11-23T08:20:10.500Z",
  "query": { "district": "Bagalkote", "taluk": "Mudhol", "hobli": "LOKAPURA",
             "village": "LOKAPURA", "survey_number": "56", "hissa_no": "1" },
  "mutationsChecked": 4,
  "previewsOk": 4,
  "previewsFailed": 0,
  "failures": [],
  "loanHistory": [
    {
      "sequence": 1,
      "mrNo": "3760",
      "transactionYear": "2003-2004",
      "transactionNo": "25023",
      "approvedDateRaw": "23/02/2004",
      "instrumentClass": "charge_creation",
      "releaseStatus": "released",
      "charges": [
        { "bank": null, "bankRaw": null, "amount": 12000,
          "amountRaw": "12,000/-", "bankNameMatchScore": null }
      ],
      "priorMrRefs": [],
      "sourceVerification": {
        "verificationRequired": true,
        "reasonCode": "LENDER_NOT_STATED_IN_RECORD",
        "rawSourceText": "(verbatim text from the portal's preview page)"
      }
    },
    {
      "sequence": 2,
      "mrNo": "120",
      "approvedDateRaw": "29/02/2016",
      "instrumentClass": "charge_release",
      "releasedMrNo": "3760",
      "releasedChargeMatched": true,
      "charges": [],
      "priorMrRefs": ["MR 3760/2003-2004"]
    }
  ]
}`;

const ERROR_EX = `{
  "status": "error",
  "error": {
    "reasonCode": "BACKEND_TIMEOUT",
    "detail": "The government portal took too long to respond. Please try again."
  },
  "fetchedAt": "2026-11-23T08:21:00.000Z"
}`;

const CURL = `# Replace HOST with your Atlas deployment. No API key is needed here: the key lives on the server.
HOST=https://your-atlas-deployment.vercel.app

# 1. Dropdown values (cascading)
curl "$HOST/api/options?level=district"
curl "$HOST/api/options?level=taluk&district=Bagalkote"
curl "$HOST/api/options?level=hissa&${Q}"

# 2. Ownership (RTC) - hissa_no optional
curl "$HOST/api/rtc?${Q}&hissa_no=1"

# 3. Legal history (Mutation) - hissa_no, from_year, to_year optional
curl "$HOST/api/mutation?${Q}&from_year=2005"

# 4. Financial charges (Loan) - hissa_no required
curl "$HOST/api/loan?${Q}&hissa_no=1"`;

const ENDPOINTS = [
  { path: "/api/options", req: "level (district | taluk | hobli | village | hissa) plus the parents it needs", opt: "-", note: "taluk needs district; hobli needs district, taluk; village needs district, taluk, hobli; hissa also needs village and survey_number. Lists are cached 6 hours (hissa is always live)." },
  { path: "/api/rtc", req: "district, taluk, hobli, village, survey_number", opt: "hissa_no", note: "Omit hissa_no to get every hissa under the survey (slower: one portal round trip per hissa)." },
  { path: "/api/mutation", req: "district, taluk, hobli, village, survey_number", opt: "hissa_no, from_year, to_year", note: "Years filter on the approved date, inclusive. Entries without a parseable date are always kept." },
  { path: "/api/loan", req: "district, taluk, hobli, village, survey_number, hissa_no", opt: "-", note: "hissa_no is required because every mutation entry costs several portal round trips." },
];

const STATUS = [
  { s: "ok", m: "The lookup completed and records were returned.", u: "Show the data." },
  { s: "partial", m: "Some data was returned but part of it failed (for example one hissa, or some loan previews).", u: "Show the data and the warning; the missing part is not 'empty', it is unknown." },
  { s: "no_records", m: "The lookup completed and the portal has nothing for these details.", u: "A valid answer. For RTC, ambiguous=true means the portal's empty answer can also occur under load, so offer a retry." },
  { s: "error", m: "The lookup could not be completed (portal, network, timeout or invalid input).", u: "Never treat as 'no records'. Show error.reasonCode and detail." },
];

const HTTP = [
  ["200", "The lookup ran. Check status: portal-level failures arrive here with status 'error'."],
  ["422", "Invalid input: a missing required field, a non-numeric survey number, or a value the data service rejected."],
  ["429", "Rate limited by Atlas, or the data service is busy with other portal sessions. Retry after a few seconds."],
  ["502", "The data service could not be reached, rejected its credentials, or returned an error."],
  ["503", "The deployment is missing its data service configuration."],
  ["504", "The lookup exceeded the time limit (about 55 seconds)."],
];

const TIMING = [
  ["Options (dropdowns)", "About 1-2 s, instant when cached", "Cached for 6 hours except hissa"],
  ["RTC", "About 4 s per request", "More with several hissas (one portal round trip each)"],
  ["Mutation", "About 2 s", "One grid fetch, independent of the number of entries"],
  ["Loan", "About 3-30 s", "Depends on how many mutation entries the hissa has"],
];

export default function DocsPage() {
  return (
    <div className="doc-layout">
      <nav className="doc-toc" aria-label="On this page">
        <strong className="small muted" style={{ padding: "0 10px 6px" }}>ON THIS PAGE</strong>
        {TOC.map(([id, label]) => (
          <a key={id} href={`#${id}`}>{label}</a>
        ))}
      </nav>

      <div className="doc-body">
        <section id="overview">
          <h1 className="page-title" style={{ marginBottom: 8 }}>API Documentation</h1>
          <p>
            Atlas exposes four read-only <code className="doc-inline">GET</code> routes. They are the same routes the
            portal screens use. Every response is JSON and every response carries a <code className="doc-inline">status</code>.
            Information is returned exactly as the Karnataka Bhoomi portal provides it; fields the portal does not
            provide are absent or null, never filled in.
          </p>
        </section>

        <section id="flow" className="card">
          <h2>Request flow</h2>
          <div className="doc-flow">
            <span className="badge">Browser</span> &rarr;
            <span className="badge accent">Atlas server route</span> &rarr;
            <span className="badge accent">Bhoomi data service</span> &rarr;
            <span className="badge">Live government portal</span>
          </div>
          <ol>
            <li>The browser calls an Atlas route such as <code className="doc-inline">/api/rtc</code>.</li>
            <li>The route validates the input and calls the data service, adding its API key on the server. The key never reaches the browser.</li>
            <li>The data service drives the live portal and parses the result.</li>
            <li>Atlas adds a single overall <code className="doc-inline">status</code> and returns the JSON with <code className="doc-inline">Cache-Control: no-store</code>.</li>
          </ol>
        </section>

        <section id="endpoints" className="card">
          <h2>Endpoints</h2>
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Route</th><th>Required</th><th>Optional</th><th>Notes</th></tr></thead>
              <tbody>
                {ENDPOINTS.map((e) => (
                  <tr key={e.path}>
                    <td><span className="doc-method">GET</span> <code className="mono">{e.path}</code></td>
                    <td>{e.req}</td>
                    <td>{e.opt}</td>
                    <td>{e.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small muted" style={{ marginBottom: 0 }}>
            <code className="doc-inline">survey_number</code> must be digits only (up to 6). Location values are
            case-insensitive and must match the names the portal lists; use <code className="doc-inline">/api/options</code> to get them.
          </p>
        </section>

        <section id="envelope">
          <h2>Response envelope</h2>
          <p>Every successful HTTP response, and every structured failure, shares these fields.</p>
          <CopyPre code={ENVELOPE} label="Common fields" />
        </section>

        <section id="rtc">
          <h2>RTC / Ownership response</h2>
          <p>
            <code className="doc-inline">results</code> has one entry per hissa. A hissa that failed has{" "}
            <code className="doc-inline">currentStatus: null</code> and an explanation in{" "}
            <code className="doc-inline">statusVerification</code>. Extent is written Acres.Guntas.Anas.
          </p>
          <CopyPre code={RTC} label="GET /api/rtc" />
        </section>

        <section id="mutation">
          <h2>Mutation / Legal history response</h2>
          <p>
            Entries are sorted by approved date; entries with no parseable date come last. Type fields are kept in the
            portal&apos;s original Kannada; Atlas translates only terms it can identify with confidence.
          </p>
          <CopyPre code={MUTATION} label="GET /api/mutation" />
        </section>

        <section id="loan">
          <h2>Loan / Financial charges response</h2>
          <p>
            Each event is a charge being created or released. A missing lender or amount is{" "}
            <code className="doc-inline">null</code>, never zero. Releases are linked to charges only when the source
            text names the original entry.
          </p>
          <CopyPre code={LOAN} label="GET /api/loan" />
        </section>

        <section id="status" className="card">
          <h2>Status values</h2>
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>status</th><th>Meaning</th><th>How to use it</th></tr></thead>
              <tbody>
                {STATUS.map((r) => (
                  <tr key={r.s}><td><code className="mono">{r.s}</code></td><td>{r.m}</td><td>{r.u}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3>Example error</h3>
          <CopyPre code={ERROR_EX} label="status: error" />
        </section>

        <section id="errors" className="card">
          <h2>Reason codes</h2>
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>reasonCode</th><th>Meaning</th></tr></thead>
              <tbody>
                {Object.entries(REASON_TEXT).map(([code, text]) => (
                  <tr key={code}><td><code className="mono">{code}</code></td><td>{text}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="http" className="card">
          <h2>HTTP status codes</h2>
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Code</th><th>Meaning</th></tr></thead>
              <tbody>
                {HTTP.map(([c, m]) => (
                  <tr key={c}><td><code className="mono">{c}</code></td><td>{m}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="timing" className="card">
          <h2>Timing</h2>
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Route</th><th>Typical time</th><th>Depends on</th></tr></thead>
              <tbody>
                {TIMING.map(([a, b, c]) => (
                  <tr key={a}><td>{a}</td><td>{b}</td><td>{c}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="curl">
          <h2>Examples</h2>
          <CopyPre code={CURL} label="curl" />
        </section>

        <section id="notes" className="card">
          <h2>Notes</h2>
          <ul>
            <li>Data is fetched live from the portal on every request. Only the dropdown lists are cached (6 hours).</li>
            <li>Kannada text is preserved exactly as the portal returns it.</li>
            <li>Reports can be exported as PDF (through the browser&apos;s print dialog), Excel (.xlsx) and CSV.</li>
            <li>Requests are rate limited per client; repeated rapid searches may return HTTP 429.</li>
            <li>Search history is stored only in your browser and holds the search details, not the results.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
