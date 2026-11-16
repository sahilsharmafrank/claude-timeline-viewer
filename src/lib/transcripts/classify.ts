import "server-only";
import type { Event, RawLine, ToolResult } from "./types";
import { asNumber, asRecord, asString, clip } from "./util";

export const BOOKKEEPING_TYPES: ReadonlySet<string> = new Set([
  "ai-title",
  "last-prompt",
  "mode",
  "permission-mode",
  "atis-latch",
  "api-request",
  "api-request-blob",
  "api-request-shape",
  "queue-operation",
  "file-history-snapshot",
  "file-history-delta",
  "cost-state",
  "tools-used",
]);

const HOOK_ATTACHMENT_TYPES: ReadonlySet<string> = new Set([
  "hook_success",
  "async_hook_response",
  "hook_additional_context",
  "hook_system_message",
]);

type Base = Pick<Event, "uuid" | "parentUuid" | "timestamp" | "isSidechain">;

function baseOf(line: RawLine): Base {
  return {
    uuid: asString(line.uuid),
    parentUuid: asString(line.parentUuid),
    timestamp: asString(line.timestamp),
    isSidechain: line.isSidechain === true,
  };
}

function tag(text: string, name: string): string | null {
  const m = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`).exec(text);
  return m ? m[1].trim() : null;
}

function commandEvent(base: Base, text: string): Event | null {
  const name = tag(text, "command-name");
  if (name === null) return null;
  return { ...base, kind: "command", name, args: tag(text, "command-args") ?? "" };
}

function injected(base: Base, source: string, text: string): Event {
  const [clipped, truncated] = clip(text);
  return { ...base, kind: "injected", source, text: clipped, truncated };
}

function joinText(v: unknown, sep: string): string {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.map((x) => asString(x) ?? JSON.stringify(x)).join(sep);
  return "";
}

function rawEvent(base: Base, line: RawLine, lineType: string): Event {
  return { ...base, kind: "raw", lineType, data: line };
}

function classifyUser(base: Base, line: RawLine): Event[] {
  const content = asRecord(line.message)?.content;
  if (typeof content === "string") {
    if (content.includes("<command-name>")) {
      const cmd = commandEvent(base, content);
      if (cmd) return [cmd];
    }
    const compact = line.isCompactSummary === true;
    if (compact || line.isMeta === true || content.startsWith("<")) {
      return [injected(base, compact ? "compact_summary" : "meta", content)];
    }
    return [{ ...base, kind: "prompt", text: content }];
  }
  if (Array.isArray(content)) {
    const events: Event[] = [];
    for (const item of content) {
      const block = asRecord(item);
      const type = asString(block?.type);
      if (type === "tool_result") continue;
      if (type === "text") {
        const text = asString(block?.text) ?? "";
        events.push(
          text.startsWith("<system-reminder>")
            ? injected(base, "system-reminder", text)
            : { ...base, kind: "prompt", text },
        );
      } else {
        events.push(rawEvent(base, line, `user:${type ?? "unknown"}`));
      }
    }
    return events;
  }
  return [rawEvent(base, line, "user")];
}

function classifyAssistant(base: Base, line: RawLine): Event[] {
  const message = asRecord(line.message);
  const content = message?.content;
  if (!Array.isArray(content)) return [rawEvent(base, line, "assistant")];
  return content.map((item): Event => {
    const block = asRecord(item);
    const type = asString(block?.type);
    if (block && type === "text") {
      return { ...base, kind: "text", text: asString(block.text) ?? "", model: asString(message?.model) };
    }
    if (block && type === "thinking") {
      return { ...base, kind: "thinking", text: asString(block.thinking) ?? "" };
    }
    if (block && type === "tool_use") {
      return {
        ...base,
        kind: "tool",
        toolUseId: asString(block.id) ?? "",
        name: asString(block.name) ?? "",
        input: asRecord(block.input) ?? {},
        result: null,
        subagentId: null,
      };
    }
    return rawEvent(base, line, `assistant:${type ?? "unknown"}`);
  });
}

function clipped(text: string): string {
  return clip(text)[0];
}

function classifyAttachment(base: Base, line: RawLine): Event[] {
  const att = asRecord(line.attachment);
  if (!att) return [rawEvent(base, line, "attachment")];
  const type = asString(att.type) ?? "";
  if (HOOK_ATTACHMENT_TYPES.has(type)) {
    const hookEvent = asString(att.hookEvent) ?? "";
    return [
      {
        ...base,
        kind: "hook",
        hookEvent,
        hookName: asString(att.hookName) ?? hookEvent,
        command: asString(att.command),
        exitCode: asNumber(att.exitCode),
        durationMs: asNumber(att.durationMs),
        stdout: clipped(asString(att.stdout) ?? ""),
        stderr: clipped(asString(att.stderr) ?? ""),
        content: clipped(joinText(att.content, "\n\n")),
      },
    ];
  }
  let text: string;
  if (Array.isArray(line.rendered)) {
    text = line.rendered.map((r) => asString(asRecord(r)?.content) ?? "").join("\n");
  } else if (typeof att.content === "string") {
    text = att.content;
  } else {
    text = JSON.stringify(att, null, 2);
  }
  return [injected(base, type, text)];
}

function classifySystem(base: Base, line: RawLine): Event[] {
  const subtype = asString(line.subtype) ?? "";
  if (subtype === "stop_hook_summary") {
    const infos = Array.isArray(line.hookInfos) ? line.hookInfos : [];
    const commands = infos.map((i) => asString(asRecord(i)?.command)).filter((c): c is string => c !== null);
    return [
      {
        ...base,
        kind: "hook",
        hookEvent: "Stop",
        hookName: "Stop",
        command: null,
        exitCode: null,
        durationMs: null,
        stdout: "",
        stderr: "",
        content: clipped(commands.join("\n")),
      },
    ];
  }
  const content = asString(line.content) ?? "";
  if (subtype === "local_command") {
    const cmd = commandEvent(base, content);
    if (cmd) return [cmd];
  }
  return [{ ...base, kind: "system", subtype, text: clipped(content) }];
}

export function classify(line: RawLine): Event[] {
  try {
    const type = asString(line.type);
    if (type !== null && BOOKKEEPING_TYPES.has(type)) return [];
    const base = baseOf(line);
    switch (type) {
      case "user":
        return classifyUser(base, line);
      case "assistant":
        return classifyAssistant(base, line);
      case "attachment":
        return classifyAttachment(base, line);
      case "system":
        return classifySystem(base, line);
      default:
        return [rawEvent(base, line, type ?? "unknown")];
    }
  } catch {
    return [rawEvent(baseOf(line), line, asString(line?.type) ?? "unknown")];
  }
}

function normalizeContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((item) => {
      const block = asRecord(item);
      if (block?.type === "image") return "[image]";
      return asString(block?.text);
    })
    .filter((s): s is string => s !== null)
    .join("\n");
}

export function extractToolResults(line: RawLine): Map<string, ToolResult> {
  const results = new Map<string, ToolResult>();
  if (line.type !== "user") return results;
  const content = asRecord(line.message)?.content;
  if (!Array.isArray(content)) return results;
  for (const item of content) {
    const block = asRecord(item);
    const id = asString(block?.tool_use_id);
    if (!block || block.type !== "tool_result" || id === null) continue;
    const [text, truncated] = clip(normalizeContent(block.content));
    results.set(id, { content: text, isError: block.is_error === true, truncated });
  }
  return results;
}
