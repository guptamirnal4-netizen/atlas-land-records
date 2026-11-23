"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Download, FileSpreadsheet, FileText, MapPin, Printer, Table2 } from "lucide-react";
import { downloadCsv, downloadXlsx, printReport, propertyMeta, type ExportModel } from "@/lib/exports";
import { formatDateTime } from "@/lib/format";
import { SERVICES } from "@/lib/services";
import type { AnyResponse, PropertyQuery, ServiceKey } from "@/lib/types";
import { KV, RawResponse, SectionTitle } from "./ui";

/** When true, service results render as a section of a combined report (no toolbar/overview/raw). */
export const EmbeddedContext = createContext(false);

export function ExportMenu({ model, label = "Export" }: { model: ExportModel; label?: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const act = async (name: string, fn: () => void | Promise<void>) => {
    setBusy(name);
    setErr(null);
    try {
      await fn();
      setOpen(false);
    } catch {
      setErr("The export could not be created. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="menu no-print" ref={ref}>
      <button className="btn primary" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Download size={15} /> {label}
      </button>
      {open && (
        <div className="menu-pop" role="menu">
          <button role="menuitem" className="menu-item" onClick={() => act("pdf", printReport)}>
            <FileText size={16} /> Download PDF report
          </button>
          <button role="menuitem" className="menu-item" disabled={busy === "xlsx"} onClick={() => act("xlsx", () => downloadXlsx(model))}>
            <FileSpreadsheet size={16} /> {busy === "xlsx" ? "Preparing Excel..." : "Export Excel (.xlsx)"}
          </button>
          <button role="menuitem" className="menu-item" onClick={() => act("csv", () => downloadCsv(model))}>
            <Table2 size={16} /> Download CSV
          </button>
          <button role="menuitem" className="menu-item" onClick={() => act("print", printReport)}>
            <Printer size={16} /> Print
          </button>
          <div className="muted small" style={{ padding: "6px 11px 4px" }}>
            For PDF, choose &quot;Save as PDF&quot; in the print dialog.
          </div>
          {err && (
            <div className="field-error" style={{ padding: "4px 11px" }}>
              {err}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function PropertyOverview({ query }: { query: PropertyQuery }) {
  return (
    <div className="card">
      <div className="stack" style={{ gap: 14 }}>
        <SectionTitle icon={<MapPin size={16} />}>Property Overview</SectionTitle>
        <div className="kv-grid">
          {propertyMeta(query).map(([k, v]) => (
            <KV key={k} label={k} value={v} />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Common wrapper for every service's results: print header, toolbar with
 * export actions, property overview, the service-specific body, and the raw
 * API payload.
 */
export function ResultFrame({
  service,
  response,
  model,
  children,
}: {
  service: ServiceKey;
  response: AnyResponse;
  model: ExportModel;
  children: ReactNode;
}) {
  const def = SERVICES[service];
  const embedded = useContext(EmbeddedContext);
  if (embedded) {
    return (
      <div className="stack" data-service={service}>
        {children}
      </div>
    );
  }
  return (
    <div className="stack fade-in print-area" data-service={service}>
      <div className="print-only" style={{ borderBottom: "2px solid #111", paddingBottom: 8 }}>
        <div style={{ fontWeight: 800, letterSpacing: "0.05em", fontSize: 16 }}>ATLAS - Land Records</div>
        <div style={{ fontSize: 15, fontWeight: 650 }}>{model.title}</div>
        <div className="small">Retrieved {formatDateTime(response.fetchedAt)}</div>
      </div>

      <div className="spread no-print">
        <div>
          <h2 style={{ fontSize: 18 }}>{def.populates}</h2>
          <span className="muted small">Retrieved {formatDateTime(response.fetchedAt)} from the live government portal</span>
        </div>
        <ExportMenu model={model} />
      </div>

      <PropertyOverview query={response.query} />
      {children}
      <RawResponse data={response} />
      <p className="muted small print-only">{model.meta.find(([k]) => k === "Note")?.[1]}</p>
    </div>
  );
}
