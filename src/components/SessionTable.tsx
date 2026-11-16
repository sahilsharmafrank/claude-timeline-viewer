"use client";

import { useMemo, useState } from "react";
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
  return shown.join(" ");
}

const COLUMNS: { label: string; key?: SortKey; numeric?: boolean }[] = [
  { label: "Date", key: "date" },
  { label: "Project", key: "project" },
  { label: "Title" },
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
    <table className="w-full text-sm tabular-nums">
      <thead className="sticky top-0 bg-neutral-100 text-left dark:bg-neutral-900">
        <tr>
          {COLUMNS.map((c) => (
            <th
              key={c.label}
              className={`px-2 py-1.5 font-medium ${c.numeric ? "text-right" : ""}`}
              aria-sort={
                c.key && sort.key === c.key ? (sort.dir === "asc" ? "ascending" : "descending") : undefined
              }
            >
              {c.key ? (
                <button type="button" onClick={() => toggle(c.key!)} className="font-medium hover:underline">
                  {c.label}
                  {sort.key === c.key ? (sort.dir === "asc" ? " ↑" : " ↓") : ""}
                </button>
              ) : (
                c.label
              )}
            </th>
          ))}
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
            className="cursor-pointer odd:bg-neutral-50 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none dark:odd:bg-neutral-900/50 dark:hover:bg-neutral-800 dark:focus:bg-neutral-800"
          >
            <td className="whitespace-nowrap px-2 py-1"><LocalTime iso={s.startedAt} /></td>
            <td className="px-2 py-1">{s.project}</td>
            <td className="max-w-md truncate px-2 py-1">{s.title}</td>
            <td className="whitespace-nowrap px-2 py-1 text-right">{formatDuration(s.durationSeconds)}</td>
            <td className="px-2 py-1 text-right">{s.prompts}</td>
            <td
              className="px-2 py-1 text-right"
              title={`input ${s.tokens.input} · output ${s.tokens.output} · cache write ${s.tokens.cacheCreation} · cache read ${s.tokens.cacheRead}`}
            >
              {formatTokens(s.tokens.total)}
            </td>
            <td className="px-2 py-1">{topTools(s.tools)}</td>
            <td className="px-2 py-1">{s.models.join(", ")}</td>
            <td className="px-2 py-1">{s.gitBranch ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
