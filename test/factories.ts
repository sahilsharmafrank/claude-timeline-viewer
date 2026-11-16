import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Switch to the import from src/lib/transcripts/types.ts in Task 2.
export type RawLine = Record<string, unknown>;

const SESSION_ID = "sess-1";
const BASE_MS = Date.parse("2026-11-16T10:00:00.000Z");

type Common = { uuid: string; parent?: string | null; sec?: number };

export function ts(sec: number): string {
  return new Date(BASE_MS + sec * 1000).toISOString();
}

export function makeRoot(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "csv-"));
  const root = path.join(dir, "projects");
  fs.mkdirSync(root, { recursive: true });
  return root;
}

function base(o: Common, cwd = "/work/app"): RawLine {
  return {
    uuid: o.uuid,
    parentUuid: o.parent ?? null,
    timestamp: ts(o.sec ?? 0),
    sessionId: SESSION_ID,
    cwd,
    gitBranch: "main",
    version: "2.1.0",
    isSidechain: false,
    userType: "external",
  };
}

export function userPrompt(
  text: string,
  o: Common & { cwd?: string; extra?: Record<string, unknown> },
): RawLine {
  return {
    ...base(o, o.cwd),
    type: "user",
    message: { role: "user", content: text },
    ...o.extra,
  };
}

export function toolResults(
  results: [id: string, content: string | unknown[], isError: boolean][],
  o: Common,
): RawLine {
  return {
    ...base(o),
    type: "user",
    message: {
      role: "user",
      content: results.map(([id, content, isError]) => ({
        type: "tool_result",
        tool_use_id: id,
        content,
        is_error: isError,
      })),
    },
  };
}

export function assistant(
  msgId: string,
  block: Record<string, unknown>,
  o: Common & { usage?: Record<string, number>; model?: string },
): RawLine {
  return {
    ...base(o),
    type: "assistant",
    message: {
      id: msgId,
      role: "assistant",
      model: o.model ?? "claude-opus-5-5",
      content: [block],
      usage: o.usage ?? {
        input_tokens: 10,
        output_tokens: 5,
        cache_creation_input_tokens: 100,
        cache_read_input_tokens: 1000,
      },
    },
  };
}

export function attachment(
  att: Record<string, unknown>,
  o: Common & { rendered?: string },
): RawLine {
  return {
    ...base(o),
    type: "attachment",
    attachment: att,
    ...(o.rendered !== undefined ? { rendered: [{ content: o.rendered }] } : {}),
  };
}

export function system(
  subtype: string,
  o: Common & { fields?: Record<string, unknown> },
): RawLine {
  return { ...base(o), type: "system", subtype, ...o.fields };
}

export function meta(type: string, fields: Record<string, unknown> = {}): RawLine {
  return { type, sessionId: SESSION_ID, ...fields };
}

function toJsonl(lines: (RawLine | string)[]): string {
  return lines.map((l) => (typeof l === "string" ? l : JSON.stringify(l))).join("\n") + "\n";
}

export function writeSession(
  root: string,
  projectDir: string,
  sessionId: string,
  lines: (RawLine | string)[],
  subagents?: Record<string, [meta: Record<string, unknown>, lines: RawLine[]]>,
): string {
  const dir = path.join(root, projectDir);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${sessionId}.jsonl`);
  fs.writeFileSync(file, toJsonl(lines));
  if (subagents) {
    const subDir = path.join(dir, sessionId, "subagents");
    fs.mkdirSync(subDir, { recursive: true });
    for (const [agentId, [metaJson, subLines]] of Object.entries(subagents)) {
      fs.writeFileSync(path.join(subDir, `agent-${agentId}.meta.json`), JSON.stringify(metaJson));
      fs.writeFileSync(path.join(subDir, `agent-${agentId}.jsonl`), toJsonl(subLines));
    }
  }
  return file;
}
