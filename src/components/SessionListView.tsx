"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { SessionSummary } from "@/lib/transcripts/types";
import { RefreshButton } from "./RefreshButton";
import { SessionTable, filterSessions } from "./SessionTable";

export function SessionListView({ root, sessions }: { root: string; sessions: SessionSummary[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const visible = useMemo(() => filterSessions(sessions, query), [sessions, query]);

  return (
    <main className="p-4">
      <div className="mb-3 flex items-center gap-3">
        <h1 className="text-lg font-semibold">Claude Session Viewer</h1>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search sessions…"
          aria-label="Search sessions"
          className="w-72 rounded border border-neutral-300 bg-transparent px-2 py-1 text-sm dark:border-neutral-700"
        />
        <RefreshButton />
        <span className="ml-auto text-sm text-neutral-500">{visible.length} sessions</span>
      </div>
      {sessions.length === 0 ? (
        <p className="text-sm text-neutral-500">No sessions found in {root}</p>
      ) : (
        <SessionTable sessions={visible} onSelect={(id) => router.push(`/sessions/${id}`)} />
      )}
    </main>
  );
}
