"use client";

import Markdown from "react-markdown";
import type { Event, SubagentRun } from "@/lib/transcripts/types";
import { Collapsible } from "./Collapsible";
import { ToolCard } from "./tools/ToolCard";

const pre = "overflow-x-auto whitespace-pre-wrap break-words rounded-md bg-code p-2.5 text-xs text-fg";

export function EventView({ event, subagents }: { event: Event; subagents: Record<string, SubagentRun> }) {
  switch (event.kind) {
    case "prompt":
      return (
        <div className="rounded-md border border-line border-l-2 border-l-signalbg bg-signalsoft px-4 py-3">
          <div className="mb-1 text-xs font-medium text-signal">You</div>
          <div className="whitespace-pre-wrap text-fg">{event.text}</div>
        </div>
      );
    case "command":
      return (
        <div className="text-sm text-muted">
          <span className="rounded bg-code px-1.5 py-0.5 font-mono text-xs font-medium text-signal">{event.name}</span>{" "}
          {event.args}
        </div>
      );
    case "injected":
      return (
        <Collapsible label={`Injected · ${event.source}`}>
          <pre className={pre}>{event.text}</pre>
          {event.truncated && <p className="text-xs text-faint">(truncated)</p>}
        </Collapsible>
      );
    case "hook":
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted">
            <span>{`Hook · ${event.hookEvent} · ${event.hookName}`}</span>
            {event.exitCode !== null && (
              <span
                className={`rounded px-1.5 py-0.5 font-mono text-xs ${
                  event.exitCode === 0
                    ? "bg-code text-muted"
                    : "bg-danger/15 text-danger"
                }`}
              >
                {`exit ${event.exitCode}`}
              </span>
            )}
          </div>
          <Collapsible label="Details">
            <div className="space-y-1">
              {event.command && <pre className={pre}>{event.command}</pre>}
              {event.stdout && <pre className={pre}>{event.stdout}</pre>}
              {event.stderr && <pre className={pre}>{event.stderr}</pre>}
              {event.content && <pre className={pre}>{event.content}</pre>}
            </div>
          </Collapsible>
        </div>
      );
    case "text":
      return (
        <div className="max-w-[72ch] space-y-2 text-[15px] leading-relaxed text-fg [&_a]:text-signal [&_a]:underline [&_code]:rounded [&_code]:bg-code [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em] [&_ol]:list-decimal [&_ol]:pl-5 [&_pre]:overflow-x-auto [&_ul]:list-disc [&_ul]:pl-5">
          <Markdown disallowedElements={["img"]} unwrapDisallowed>{event.text}</Markdown>
        </div>
      );
    case "thinking":
      return (
        <Collapsible label="Thinking">
          <div className="whitespace-pre-wrap border-l border-line pl-3 text-sm italic text-muted">
            {event.text || "(thinking not recorded)"}
          </div>
        </Collapsible>
      );
    case "tool":
      return <ToolCard event={event} subagents={subagents} />;
    case "system":
      if (event.subtype === "compact_boundary") {
        return (
          <div className="flex w-full items-center gap-3 text-xs text-faint">
            <hr className="flex-1 border-line" />
            <span>Conversation compacted</span>
            <hr className="flex-1 border-line" />
          </div>
        );
      }
      return <div className="text-xs text-faint">{`${event.subtype}: ${event.text}`}</div>;
    case "raw":
      return (
        <Collapsible label={`Unrecognized · ${event.lineType}`}>
          <pre className={pre}>{JSON.stringify(event.data, null, 2)}</pre>
        </Collapsible>
      );
  }
}
