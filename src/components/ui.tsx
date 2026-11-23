"use client";

import { useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, Copy, Info, SearchX, XCircle } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { isInputProblem, reasonText } from "@/lib/reasons";
import type { Envelope } from "@/lib/types";

export function Badge({ tone, children }: { tone?: "ok" | "warn" | "danger" | "accent" | "blue" | "green" | "purple"; children: ReactNode }) {
  return <span className={`badge ${tone ?? ""}`}>{children}</span>;
}

export function KV({ label, value, mono, kn }: { label: string; value: ReactNode; mono?: boolean; kn?: boolean }) {
  const empty = value === null || value === undefined || value === "";
  return (
    <div className="kv">
      <div className="k">{label}</div>
      <div className={`v ${empty ? "na" : ""} ${mono ? "mono" : ""} ${kn ? "kn" : ""}`}>
        {empty ? "Not available" : value}
      </div>
    </div>
  );
}

export function SectionTitle({ icon, children, count }: { icon?: ReactNode; children: ReactNode; count?: number | string }) {
  return (
    <h3 className="section-title">
      {icon}
      {children}
      {count !== undefined && <span className="count">{count}</span>}
    </h3>
  );
}

export function Disclosure({
  title,
  icon,
  badge,
  defaultOpen,
  className,
  children,
}: {
  title: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <details className={`disclosure ${className ?? ""}`} open={defaultOpen}>
      <summary>
        {icon}
        <span>{title}</span>
        {badge}
        <ChevronDown size={16} className="chev" />
      </summary>
      <div className="disclosure-body">{children}</div>
    </details>
  );
}

/** Technical users only - the original API payload, untouched. */
export function RawResponse({ data }: { data: unknown }) {
  const [copied, setCopied] = useState(false);
  const text = JSON.stringify(data, null, 2);
  return (
    <Disclosure title="Raw API response" className="raw-details no-print">
      <div className="stack" style={{ gap: 10 }}>
        <div className="row">
          <button
            className="btn sm"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(text);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              } catch {
                /* clipboard unavailable */
              }
            }}
          >
            <Copy size={13} /> {copied ? "Copied" : "Copy JSON"}
          </button>
          <span className="muted small">Exactly as returned by the data service, before Atlas formats it.</span>
        </div>
        <pre className="raw">{text}</pre>
      </div>
    </Disclosure>
  );
}

export function Spinner() {
  return <span className="spinner" aria-hidden />;
}

export function LoadingCard({ label }: { label: string }) {
  return (
    <div className="card stack fade-in" role="status" aria-live="polite">
      <div className="row">
        <Spinner />
        <strong>{label}</strong>
      </div>
      <div className="skeleton" style={{ height: 14, width: "60%" }} />
      <div className="skeleton" style={{ height: 14, width: "85%" }} />
      <div className="skeleton" style={{ height: 90 }} />
      <span className="muted small">
        Atlas is reading the live government portal. This can take 10 to 30 seconds. Please keep this page open.
      </span>
    </div>
  );
}

/** Failure banner: clearly different from "no records". */
export function ErrorBanner({ response, onRetry }: { response: Envelope; onRetry?: () => void }) {
  const err = response.error;
  if (!err) return null;
  const input = isInputProblem(err.reasonCode);
  return (
    <div className="banner danger fade-in" role="alert">
      <XCircle size={20} />
      <div className="banner-body" style={{ flex: 1 }}>
        <h4>{input ? "Check the search details" : "The lookup could not be completed"}</h4>
        <p>{err.detail}</p>
        <p className="small" style={{ marginTop: 6 }}>
          <span className="mono">{err.reasonCode}</span> - {reasonText(err.reasonCode)}
          {!input && " This does not mean the property has no records."}
        </p>
        {onRetry && !input && (
          <button className="btn sm" style={{ marginTop: 10 }} onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

export function NoRecordsBanner({ what, ambiguous, onRetry }: { what: string; ambiguous?: boolean; onRetry?: () => void }) {
  return (
    <div className="banner info fade-in" role="status">
      <SearchX size={20} />
      <div className="banner-body" style={{ flex: 1 }}>
        <h4>No {what} found</h4>
        <p>The lookup completed successfully, and the portal has no {what.toLowerCase()} for these details.</p>
        {ambiguous && (
          <p className="small" style={{ marginTop: 6 }}>
            The portal gives the same empty answer when it is overloaded. If you expected a record, check the survey
            number and try again.
          </p>
        )}
        {ambiguous && onRetry && (
          <button className="btn sm" style={{ marginTop: 10 }} onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

export function PartialBanner({ children }: { children: ReactNode }) {
  return (
    <div className="banner warn fade-in" role="status">
      <AlertTriangle size={20} />
      <div className="banner-body">
        <h4>Some information could not be retrieved</h4>
        <p>{children}</p>
      </div>
    </div>
  );
}

export function VerifyNote({ children }: { children: ReactNode }) {
  return (
    <div className="banner warn" style={{ padding: "10px 12px" }}>
      <Info size={16} />
      <div className="banner-body small">{children}</div>
    </div>
  );
}

export function OkTick({ children }: { children: ReactNode }) {
  return (
    <span className="row" style={{ gap: 6, color: "var(--ok-ink)", fontWeight: 600 }}>
      <CheckCircle2 size={15} /> {children}
    </span>
  );
}

export function RetrievedAt({ iso }: { iso: string }) {
  return <span className="muted small">Retrieved {formatDateTime(iso)}</span>;
}
