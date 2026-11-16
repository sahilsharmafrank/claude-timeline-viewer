"use client";

import { useState } from "react";
import type { Event, EventKind, SubagentRun } from "@/lib/transcripts/types";
import { EventView } from "./EventView";

const KINDS: EventKind[] = ["prompt", "command", "injected", "hook", "text", "thinking", "tool", "system", "raw"];

export function Timeline({
  events,
  subagents,
}: {
  events: Event[];
  subagents: Record<string, SubagentRun>;
}) {
  const [hidden, setHidden] = useState<ReadonlySet<EventKind>>(new Set());
  const toggle = (k: EventKind) =>
    setHidden((cur) => {
      const next = new Set(cur);
      if (!next.delete(k)) next.add(k);
      return next;
    });
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap gap-3 text-sm">
        {KINDS.map((k) => (
          <label key={k} className="flex items-center gap-1">
            <input type="checkbox" checked={!hidden.has(k)} onChange={() => toggle(k)} />
            {k}
          </label>
        ))}
      </div>
      <div className="space-y-2">
        {events.map((e, i) =>
          hidden.has(e.kind) ? null : (
            <EventView key={`${e.uuid ?? "-"}:${i}`} event={e} subagents={subagents} />
          ),
        )}
      </div>
    </section>
  );
}
