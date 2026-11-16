"use client";

import type { SubagentRun, ToolEvent } from "@/lib/transcripts/types";
import { Collapsible } from "../Collapsible";
import { BashView } from "./BashView";
import { EditView } from "./EditView";
import { GenericToolView } from "./GenericToolView";
import { GrepView } from "./GrepView";
import { ReadView } from "./ReadView";
import { SkillView } from "./SkillView";
import { SubagentView } from "./SubagentView";
import { WriteView } from "./WriteView";

const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);
const num = (v: unknown): number | undefined => (typeof v === "number" ? v : undefined);

function ToolView({ event, subagents }: { event: ToolEvent; subagents: Record<string, SubagentRun> }) {
  const i = event.input;
  switch (event.name) {
    case "Read": {
      const filePath = str(i.file_path);
      if (filePath !== undefined) return <ReadView filePath={filePath} offset={num(i.offset)} limit={num(i.limit)} />;
      break;
    }
    case "Edit": {
      const filePath = str(i.file_path);
      const oldString = str(i.old_string);
      const newString = str(i.new_string);
      if (filePath !== undefined && oldString !== undefined && newString !== undefined)
        return <EditView filePath={filePath} oldString={oldString} newString={newString} replaceAll={i.replace_all === true} />;
      break;
    }
    case "Write": {
      const filePath = str(i.file_path);
      const content = str(i.content);
      if (filePath !== undefined && content !== undefined) return <WriteView filePath={filePath} content={content} />;
      break;
    }
    case "Bash": {
      const command = str(i.command);
      if (command !== undefined) return <BashView command={command} description={str(i.description)} />;
      break;
    }
    case "Grep":
    case "Glob": {
      const pattern = str(i.pattern);
      if (pattern !== undefined) return <GrepView pattern={pattern} path={str(i.path)} glob={str(i.glob)} />;
      break;
    }
    case "Skill": {
      const skill = str(i.skill);
      if (skill !== undefined) return <SkillView skill={skill} args={str(i.args)} />;
      break;
    }
    case "Agent":
    case "Task":
      return <SubagentView event={event} subagents={subagents} />;
  }
  return <GenericToolView input={i} />;
}

export function ToolCard({ event, subagents }: { event: ToolEvent; subagents: Record<string, SubagentRun> }) {
  const { result } = event;
  const pre = (
    <pre className="max-h-96 overflow-auto whitespace-pre-wrap font-mono text-xs">{result?.content}</pre>
  );
  return (
    <div className="space-y-2 rounded border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700">
      <h4 className="font-semibold">{event.name}</h4>
      <ToolView event={event} subagents={subagents} />
      {result === null ? (
        <div className="text-neutral-500">No result recorded</div>
      ) : (
        <div className={`rounded border px-2 py-1 ${result.isError ? "border-red-500" : "border-transparent"}`}>
          {event.name === "Bash" ? pre : <Collapsible label="Result">{pre}</Collapsible>}
          {result.truncated && (
            <div className="text-xs text-amber-600">Output truncated to 20,000 characters</div>
          )}
        </div>
      )}
    </div>
  );
}
