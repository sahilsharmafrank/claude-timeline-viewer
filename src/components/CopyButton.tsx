"use client";

import { useState } from "react";

// Small icon button for copying a value to the clipboard. Stops click/key
// propagation so it can live inside a clickable table row without triggering it.
export function CopyButton({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      title={copied ? "Copied" : label}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard?.writeText(value).then(
          () => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          },
          () => {},
        );
      }}
      onKeyDown={(e) => e.stopPropagation()}
      className={`inline-flex size-6 shrink-0 items-center justify-center rounded-md border transition-colors focus-visible:text-signal ${
        copied
          ? "border-signalbg text-signal"
          : "border-line text-faint hover:border-line2 hover:text-signal"
      } ${className ?? ""}`}
    >
      {copied ? (
        <svg viewBox="0 0 16 16" fill="none" className="size-3.5" aria-hidden>
          <path
            d="M3.5 8.5l3 3 6-7"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" fill="none" className="size-3.5" aria-hidden>
          <rect x="5.5" y="5.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
          <path
            d="M10.5 5.5V4.25A1.25 1.25 0 009.25 3H4A1.25 1.25 0 002.75 4.25v5A1.25 1.25 0 004 10.5h1.25"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
