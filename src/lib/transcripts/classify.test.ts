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

test("malformed input becomes raw and never throws", () => {
  const cases: [Record<string, unknown>, string][] = [
    [{ type: "user", uuid: "m1", message: "oops" }, "user"],
    [{ type: "user", uuid: "m2" }, "user"],
    [{ type: "assistant", uuid: "m3", message: "oops" }, "assistant"],
    [{ type: "assistant", uuid: "m4", message: { content: "a string" } }, "assistant"],
    [{ type: "attachment", uuid: "m5" }, "attachment"],
    [{ type: "attachment", uuid: "m6", attachment: "str" }, "attachment"],
    [{ type: 5, uuid: "m7" }, "unknown"],
    [{ uuid: "m8" }, "unknown"],
  ];
  for (const [line, lineType] of cases) {
    const e = one(line);
    expect(e).toMatchObject({ kind: "raw", lineType, data: line });
  }
});

test("missing envelope fields default to null/false", () => {
  expect(one({ type: "user", message: { content: "hi" } })).toMatchObject({
    uuid: null, parentUuid: null, timestamp: null, isSidechain: false,
  });
});

test("compact summary is injected with compact_summary source", () => {
  expect(one(userPrompt("This session is being continued", { uuid: "c1", extra: { isCompactSummary: true } })))
    .toMatchObject({ kind: "injected", source: "compact_summary" });
});

test("string starting with < is injected as meta", () => {
  expect(one(userPrompt("<local-command-stdout>x</local-command-stdout>", { uuid: "c2" })))
    .toMatchObject({ kind: "injected", source: "meta" });
});

test("local_command system line becomes a command", () => {
  expect(one(system("local_command", { uuid: "l1", fields: {
    content: "<command-name>/clear</command-name>\n<command-args></command-args>" } })))
    .toMatchObject({ kind: "command", name: "/clear", args: "" });
});

test("unknown assistant block becomes raw", () => {
  expect(one(assistant("m1", { type: "server_tool_use", id: "x" }, { uuid: "a1" })))
    .toMatchObject({ kind: "raw", lineType: "assistant:server_tool_use" });
});

test("plain text block in a user block list is a prompt", () => {
  const l = userPrompt("x", { uuid: "u1" });
  (l.message as Record<string, unknown>).content = [{ type: "text", text: "hello" }];
  expect(one(l)).toMatchObject({ kind: "prompt", text: "hello" });
});

test("injected fallbacks: attachment string content, then JSON", () => {
  expect(one(attachment({ type: "date", content: "2026-11-16" }, { uuid: "i1" })))
    .toMatchObject({ kind: "injected", source: "date", text: "2026-11-16" });
  expect(one(attachment({ type: "environment", cwd: "/x" }, { uuid: "i2" })))
    .toMatchObject({ source: "environment", text: JSON.stringify({ type: "environment", cwd: "/x" }, null, 2) });
});

test("hookName falls back to hookEvent", () => {
  expect(one(attachment({ type: "hook_system_message", hookEvent: "Stop" }, { uuid: "h1" })))
    .toMatchObject({ kind: "hook", hookEvent: "Stop", hookName: "Stop", command: null, exitCode: null, durationMs: null });
});

test("long text is clipped and flagged truncated", () => {
  const big = "x".repeat(20_001);
  const inj = one(attachment({ type: "skill_listing", content: big }, { uuid: "i1" }));
  expect(inj).toMatchObject({ kind: "injected", truncated: true });
  expect((inj as { text: string }).text).toHaveLength(20_000);

  const hook = one(attachment({ type: "hook_success", hookEvent: "X", stdout: big, stderr: big, content: big }, { uuid: "h1" }));
  expect(hook).toMatchObject({ kind: "hook" });
  for (const f of ["stdout", "stderr", "content"] as const) {
    expect((hook as unknown as Record<string, string>)[f]).toHaveLength(20_000);
  }

  const r = extractToolResults(toolResults([["t1", big, false]], { uuid: "u2" }));
  expect(r.get("t1")?.truncated).toBe(true);
  expect(r.get("t1")?.content).toHaveLength(20_000);
});
