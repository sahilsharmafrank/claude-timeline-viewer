import "server-only";
import os from "node:os";
import path from "node:path";

export function claudeRoot(): string {
  const env = process.env.CLAUDE_ROOT;
  if (!env) return path.join(os.homedir(), ".claude", "projects");
  if (env === "~") return os.homedir();
  if (env.startsWith("~/")) return path.join(os.homedir(), env.slice(2));
  return env;
}
