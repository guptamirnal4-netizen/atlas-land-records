"use client";

import { useState } from "react";
import { Copy } from "lucide-react";

export function CopyPre({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="doc-code">
      <div className="spread" style={{ marginBottom: 6 }}>
        <span className="muted small">{label}</span>
        <button
          className="btn sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {
              /* clipboard unavailable */
            }
          }}
        >
          <Copy size={13} /> {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="raw">{code}</pre>
    </div>
  );
}
