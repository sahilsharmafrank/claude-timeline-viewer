import fs from "node:fs";
import { SummaryCache, listSummaries, summarize } from "./aggregate";
import { discover } from "./reader";
import { assistant, makeRoot, meta, toolResults, userPrompt, writeSession } from "../../../test/factories";

const SID = "11111111-2222-3333-4444-555555555555";

function session(root: string, sid = SID, s0 = 0) {
  writeSession(root, "-work-app", sid, [
    userPrompt("fix   the\nlogin bug", { uuid: "u1", sec: s0, cwd: "/work/my.app" }),
    assistant("m1", { type: "thinking", thinking: "hm" }, { uuid: "a1", parent: "u1", sec: s0 + 1 }),
    assistant("m1", { type: "tool_use", id: "t1", name: "Bash", input: { command: "ls" } }, { uuid: "a2", parent: "a1", sec: s0 + 2 }),
    toolResults([["t1", "ok", false]], { uuid: "u2", parent: "a2", sec: s0 + 3 }),
    assistant("m2", { type: "tool_use", id: "t2", name: "Skill", input: { skill: "tdd" } }, { uuid: "a3", parent: "u2", sec: s0 + 4 }),
    assistant("m3", { type: "tool_use", id: "t3", name: "Agent", input: { prompt: "x" } }, { uuid: "a4", parent: "a3", sec: s0 + 90 }),
    meta("ai-title", { aiTitle: "Fix login" }),
  ], { ag1: [{ toolUseId: "t3", agentType: "Explore" },
              [assistant("s1", { type: "text", text: "found" }, { uuid: "x1", sec: s0 + 50 })]] });
}

test("summary fields", () => {
  const root = makeRoot(); session(root);
  const s = summarize(discover(root)[0]);
  expect(s).toMatchObject({ project: "my.app", projectPath: "/work/my.app", title: "Fix login",
    durationSeconds: 90, prompts: 1, assistantMessages: 3, tools: { Bash: 1, Skill: 1, Agent: 1 },
    skills: ["tdd"], subagentCount: 1, models: ["claude-opus-5-5"] });
});

test("tokens counted once per message, including subagents", () => {
  const root = makeRoot(); session(root);
  // main: m1 (2 lines, same usage), m2, m3 = 3 messages; subagent: s1 = 1
  expect(summarize(discover(root)[0]).tokens).toEqual({ input: 40, output: 20, cacheCreation: 400, cacheRead: 4000, total: 4460 });
});

test("title falls back to first prompt", () => {
  const root = makeRoot();
  writeSession(root, "-p", SID, [userPrompt("fix   the\nlogin bug", { uuid: "u1" })]);
  expect(summarize(discover(root)[0]).title).toBe("fix the login bug");
});

test("cache re-parses only on change", () => {
  const root = makeRoot(); session(root);
  const fn = vi.fn(summarize);
  const cache = new SummaryCache(fn);
  listSummaries(root, cache); listSummaries(root, cache);
  expect(fn).toHaveBeenCalledTimes(1);
  const p = discover(root)[0].path;
  fs.appendFileSync(p, "\n");
  listSummaries(root, cache);
  expect(fn).toHaveBeenCalledTimes(2);
});

test("newest first", () => {
  const root = makeRoot();
  session(root, SID, 0);
  session(root, "99999999-2222-3333-4444-555555555555", 1000);
  expect(listSummaries(root, new SummaryCache()).map(s => s.sessionId.slice(0, 2))).toEqual(["99", "11"]);
});

test("one unreadable session does not break the list", () => {
  const root = makeRoot();
  session(root, SID, 0);
  session(root, "99999999-2222-3333-4444-555555555555", 1000);
  const bad = discover(root)[0].path;
  const cache = new SummaryCache((sf) => {
    if (sf.path === bad) fs.unlinkSync(bad);
    return summarize(sf);
  });
  expect(listSummaries(root, cache).map(s => s.sessionId.slice(0, 2))).toEqual(["99"]);
});
