import "server-only";
import type { TokenTotals } from "./types";

const USAGE_KEYS = [
  "input_tokens",
  "output_tokens",
  "cache_creation_input_tokens",
  "cache_read_input_tokens",
] as const;

export function emptyTokens(): TokenTotals {
  return { input: 0, output: 0, cacheCreation: 0, cacheRead: 0, total: 0 };
}

export function addUsage(t: TokenTotals, usage: unknown): void {
  const u = asRecord(usage);
  if (!u) return;
  const [input, output, cacheCreation, cacheRead] = USAGE_KEYS.map((k) => asNumber(u[k]) ?? 0);
  t.input += input;
  t.output += output;
  t.cacheCreation += cacheCreation;
  t.cacheRead += cacheRead;
  t.total = t.input + t.output + t.cacheCreation + t.cacheRead;
}

export function clip(text: string, limit = 20_000): [string, boolean] {
  return text.length > limit ? [text.slice(0, limit), true] : [text, false];
}

export function asRecord(v: unknown): Record<string, unknown> | null {
  return typeof v === "object" && v !== null && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

export function asString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

export function asNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
