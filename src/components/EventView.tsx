"use client";

import Markdown from "react-markdown";
import type { Event, SubagentRun } from "@/lib/transcripts/types";
import { Collapsible } from "./Collapsible";
import { ToolCard } from "./tools/ToolCard";

const pre = "overflow-x-auto whitespace-pre-wrap break-words rounded bg-neutral-100 p-2 text-xs dark:bg-neutral-900";

export function EventView({ event, subagents }: { event: Event; subagents: Record<string, SubagentRun> }) {
  switch (event.kind) {
    case "prompt":
      return (
        <div className="rounded border border-blue-300 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
          <div className="mb-1 text-xs font-medium text-blue-700 dark:text-blue-300">You</div>
          <div className="whitespace-pre-wrap">{event.text}</div>
        </div>
      );
    case "command":
      return (
        <div className="text-sm">
          <span className="rounded bg-purple-200 px-1.5 py-0.5 font-mono text-xs dark:bg-purple-900">{event.name}</span>{" "}
          {event.args}
        </div>
      );
    case "injected":
      return (
        <Collapsible label={`Injected · ${event.source}`}>
          <pre className={pre}>{event.text}</pre>
          {event.truncated && <p className="text-xs text-neutral-500">(truncated)</p>}
        </Collapsible>
      );
    case "hook":
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
            <span>{`Hook · ${event.hookEvent} · ${event.hookName}`}</span>
            {event.exitCode !== null && (
              <span
                className={`rounded px-1.5 py-0.5 text-xs ${
                  event.exitCode === 0
                    ? "bg-neutral-200 dark:bg-neutral-800"
                    : "bg-red-200 text-red-900 dark:bg-red-900 dark:text-red-100"
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
        <div className="space-y-2 [&_a]:underline [&_code]:font-mono [&_ol]:list-decimal [&_ol]:pl-5 [&_pre]:overflow-x-auto [&_ul]:list-disc [&_ul]:pl-5">
          <Markdown disallowedElements={["img"]} unwrapDisallowed>{event.text}</Markdown>
        </div>
      );
    case "thinking":
      return (
        <Collapsible label="Thinking">
          <div className="whitespace-pre-wrap text-sm italic text-neutral-600 dark:text-neutral-400">
            {event.text || "(thinking not recorded)"}
          </div>
        </Collapsible>
      );
    case "tool":
      return <ToolCard event={event} subagents={subagents} />;
    case "system":
      if (event.subtype === "compact_boundary") {
        return (
          <div className="flex w-full items-center gap-2 text-xs text-neutral-500">
            <hr className="flex-1 border-neutral-300 dark:border-neutral-700" />
            <span>Conversation compacted</span>
            <hr className="flex-1 border-neutral-300 dark:border-neutral-700" />
          </div>
        );
      }
      return <div className="text-xs text-neutral-500">{`${event.subtype}: ${event.text}`}</div>;
    case "raw":
      return (
        <Collapsible label={`Unrecognized · ${event.lineType}`}>
          <pre className={pre}>{JSON.stringify(event.data, null, 2)}</pre>
        </Collapsible>
      );
  }
}
