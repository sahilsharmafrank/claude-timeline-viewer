import os from "node:os";
import path from "node:path";
import { claudeRoot } from "./config";

afterEach(() => { delete process.env.CLAUDE_ROOT; });

test("env var overrides root", () => {
  process.env.CLAUDE_ROOT = "/tmp/x";
  expect(claudeRoot()).toBe("/tmp/x");
});
test("default root", () => {
  expect(claudeRoot()).toBe(path.join(os.homedir(), ".claude", "projects"));
});
test("expands ~", () => {
  process.env.CLAUDE_ROOT = "~/y";
  expect(claudeRoot()).toBe(path.join(os.homedir(), "y"));
});
