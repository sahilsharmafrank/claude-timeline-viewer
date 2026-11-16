"use client";

import type { SubagentRun, ToolEvent } from "@/lib/transcripts/types";

// Stub until Task 9 adds per-tool views.
export function ToolCard({ event }: { event: ToolEvent; subagents: Record<string, SubagentRun> }) {
  return (
    <div className="rounded border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700">
      {event.name}
    </div>
  );
}
