"use client";

import { useRouter } from "next/navigation";

export function RefreshButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.refresh()}
      className="inline-flex items-center gap-1.5 rounded-md border border-line bg-panel px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-line2 hover:text-fg"
    >
      <svg className="size-3.5" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M13 8a5 5 0 1 1-1.46-3.54M13 3v2.5h-2.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Refresh
    </button>
  );
}
