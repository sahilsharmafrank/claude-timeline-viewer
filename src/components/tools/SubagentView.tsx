import type { SubagentRun, ToolEvent } from "@/lib/transcripts/types";
import { Collapsible } from "../Collapsible";
import { Timeline } from "../Timeline";

const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

export function SubagentView({
  event,
  subagents,
}: {
  event: ToolEvent;
  subagents: Record<string, SubagentRun>;
}) {
  const type = str(event.input.subagent_type);
  const description = str(event.input.description);
  const prompt = str(event.input.prompt);
  const run = event.subagentId ? subagents[event.subagentId] : undefined;
  return (
    <div className="space-y-1">
      <div className="text-sm">
        {type && <span className="mr-2 rounded bg-neutral-200 px-1.5 py-0.5 text-xs dark:bg-neutral-700">{type}</span>}
        {description}
      </div>
      {prompt && (
        <Collapsible label="Prompt">
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap font-mono text-xs">{prompt}</pre>
        </Collapsible>
      )}
      {run ? (
        <Collapsible label={`Subagent${run.agentType ? ` · ${run.agentType}` : ""} · ${run.events.length} events`}>
          <Timeline events={run.events} subagents={subagents} />
        </Collapsible>
      ) : (
        <div className="text-sm text-neutral-500">Subagent transcript not found</div>
      )}
    </div>
  );
}
