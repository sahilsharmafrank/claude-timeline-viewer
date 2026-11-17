"use client";

import { useState } from "react";

export function Collapsible({
  label,
  defaultOpen = false,
  children,
}: {
  label: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="text-left text-sm text-muted transition-colors hover:text-fg"
      >
        {open ? "▾" : "▸"} {label}
      </button>
      {open && <div className="mt-1.5 pl-4">{children}</div>}
    </div>
  );
}
