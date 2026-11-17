"use client";

import { useMemo, useState } from "react";
import { CopyButton } from "./CopyButton";
import { LocalTime } from "./LocalTime";
import { formatDuration, formatTokens } from "@/lib/format";
import type { SessionSummary } from "@/lib/transcripts/types";

type SortKey = "date" | "project" | "duration" | "tokens";
type Sort = { key: SortKey; dir: "asc" | "desc" };

export function filterSessions(sessions: SessionSummary[], query: string): SessionSummary[] {
  const q = query.trim().toLowerCase();
  if (!q) return sessions;
  return sessions.filter((s) =>
    [s.title, s.project, s.projectPath, s.gitBranch ?? "", s.sessionId, ...Object.keys(s.tools)].some(
      (field) => field.toLowerCase().includes(q),
    ),
  );
}

function sortValue(s: SessionSummary, key: SortKey): string | number {
  switch (key) {
    case "date":
      return s.startedAt ?? "";
    case "project":
      return s.project.toLowerCase();
    case "duration":
      return s.durationSeconds ?? -1;
    case "tokens":
      return s.tokens.total;
  }
}

function topTools(tools: Record<string, number>): string {
  const entries = Object.entries(tools).sort((a, b) => b[1] - a[1]);
  const shown = entries.slice(0, 3).map(([name, n]) => `${name}×${n}`);
  if (entries.length > 3) shown.push(`+${entries.length - 3}`);
  return shown.join("  ");
}

function shortId(id: string): string {
  return id.length > 8 ? id.slice(0, 8) : id;
}

const COLUMNS: { label: string; key?: SortKey; numeric?: boolean }[] = [
  { label: "Date", key: "date" },
  { label: "Project", key: "project" },
  { label: "Title" },
  { label: "Session" },
  { label: "Duration", key: "duration", numeric: true },
  { label: "Prompts", numeric: true },
  { label: "Tokens", key: "tokens", numeric: true },
  { label: "Tools" },
  { label: "Model" },
  { label: "Branch" },
];

export function SessionTable({
  sessions,
  onSelect,
}: {
  sessions: SessionSummary[];
  onSelect: (id: string) => void;
}) {
  const [sort, setSort] = useState<Sort>({ key: "date", dir: "desc" });

  const sorted = useMemo(() => {
    const sign = sort.dir === "asc" ? 1 : -1;
    return [...sessions].sort((x, y) => {
      const a = sortValue(x, sort.key);
      const b = sortValue(y, sort.key);
      return a < b ? -sign : a > b ? sign : 0;
    });
  }, [sessions, sort]);

  const toggle = (key: SortKey) =>
    setSort((cur) =>
      cur.key === key ? { key, dir: cur.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" },
    );

  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-panel">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-panel">
          <tr className="border-b border-line2">
            {COLUMNS.map((c) => {
              const active = c.key && sort.key === c.key;
              return (
                <th
                  key={c.label}
                  scope="col"
                  className={`whitespace-nowrap px-3 py-2.5 text-xs font-medium text-muted ${c.numeric ? "text-right" : "text-left"}`}
                  aria-sort={
                    active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined
                  }
                >
                  {c.key ? (
                    <button
                      type="button"
                      onClick={() => toggle(c.key!)}
                      className={`inline-flex items-center gap-1 ${active ? "text-signal" : "hover:text-fg"}`}
                    >
                      {c.label}
                      <span className="w-2 text-signal">
                        {active ? (sort.dir === "asc" ? "↑" : "↓") : ""}
                      </span>
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((s) => (
            <tr
              key={s.sessionId}
              tabIndex={0}
              onClick={() => onSelect(s.sessionId)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSelect(s.sessionId);
              }}
              className="cursor-pointer border-b border-line/70 transition-colors last:border-0 hover:bg-code hover:shadow-[inset_2px_0_0_var(--signal-bg)] focus:bg-code focus:shadow-[inset_2px_0_0_var(--signal-bg)] focus:outline-none"
            >
              <td className="whitespace-nowrap px-3 py-2 font-mono text-xs tabular-nums text-muted">
                <LocalTime iso={s.startedAt} />
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-muted">{s.project}</td>
              <td className="max-w-md truncate px-3 py-2 font-medium text-fg">{s.title}</td>
              <td className="whitespace-nowrap px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-faint" title={s.sessionId}>
                    {shortId(s.sessionId)}
                  </span>
                  <CopyButton value={`claude resume ${s.sessionId}`} label="Copy resume command" />
                </div>
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-right font-mono tabular-nums text-muted">
                {formatDuration(s.durationSeconds)}
              </td>
              <td className="px-3 py-2 text-right font-mono tabular-nums text-muted">{s.prompts}</td>
              <td
                className="whitespace-nowrap px-3 py-2 text-right font-mono tabular-nums text-fg"
                title={`input ${s.tokens.input} · output ${s.tokens.output} · cache write ${s.tokens.cacheCreation} · cache read ${s.tokens.cacheRead}`}
              >
                {formatTokens(s.tokens.total)}
              </td>
              <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-faint">{topTools(s.tools)}</td>
              <td className="whitespace-nowrap px-3 py-2 text-xs text-muted">{s.models.join(", ")}</td>
              <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-muted">{s.gitBranch ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
