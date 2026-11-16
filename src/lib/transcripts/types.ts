// Type-only module: no runtime code, no server-only import.

export type RawLine = Record<string, unknown>;

export type TokenTotals = {
  input: number;
  output: number;
  cacheCreation: number;
  cacheRead: number;
  total: number;
};

export type ToolResult = {
  content: string;
  isError: boolean;
  truncated: boolean;
};

export type EventBase = {
  uuid: string | null;
  parentUuid: string | null;
  timestamp: string | null;
  isSidechain: boolean;
};

export type Event = EventBase &
  (
    | { kind: "prompt"; text: string }
    | { kind: "command"; name: string; args: string }
    | { kind: "injected"; source: string; text: string; truncated: boolean }
    | {
        kind: "hook";
        hookEvent: string;
        hookName: string;
        command: string | null;
        exitCode: number | null;
        durationMs: number | null;
        stdout: string;
        stderr: string;
        content: string;
      }
    | { kind: "text"; text: string; model: string | null }
    | { kind: "thinking"; text: string }
    | {
        kind: "tool";
        toolUseId: string;
        name: string;
        input: Record<string, unknown>;
        result: ToolResult | null;
        subagentId: string | null;
      }
    | { kind: "system"; subtype: string; text: string }
    | { kind: "raw"; lineType: string; data: Record<string, unknown> }
  );

export type EventKind = Event["kind"];
export type EventOf<K extends EventKind> = Extract<Event, { kind: K }>;
export type ToolEvent = EventOf<"tool">;

export type SessionSummary = {
  sessionId: string;
  project: string;
  projectPath: string;
  title: string;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  prompts: number;
  assistantMessages: number;
  tokens: TokenTotals;
  tools: Record<string, number>;
  skills: string[];
  slashCommands: string[];
  models: string[];
  gitBranch: string | null;
  version: string | null;
  subagentCount: number;
};

export type SubagentRun = {
  agentId: string;
  agentType: string | null;
  description: string | null;
  model: string | null;
  toolUseId: string | null;
  events: Event[];
};

export type SessionDetail = {
  summary: SessionSummary;
  events: Event[];
  subagents: Record<string, SubagentRun>;
};
