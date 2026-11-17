"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { SessionSummary } from "@/lib/transcripts/types";
import { formatTokens } from "@/lib/format";
import { RefreshButton } from "./RefreshButton";
import { SessionTable, filterSessions } from "./SessionTable";

function spanLabel(sessions: SessionSummary[]): string {
  const dates = sessions.map((s) => s.startedAt).filter((d): d is string => d !== null).sort();
  if (dates.length === 0) return "—";
  const fmt = (iso: string) => new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
  const first = fmt(dates[0]);
  const last = fmt(dates[dates.length - 1]);
  return first === last ? first : `${first} – ${last}`;
}

function Readout({ value, label, mono = true }: { value: string; label: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 border-line pl-4 first:border-l-0 first:pl-0 sm:border-l sm:pl-5">
      <span
        className={`text-xl leading-none text-fg ${mono ? "font-mono tabular-nums" : "font-sans font-semibold"}`}
        suppressHydrationWarning
      >
        {value}
      </span>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}

export function SessionListView({ root, sessions }: { root: string; sessions: SessionSummary[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const visible = useMemo(() => filterSessions(sessions, query), [sessions, query]);

  const stats = useMemo(() => {
    const projects = new Set(sessions.map((s) => s.project));
    const tokens = sessions.reduce((n, s) => n + s.tokens.total, 0);
    return { projects: projects.size, tokens, span: spanLabel(sessions) };
  }, [sessions]);

  return (
    <main className="mx-auto w-full max-w-[1440px] px-5 py-7">
      <header className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="mt-1 size-2.5 shrink-0 rounded-[2px] bg-signalbg" aria-hidden />
            <div>
              <h1 className="text-lg font-semibold leading-tight text-fg">Claude Session Viewer</h1>
              <p className="text-xs text-muted">Read-only transcript reader</p>
            </div>
          </div>
          <RefreshButton />
        </div>

        <div className="mt-6 flex flex-wrap items-end gap-y-4 rounded-lg border border-line bg-panel px-5 py-4 sm:gap-x-2">
          <Readout value={String(sessions.length)} label="sessions" />
          <Readout value={String(stats.projects)} label="projects" />
          <Readout value={formatTokens(stats.tokens)} label="tokens" />
          <Readout value={stats.span} label="active range" mono={false} />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <div className="relative flex-1">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden
            >
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, project, branch, tool, session id…"
              aria-label="Search sessions"
              className="w-full max-w-xl rounded-md border border-line bg-panel py-2 pl-9 pr-3 text-sm text-fg placeholder:text-faint focus:border-signal focus-visible:outline-none"
            />
          </div>
          <span className="shrink-0 font-mono text-xs tabular-nums text-muted">
            {visible.length} / {sessions.length}
          </span>
        </div>
      </header>

      {sessions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line2 bg-panel px-5 py-16 text-center">
          <p className="text-sm text-muted">No sessions found in {root}</p>
        </div>
      ) : (
        <SessionTable sessions={visible} onSelect={(id) => router.push(`/sessions/${id}`)} />
      )}
    </main>
  );
}
