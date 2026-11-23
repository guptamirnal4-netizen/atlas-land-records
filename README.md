# ATLAS - Land Records

Next.js (App Router, TypeScript) portal for Karnataka land records: Trial Centre (RTC / ownership),
Mutation (legal history) and Loan (financial charges), plus a combined Property Report and exports.

```
Browser -> Atlas (Vercel, /api/* routes) -> Bhoomi backend (FastAPI, Railway/Render) -> landrecords.karnataka.gov.in
```

The Vercel app holds the backend API key **server-side only**. The backend lives in `../bhoomimonitor`.

## Local development

```bash
# 1. backend (needs no MongoDB for the Atlas routes)
cd ../bhoomimonitor && ./venv/bin/python -m uvicorn api:app --port 8000

# 2. frontend
cd ../atlas && cp .env.example .env.local   # ATLAS_API_BASE_URL=http://127.0.0.1:8000
npm install && npm run dev                  # http://localhost:3000
npm test && npm run typecheck
```

## Deploy

### 1. Backend (Railway or Render)

The backend scrapes a government portal with slow, multi-step sessions, so it cannot run as a Vercel function.

1. Put `bhoomimonitor/` in its own GitHub repo (it has a `Dockerfile`).
2. Railway: *New Project -> Deploy from GitHub repo* (Render: *New -> Web Service -> Docker*).
3. Environment variables:
   - `ATLAS_API_KEY` = a long random string (`openssl rand -hex 32`). **Required in production**; without it the live routes are open.
   - `MONGO_URI` / `MONGO_DB` only if you also want the monitoring dashboard endpoints. Not needed for Atlas.
4. Check `https://<backend-host>/api/options?level=district` with header `X-API-Key: <key>`; it should list districts.

The government portal must be reachable from the host's region. It worked from the dev machine; confirm from your host.

### 2. Frontend (Vercel)

1. Put `atlas/` in a GitHub repo (`.env*` is git-ignored; never commit keys).
2. Vercel: *Add New -> Project -> import the repo* (framework auto-detected as Next.js).
3. Environment variables (Production + Preview):
   - `ATLAS_API_BASE_URL` = `https://<backend-host>` (no trailing slash)
   - `ATLAS_API_KEY` = the same key as the backend
4. Deploy, then verify on the production URL: dropdowns load, and each service returns real data for
   Bagalkote / Mudhol / LOKAPURA / LOKAPURA, survey 56, hissa 1.

API routes set `maxDuration = 60`. Vercel Hobby allows up to 60s; a Loan lookup over many mutation rows can
approach that. Pro allows longer (raise `maxDuration`, and the 55s timeout in `src/lib/server/backend.ts`).

### Access control

Atlas has no user accounts (none exist upstream). Anyone with the URL can trigger live portal lookups through it.
Per-IP rate limiting (40/min per instance) and the backend's 3-concurrent-session cap blunt abuse, but for a
non-public deployment enable Vercel Deployment Protection or put it behind your SSO.

## Behaviour notes

- Statuses: `ok`, `partial`, `no_records`, `error`. A portal/network failure is never shown as "no records".
- RTC "no records" caused by an empty portal cascade is flagged `ambiguous` (the portal returns the same empty answer under load) and offers a retry.
- Only fields the portal returns are shown. Cultivation details are not in the current-RTC response, so they are not shown.
- Kannada terms are translated only when the meaning is established (`src/lib/format.ts`); otherwise the original is shown.
- "Download PDF" opens the browser print dialog (choose *Save as PDF*). This keeps Kannada text correctly shaped, which common JS PDF libraries cannot do.
- Search history is stored in the browser (localStorage). Re-running a history entry fetches fresh data; results are not stored.
