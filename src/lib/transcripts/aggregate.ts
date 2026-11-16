import "server-only";
import fs from "node:fs";
import path from "node:path";
import { classify } from "./classify";
import { decodeProjectDir, discover, readJsonl, type SessionFile } from "./reader";
import type { RawLine, SessionSummary } from "./types";
import { addUsage, asRecord, asString, emptyTokens } from "./util";

function addDistinct(list: string[], value: string | null): void {
  if (value && !list.includes(value)) list.push(value);
}

function addTokensOncePerMessage(lines: RawLine[], tokens: ReturnType<typeof emptyTokens>): void {
  const seen = new Set<string>();
  for (const line of lines) {
    const message = asRecord(line.message);
    if (!message) continue;
    const id = asString(message.id);
    if (id !== null) {
      if (seen.has(id)) continue;
      seen.add(id);
    }
    addUsage(tokens, message.usage);
  }
}

export function summarize(sf: SessionFile): SessionSummary {
  const lines = readJsonl(sf.path);

  const firstCwd = lines.map((l) => asString(l.cwd)).find((c) => c !== null) ?? null;
  const projectPath = firstCwd ?? decodeProjectDir(sf.projectDir);

  let aiTitle: string | null = null;
  let firstPrompt: string | null = null;
  let minMs: number | null = null;
  let maxMs: number | null = null;
  let minTs: string | null = null;
  let maxTs: string | null = null;
  let prompts = 0;
  const messageIds = new Set<string>();
  const tools: Record<string, number> = {};
  const skills: string[] = [];
  const slashCommands: string[] = [];
  const models: string[] = [];
  let gitBranch: string | null = null;
  let version: string | null = null;

  for (const line of lines) {
    if (line.type === "ai-title") aiTitle = asString(line.aiTitle) ?? aiTitle;

    const timestamp = asString(line.timestamp);
    const ms = timestamp === null ? NaN : Date.parse(timestamp);
    if (timestamp !== null && !Number.isNaN(ms)) {
      if (minMs === null || ms < minMs) [minMs, minTs] = [ms, timestamp];
      if (maxMs === null || ms > maxMs) [maxMs, maxTs] = [ms, timestamp];
    }

    gitBranch = asString(line.gitBranch) ?? gitBranch;
    version = asString(line.version) ?? version;

    const message = asRecord(line.message);
    if (line.type === "assistant" && message) {
      const id = asString(message.id);
      if (id) messageIds.add(id);
      const model = asString(message.model);
      if (model !== "<synthetic>") addDistinct(models, model);
    }

    const attachment = asRecord(line.attachment);
    if (attachment && attachment.type === "invoked_skills" && Array.isArray(attachment.skills)) {
      for (const s of attachment.skills) addDistinct(skills, asString(asRecord(s)?.name));
    }

    for (const ev of classify(line)) {
      if (ev.kind === "prompt") {
        prompts++;
        firstPrompt ??= ev.text;
      } else if (ev.kind === "tool") {
        tools[ev.name] = (tools[ev.name] ?? 0) + 1;
        if (ev.name === "Skill") addDistinct(skills, asString(ev.input.skill));
      } else if (ev.kind === "command") {
        addDistinct(slashCommands, ev.name);
      }
    }
  }

  const tokens = emptyTokens();
  addTokensOncePerMessage(lines, tokens);
  for (const sub of sf.subagents) addTokensOncePerMessage(readJsonl(sub.path), tokens);

  const collapsed = firstPrompt?.replace(/\s+/g, " ").trim().slice(0, 80);
  const title = aiTitle ?? (collapsed ? collapsed : "(untitled)");

  return {
    sessionId: sf.sessionId,
    project: path.basename(projectPath),
    projectPath,
    title,
    startedAt: minTs,
    endedAt: maxTs,
    durationSeconds: minMs !== null && maxMs !== null ? Math.round((maxMs - minMs) / 1000) : null,
    prompts,
    assistantMessages: messageIds.size,
    tokens,
    tools,
    skills,
    slashCommands,
    models,
    gitBranch,
    version,
    subagentCount: sf.subagents.length,
  };
}

export function fingerprint(sf: SessionFile): string {
  return [sf.path, ...sf.subagents.map((s) => s.path)]
    .map((p) => {
      const st = fs.statSync(p);
      return `${st.mtimeMs}:${st.size}`;
    })
    .join("|");
}

export class SummaryCache {
  private entries = new Map<string, { fingerprint: string; summary: SessionSummary }>();

  constructor(private summarizeFn: (sf: SessionFile) => SessionSummary = summarize) {}

  get(sf: SessionFile): SessionSummary {
    const fp = fingerprint(sf);
    const hit = this.entries.get(sf.path);
    if (hit && hit.fingerprint === fp) return hit.summary;
    const summary = this.summarizeFn(sf);
    this.entries.set(sf.path, { fingerprint: fp, summary });
    return summary;
  }
}

export const defaultCache = new SummaryCache();

export function listSummaries(root: string, cache: SummaryCache = defaultCache): SessionSummary[] {
  const out: SessionSummary[] = [];
  for (const sf of discover(root)) {
    try {
      out.push(cache.get(sf));
    } catch {
      // A session that vanished or is unreadable must not break the whole list.
    }
  }
  const key = (s: SessionSummary) => (s.startedAt === null ? null : Date.parse(s.startedAt));
  return out.sort((a, b) => {
    const [ka, kb] = [key(a), key(b)];
    if (ka === kb) return 0;
    if (ka === null) return 1;
    if (kb === null) return -1;
    return kb - ka;
  });
}
