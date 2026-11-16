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
        className="text-left text-sm text-neutral-600 hover:underline dark:text-neutral-400"
      >
        {open ? "▾" : "▸"} {label}
      </button>
      {open && <div className="mt-1 pl-4">{children}</div>}
    </div>
  );
}
