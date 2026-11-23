"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { BookOpen, ChevronRight, FileText, Landmark, LayoutGrid, Lightbulb, Menu, Moon, Scale, Sun, UserRound, X } from "lucide-react";
import { SERVICES, SERVICE_ORDER } from "@/lib/services";
import type { ServiceKey } from "@/lib/types";

export const SERVICE_ICON: Record<ServiceKey, typeof UserRound> = {
  rtc: UserRound,
  mutation: Scale,
  loan: Landmark,
};

function serviceForPath(path: string): ServiceKey | null {
  return SERVICE_ORDER.find((k) => path.startsWith(SERVICES[k].summaryPath)) ?? null;
}

function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("atlas.theme", next);
    } catch {
      /* ignore */
    }
    setTheme(next);
  };
  return { theme, toggle };
}

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const active = serviceForPath(path);
  const def = active ? SERVICES[active] : null;

  useEffect(() => setOpen(false), [path]);

  const crumb = def
    ? [def.navLabel, def.populates]
    : path.startsWith("/report")
      ? ["Property Report"]
      : path.startsWith("/docs")
        ? ["API Documentation"]
        : ["Dashboard"];

  return (
    <div className="shell" data-service={active ?? undefined}>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? "open" : ""}`} aria-label="Primary">
        <div className="brand">
          <div className="brand-mark" aria-hidden>A</div>
          <div>
            <div className="brand-name">ATLAS</div>
            <div className="brand-sub">Land Records</div>
          </div>
        </div>

        <nav className="stack" style={{ gap: 4 }}>
          <Link href="/" className="nav-link" aria-current={path === "/" ? "page" : undefined}>
            <LayoutGrid size={17} /> Overview
          </Link>
          <div className="nav-sep" />
          {SERVICE_ORDER.map((k) => {
            const Icon = SERVICE_ICON[k];
            const s = SERVICES[k];
            return (
              <Link
                key={k}
                href={s.summaryPath}
                className="nav-link"
                data-service={k}
                aria-current={active === k ? "page" : undefined}
              >
                <Icon size={17} /> {s.navLabel}
                {active === k && <span className="dot" />}
              </Link>
            );
          })}
          <div className="nav-sep" />
          <Link href="/report" className="nav-link" aria-current={path.startsWith("/report") ? "page" : undefined}>
            <FileText size={17} /> Property Report
          </Link>
          <Link href="/docs" className="nav-link" aria-current={path.startsWith("/docs") ? "page" : undefined}>
            <BookOpen size={17} /> API Documentation
          </Link>
        </nav>

        {def && (
          <div className="tip-card">
            <strong>
              <Lightbulb size={14} /> Tip
            </strong>
            {def.tip}
          </div>
        )}
      </aside>

      <div className="main">
        <header className="header">
          <div className="row" style={{ minWidth: 0 }}>
            <button className="btn icon-btn menu-btn" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((o) => !o)}>
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
            <nav className="crumbs" aria-label="Breadcrumb">
              <span className="crumb-hide">Atlas</span>
              {crumb.map((c, i) => (
                <span key={c} className="row" style={{ gap: 6 }}>
                  <ChevronRight size={14} className={i === 0 ? "crumb-hide" : undefined} />
                  {i === crumb.length - 1 ? <b>{c}</b> : <span>{c}</span>}
                </span>
              ))}
            </nav>
          </div>
          <button className="btn sm" onClick={toggle} aria-label="Toggle theme">
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />} {theme === "dark" ? "Light" : "Dark"}
          </button>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
