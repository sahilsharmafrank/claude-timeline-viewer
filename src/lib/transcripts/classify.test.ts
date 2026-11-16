import { classify, extractToolResults } from "./classify";
import { assistant, attachment, meta, system, toolResults, userPrompt } from "../../../test/factories";

const one = (l: Parameters<typeof classify>[0]) => { const e = classify(l); expect(e).toHaveLength(1); return e[0]; };

test("typed prompt", () => {
  expect(one(userPrompt("fix the bug", { uuid: "u1" }))).toMatchObject({ kind: "prompt", text: "fix the bug", uuid: "u1" });
});

test("slash command", () => {
  const text = "<command-message>superpowers:brainstorming</command-message>\n" +
    "<command-name>/superpowers:brainstorming</command-name>\n<command-args>x y</command-args>";
  expect(one(userPrompt(text, { uuid: "u1" }))).toMatchObject({ kind: "command", name: "/superpowers:brainstorming", args: "x y" });
});

test("meta user string is injected", () => {
  expect(one(userPrompt("<task-notification>done</task-notification>", { uuid: "u1", extra: { isMeta: true } })))
    .toMatchObject({ kind: "injected", source: "meta" });
});

test("system-reminder text block is injected", () => {
  const l = userPrompt("x", { uuid: "u1" });
  (l.message as Record<string, unknown>).content = [{ type: "text", text: "<system-reminder>ctx</system-reminder>" }];
  expect(one(l)).toMatchObject({ kind: "injected", source: "system-reminder" });
});

test("assistant blocks", () => {
  expect(one(assistant("m1", { type: "thinking", thinking: "hmm" }, { uuid: "a1" }))).toMatchObject({ kind: "thinking", text: "hmm" });
  expect(one(assistant("m1", { type: "tool_use", id: "t1", name: "Bash", input: { command: "ls" } }, { uuid: "a2" })))
    .toMatchObject({ kind: "tool", toolUseId: "t1", name: "Bash", input: { command: "ls" }, result: null });
  expect(one(assistant("m1", { type: "text", text: "done" }, { uuid: "a3" }))).toMatchObject({ kind: "text", model: "claude-opus-5-5" });
});

test("hook attachment", () => {
  expect(one(attachment({ type: "hook_success", hookEvent: "SessionStart", hookName: "SessionStart:startup",
    command: "boot.sh", exitCode: 0, stdout: "", stderr: "warn", durationMs: 12, content: "" }, { uuid: "h1" })))
    .toMatchObject({ kind: "hook", hookEvent: "SessionStart", hookName: "SessionStart:startup", exitCode: 0, stderr: "warn" });
});

test("hook additional context joins list content", () => {
  expect(one(attachment({ type: "hook_additional_context", hookEvent: "SessionStart", hookName: "SessionStart",
    content: ["a", "b"] }, { uuid: "h1" }))).toMatchObject({ content: "a\n\nb" });
});

test("other attachment uses rendered text", () => {
  expect(one(attachment({ type: "skill_listing", content: "- x" }, { uuid: "i1", rendered: "<system-reminder>skills</system-reminder>" })))
    .toMatchObject({ kind: "injected", source: "skill_listing", text: "<system-reminder>skills</system-reminder>" });
});

test("stop hook summary and compaction", () => {
  expect(one(system("stop_hook_summary", { uuid: "s1", fields: { hookInfos: [{ command: "a.sh" }, { command: "b.sh" }] } })))
    .toMatchObject({ kind: "hook", hookEvent: "Stop", content: "a.sh\nb.sh" });
  expect(one(system("compact_boundary", { uuid: "s2", fields: { content: "Conversation compacted" } })))
    .toMatchObject({ kind: "system", subtype: "compact_boundary" });
});

test("bookkeeping dropped, unknown kept", () => {
  expect(classify(meta("ai-title", { aiTitle: "T" }))).toEqual([]);
  expect(classify(meta("api-request-blob", { message: {} }))).toEqual([]);
  expect(one({ type: "brand-new", uuid: "z1", foo: 1 })).toMatchObject({ kind: "raw", lineType: "brand-new", data: { foo: 1 } });
});

test("extractToolResults normalizes content", () => {
  const r = extractToolResults(toolResults([["t1", "out", false],
    ["t2", [{ type: "text", text: "a" }, { type: "image" }], true]], { uuid: "u2" }));
  expect(r.get("t1")).toEqual({ content: "out", isError: false, truncated: false });
  expect(r.get("t2")).toEqual({ content: "a\n[image]", isError: true, truncated: false });
});
