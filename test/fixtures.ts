import type { SessionSummary } from "../src/lib/transcripts/types";

export function makeSummary(overrides: Partial<SessionSummary> = {}): SessionSummary {
  return {
    sessionId: "sess-1",
    project: "app",
    projectPath: "/work/app",
    title: "Untitled session",
    startedAt: "2026-11-16T10:00:00.000Z",
    endedAt: "2026-11-16T10:05:00.000Z",
    durationSeconds: 300,
    prompts: 1,
    assistantMessages: 1,
    tokens: { input: 10, output: 5, cacheCreation: 100, cacheRead: 1000, total: 1115 },
    tools: {},
    skills: [],
    slashCommands: [],
    models: ["claude-opus-5-5"],
    gitBranch: "main",
    version: "2.1.0",
    subagentCount: 0,
    ...overrides,
  };
}
