"use client";

import { useState } from "react";
import type { Event, EventKind, SubagentRun } from "@/lib/transcripts/types";
import { EventView } from "./EventView";

const KINDS: EventKind[] = ["prompt", "command", "injected", "hook", "text", "thinking", "tool", "system", "raw"];

// Node glyph on the rail, by voice: human prompts are filled amber waypoints,
// the model's replies are open rings, machine events are small muted ticks.
function nodeClass(kind: EventKind): string {
  switch (kind) {
    case "prompt":
      return "size-2.5 rounded-full bg-signalbg";
    case "text":
      return "size-2.5 rounded-full border-2 border-muted bg-panel";
    case "tool":
      return "size-2 rounded-[2px] bg-muted";
    case "thinking":
      return "size-2 rounded-full border border-faint bg-panel";
    default:
      return "size-1.5 rounded-full bg-faint";
  }
}

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
    <section className="space-y-4">
      <div className="flex flex-wrap gap-1.5 rounded-lg border border-line bg-panel p-3">
        {KINDS.map((k) => (
          <label
            key={k}
            className="flex cursor-pointer select-none items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-xs text-faint transition-colors has-[:checked]:border-line2 has-[:checked]:text-fg"
          >
            <input type="checkbox" checked={!hidden.has(k)} onChange={() => toggle(k)} className="peer sr-only" />
            <span className="size-1.5 rounded-full bg-faint peer-checked:bg-signalbg" aria-hidden />
            {k}
          </label>
        ))}
      </div>

      <ol className="relative before:absolute before:bottom-2 before:left-[5px] before:top-2 before:w-px before:bg-line">
        {events.map((e, i) =>
          hidden.has(e.kind) ? null : (
            <li key={`${e.uuid ?? "-"}:${i}`} className="relative py-2 pl-7">
              <span
                className={`absolute left-0 top-3.5 ${nodeClass(e.kind)}`}
                aria-hidden
              />
              <EventView event={e} subagents={subagents} />
            </li>
          ),
        )}
      </ol>
    </section>
  );
}
