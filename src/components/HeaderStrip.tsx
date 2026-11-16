"use client";

import { formatDuration, formatTokens } from "@/lib/format";
import type { SessionSummary } from "@/lib/transcripts/types";
import { LocalTime } from "./LocalTime";

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-xs dark:bg-neutral-800">{children}</span>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="text-sm tabular-nums">{children}</dd>
    </div>
  );
}

export function HeaderStrip({ summary: s }: { summary: SessionSummary }) {
  const tools = Object.entries(s.tools).sort((a, b) => b[1] - a[1]);
  return (
    <header className="space-y-3 rounded border border-neutral-300 p-3 dark:border-neutral-700">
      <div>
        <h1 className="text-lg font-semibold">{s.title}</h1>
        <p className="text-sm text-neutral-500">{s.projectPath}</p>
        <p className="font-mono text-xs text-neutral-500">{s.sessionId}</p>
      </div>
      <dl className="flex flex-wrap gap-x-6 gap-y-2">
        <Stat label="Started"><LocalTime iso={s.startedAt} /></Stat>
        <Stat label="Duration">{formatDuration(s.durationSeconds)}</Stat>
        <Stat label="Models">{s.models.join(", ") || "—"}</Stat>
        <Stat label="Branch">{s.gitBranch ?? "—"}</Stat>
        <Stat label="Version">{s.version ?? "—"}</Stat>
        <Stat label="Subagents">{s.subagentCount}</Stat>
        <Stat label="Input">{formatTokens(s.tokens.input)}</Stat>
        <Stat label="Output">{formatTokens(s.tokens.output)}</Stat>
        <Stat label="Cache write">{formatTokens(s.tokens.cacheCreation)}</Stat>
        <Stat label="Cache read">{formatTokens(s.tokens.cacheRead)}</Stat>
        <Stat label="Total tokens">{formatTokens(s.tokens.total)}</Stat>
      </dl>
      {tools.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-xs text-neutral-500">Tools</span>
          {tools.map(([name, n]) => <Chip key={name}>{`${name}×${n}`}</Chip>)}
        </div>
      )}
      {s.skills.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-xs text-neutral-500">Skills</span>
          {s.skills.map((k) => <Chip key={k}>{k}</Chip>)}
        </div>
      )}
      {s.slashCommands.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-xs text-neutral-500">Commands</span>
          {s.slashCommands.map((c) => <Chip key={c}>{c}</Chip>)}
        </div>
      )}
    </header>
  );
}
