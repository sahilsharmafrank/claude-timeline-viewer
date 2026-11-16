import "server-only";
import { classify, extractToolResults } from "./classify";
import { summarize } from "./aggregate";
import { readJsonl, readMeta, type SessionFile } from "./reader";
import { asString } from "./util";
import type { Event, SessionDetail, SubagentRun, ToolResult } from "./types";

/** Events in file order, with each tool call paired to its result (if any). */
export function buildEvents(file: string): Event[] {
  const lines = readJsonl(file);
  const results = new Map<string, ToolResult>();
  for (const line of lines) {
    for (const [id, result] of extractToolResults(line)) results.set(id, result);
  }
  return lines
    .flatMap((line) => classify(line))
    .map((ev) =>
      ev.kind === "tool" ? { ...ev, result: results.get(ev.toolUseId) ?? null } : ev,
    );
}

export function buildDetail(sf: SessionFile): SessionDetail {
  const subagents: Record<string, SubagentRun> = {};
  const byToolUse = new Map<string, string>();
  for (const sub of sf.subagents) {
    const meta = readMeta(sub.metaPath);
    const toolUseId = asString(meta.toolUseId);
    subagents[sub.agentId] = {
      agentId: sub.agentId,
      agentType: asString(meta.agentType),
      description: asString(meta.description),
      model: asString(meta.model),
      toolUseId,
      events: buildEvents(sub.path),
    };
    if (toolUseId) byToolUse.set(toolUseId, sub.agentId);
  }

  const link = (events: Event[]): Event[] =>
    events.map((ev) =>
      ev.kind === "tool" ? { ...ev, subagentId: byToolUse.get(ev.toolUseId) ?? null } : ev,
    );

  for (const run of Object.values(subagents)) run.events = link(run.events);

  return {
    summary: summarize(sf),
    events: link(buildEvents(sf.path)),
    subagents,
  };
}
