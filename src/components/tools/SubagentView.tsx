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
    <div className="space-y-1.5">
      <div className="text-sm text-fg">
        {type && (
          <span className="mr-2 rounded-full border border-line bg-code px-1.5 py-0.5 text-xs text-muted">{type}</span>
        )}
        {description}
      </div>
      {prompt && (
        <Collapsible label="Prompt">
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-code p-2 font-mono text-xs text-fg">{prompt}</pre>
        </Collapsible>
      )}
      {run ? (
        <Collapsible label={`Subagent${run.agentType ? ` · ${run.agentType}` : ""} · ${run.events.length} events`}>
          <div className="mt-1 rounded-md border-l-2 border-line2 pl-3">
            <Timeline events={run.events} subagents={subagents} />
          </div>
        </Collapsible>
      ) : (
        <div className="text-sm text-faint">Subagent transcript not found</div>
      )}
    </div>
  );
}
