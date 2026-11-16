import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { RawLine } from "./types";
import { asRecord } from "./util";

export type SubagentFile = { agentId: string; path: string; metaPath: string | null };
export type SessionFile = {
  sessionId: string;
  projectDir: string;
  path: string;
  subagents: SubagentFile[];
};

const SESSION_ID_RE = /^[A-Za-z0-9-]{1,64}$/;

function listDir(dir: string): fs.Dirent[] {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

function byName(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function findSubagents(projectPath: string, sessionId: string): SubagentFile[] {
  const subDir = path.join(projectPath, sessionId, "subagents");
  const subagents: SubagentFile[] = [];
  for (const e of listDir(subDir)) {
    if (!e.isFile() || !e.name.startsWith("agent-") || !e.name.endsWith(".jsonl")) continue;
    const agentId = e.name.slice("agent-".length, -".jsonl".length);
    const metaPath = path.join(subDir, `agent-${agentId}.meta.json`);
    subagents.push({
      agentId,
      path: path.join(subDir, e.name),
      metaPath: fs.existsSync(metaPath) ? metaPath : null,
    });
  }
  return subagents.sort((a, b) => byName(a.agentId, b.agentId));
}

export function discover(root: string): SessionFile[] {
  const sessions: SessionFile[] = [];
  for (const proj of listDir(root)) {
    if (!proj.isDirectory()) continue;
    const projectPath = path.join(root, proj.name);
    for (const e of listDir(projectPath)) {
      if (!e.isFile() || !e.name.endsWith(".jsonl")) continue;
      const sessionId = e.name.slice(0, -".jsonl".length);
      sessions.push({
        sessionId,
        projectDir: proj.name,
        path: path.join(projectPath, e.name),
        subagents: findSubagents(projectPath, sessionId),
      });
    }
  }
  return sessions.sort(
    (a, b) => byName(a.projectDir, b.projectDir) || byName(a.sessionId, b.sessionId),
  );
}

export function findSession(root: string, sessionId: string): SessionFile | null {
  if (!SESSION_ID_RE.test(sessionId)) return null;
  return discover(root).find((s) => s.sessionId === sessionId) ?? null;
}

export function readJsonl(file: string): RawLine[] {
  const lines: RawLine[] = [];
  for (const text of fs.readFileSync(file, "utf8").split("\n")) {
    if (!text.trim()) continue;
    try {
      const obj = asRecord(JSON.parse(text));
      if (obj) lines.push(obj);
    } catch {
      // skip non-JSON or partially written lines
    }
  }
  return lines;
}

export function readMeta(file: string | null): Record<string, unknown> {
  if (!file) return {};
  try {
    return asRecord(JSON.parse(fs.readFileSync(file, "utf8"))) ?? {};
  } catch {
    return {};
  }
}

// Lossy: "/" and "." both become "-" on disk, so this is only a fallback.
export function decodeProjectDir(name: string): string {
  return name.replace(/-/g, "/");
}
