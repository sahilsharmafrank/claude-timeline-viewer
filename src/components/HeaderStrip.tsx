"use client";

import { formatDuration, formatTokens } from "@/lib/format";
import type { SessionSummary } from "@/lib/transcripts/types";
import { LocalTime } from "./LocalTime";

function Chip({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-xs ${
        accent
          ? "border-signal/40 bg-signalsoft text-signal"
          : "border-line bg-code text-muted"
      }`}
    >
      {children}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 font-mono text-xl tabular-nums text-fg">{value}</dd>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-sm text-fg">{children}</dd>
    </div>
  );
}

const SEGMENTS = [
  { key: "input", label: "Input", fill: "var(--fg)" },
  { key: "output", label: "Output", fill: "var(--signal-bg)" },
  { key: "cacheCreation", label: "Cache write", fill: "var(--muted)" },
  { key: "cacheRead", label: "Cache read", fill: "var(--faint)" },
] as const;

function TokenMeter({ t }: { t: SessionSummary["tokens"] }) {
  const total = t.total || 1;
  return (
    <div className="space-y-2">
      <div className="flex h-2 overflow-hidden rounded-full bg-code" role="img" aria-label="Token composition">
        {SEGMENTS.map((seg) => {
          const pct = (t[seg.key] / total) * 100;
          if (pct <= 0) return null;
          return <div key={seg.key} style={{ width: `${pct}%`, background: seg.fill }} />;
        })}
      </div>
      <dl className="flex flex-wrap gap-x-5 gap-y-1">
        {SEGMENTS.map((seg) => (
          <div key={seg.key} className="flex items-center gap-1.5">
            <span className="size-2 shrink-0 rounded-[2px]" style={{ background: seg.fill }} aria-hidden />
            <dt className="text-xs text-muted">{seg.label}</dt>
            <dd className="font-mono text-xs tabular-nums text-fg">{formatTokens(t[seg.key])}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function HeaderStrip({ summary: s }: { summary: SessionSummary }) {
  const tools = Object.entries(s.tools).sort((a, b) => b[1] - a[1]);
  return (
    <header className="overflow-hidden rounded-lg border border-line bg-panel">
      <div className="border-b border-line px-5 py-4">
        <h1 className="text-xl font-semibold leading-snug text-fg">{s.title}</h1>
        <p className="mt-1 font-mono text-xs text-muted">{s.projectPath}</p>
        <p className="font-mono text-xs text-faint">{s.sessionId}</p>
      </div>

      <dl className="flex flex-wrap gap-x-10 gap-y-4 px-5 py-4">
        <Metric label="Duration" value={formatDuration(s.durationSeconds)} />
        <Metric label="Prompts" value={s.prompts} />
        <Metric label="Total tokens" value={formatTokens(s.tokens.total)} />
        <Metric label="Subagents" value={s.subagentCount} />
      </dl>

      <div className="border-t border-line px-5 py-4">
        <TokenMeter t={s.tokens} />
      </div>

      <dl className="flex flex-wrap gap-x-8 gap-y-2 border-t border-line px-5 py-4">
        <Field label="Started"><LocalTime iso={s.startedAt} /></Field>
        <Field label="Models">{s.models.join(", ") || "—"}</Field>
        <Field label="Branch"><span className="font-mono">{s.gitBranch ?? "—"}</span></Field>
        <Field label="Version"><span className="font-mono">{s.version ?? "—"}</span></Field>
      </dl>

      {(tools.length > 0 || s.skills.length > 0 || s.slashCommands.length > 0) && (
        <div className="space-y-2 border-t border-line px-5 py-4">
          {tools.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="w-16 shrink-0 text-xs text-muted">Tools</span>
              {tools.map(([name, n]) => <Chip key={name}>{`${name}×${n}`}</Chip>)}
            </div>
          )}
          {s.skills.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="w-16 shrink-0 text-xs text-muted">Skills</span>
              {s.skills.map((k) => <Chip key={k} accent>{k}</Chip>)}
            </div>
          )}
          {s.slashCommands.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="w-16 shrink-0 text-xs text-muted">Commands</span>
              {s.slashCommands.map((c) => <Chip key={c}><span className="font-mono">{c}</span></Chip>)}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
