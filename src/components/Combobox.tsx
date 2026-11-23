"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { Spinner } from "./ui";

export interface ComboboxProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  display?: (v: string) => string;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  required?: boolean;
  error?: string | null;
  hint?: string;
  /** Accept typed text that isn't in the list (used for Hissa). */
  allowCustom?: boolean;
  clearable?: boolean;
  emptyText?: string;
}

export function Combobox({
  label,
  value,
  onChange,
  options,
  display = (v) => v,
  placeholder,
  disabled,
  loading,
  required,
  error,
  hint,
  allowCustom,
  clearable,
  emptyText = "No matches",
}: ComboboxProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [edited, setEdited] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items = options.map((o) => ({ value: o, label: display(o) }));
    return q ? items.filter((i) => i.label.toLowerCase().includes(q) || i.value.toLowerCase().includes(q)) : items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options, query]);

  useEffect(() => setActive(0), [query, open]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const commit = (v: string) => {
    setEdited(false);
    onChange(v);
    setOpen(false);
    setQuery("");
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, Math.max(shown.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      if (open) {
        e.preventDefault();
        if (shown[active]) commit(shown[active].value);
        else if (allowCustom && query.trim()) commit(query.trim());
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  };

  const inputText = open ? query : value ? display(value) : "";

  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {required && <span className="req" aria-hidden> *</span>}
      </label>
      <div className="combo">
        <input
          id={id}
          className="combo-input"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-required={required}
          aria-invalid={error ? true : undefined}
          aria-activedescendant={open && shown[active] ? `${id}-opt-${active}` : undefined}
          autoComplete="off"
          disabled={disabled}
          placeholder={open && value ? display(value) : placeholder}
          value={inputText}
          onFocus={() => {
            setQuery("");
            setOpen(true);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setEdited(true);
            setOpen(true);
          }}
          onBlur={() => {
            if (allowCustom && edited) {
              const typed = query.trim();
              if (typed !== value) onChange(typed);
            }
            setEdited(false);
            setOpen(false);
            setQuery("");
          }}
          onKeyDown={onKeyDown}
        />
        <span className="combo-chevron">
          {loading ? <Spinner /> : clearable && value && !disabled ? (
            <button
              type="button"
              aria-label={`Clear ${label}`}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange("");
              }}
              style={{ background: "none", border: 0, padding: 0, cursor: "pointer", color: "inherit", pointerEvents: "auto", display: "flex" }}
            >
              <X size={15} />
            </button>
          ) : (
            <ChevronDown size={16} />
          )}
        </span>
        {open && !disabled && (
          <div className="combo-list" id={`${id}-list`} role="listbox" aria-label={label} ref={listRef}>
            {shown.length === 0 ? (
              <div className="combo-empty">
                {loading ? "Loading..." : allowCustom && query.trim() ? `Press Enter to use "${query.trim()}"` : emptyText}
              </div>
            ) : (
              shown.map((o, i) => (
                <div
                  key={o.value}
                  id={`${id}-opt-${i}`}
                  data-i={i}
                  role="option"
                  aria-selected={i === active}
                  className="combo-opt"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    commit(o.value);
                  }}
                  onMouseEnter={() => setActive(i)}
                >
                  {o.label}
                  {o.value === value && <span aria-hidden>✓</span>}
                </div>
              ))
            )}
          </div>
        )}
      </div>
      {error ? <span className="field-error" role="alert">{error}</span> : hint ? <span className="field-hint">{hint}</span> : null}
    </div>
  );
}
