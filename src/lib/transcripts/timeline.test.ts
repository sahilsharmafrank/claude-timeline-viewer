import { buildDetail } from "./timeline";
import { discover } from "./reader";
import { assistant, makeRoot, toolResults, userPrompt, writeSession } from "../../../test/factories";

const SID = "11111111-2222-3333-4444-555555555555";
const detail = (root: string) => buildDetail(discover(root)[0]);

test("file order and tool pairing", () => {
  const root = makeRoot();
  writeSession(root, "-p", SID, [
    userPrompt("go", { uuid: "u1" }),
    assistant("m1", { type: "tool_use", id: "t1", name: "Read", input: { file_path: "/a" } }, { uuid: "a1", parent: "u1", sec: 1 }),
    toolResults([["t1", "contents", false]], { uuid: "u2", parent: "a1", sec: 2 }),
    assistant("m2", { type: "text", text: "done" }, { uuid: "a2", parent: "u2", sec: 3 }),
  ]);
  const d = detail(root);
  expect(d.events.map(e => e.kind)).toEqual(["prompt", "tool", "text"]);
  expect(d.events[1]).toMatchObject({ result: { content: "contents" } });
});

test("unmatched tool call has no result", () => {
  const root = makeRoot();
  writeSession(root, "-p", SID, [
    assistant("m1", { type: "tool_use", id: "t1", name: "Bash", input: { command: "sleep 99" } }, { uuid: "a1" }),
  ]);
  expect(detail(root).events[0]).toMatchObject({ kind: "tool", result: null });
});

test("clips huge tool results", () => {
  const root = makeRoot();
  writeSession(root, "-p", SID, [
    assistant("m1", { type: "tool_use", id: "t1", name: "Bash", input: { command: "cat big" } }, { uuid: "a1" }),
    toolResults([["t1", "x".repeat(3_000_000), false]], { uuid: "u2", parent: "a1", sec: 1 }),
  ]);
  const ev = detail(root).events[0];
  expect(ev.kind === "tool" && ev.result?.content.length).toBe(20_000);
  expect(ev).toMatchObject({ result: { truncated: true } });
});

test("nested subagents link by toolUseId", () => {
  const root = makeRoot();
  writeSession(root, "-p", SID, [
    assistant("m1", { type: "tool_use", id: "t1", name: "Agent", input: { prompt: "look" } }, { uuid: "a1" }),
  ], {
    ag1: [{ toolUseId: "t1", agentType: "Explore", description: "look around" },
          [assistant("s1", { type: "tool_use", id: "t2", name: "Agent", input: {} }, { uuid: "x1" })]],
    ag2: [{ toolUseId: "t2", agentType: "general-purpose" },
          [assistant("s2", { type: "text", text: "deep" }, { uuid: "y1" })]],
  });
  const d = detail(root);
  expect(d.events[0]).toMatchObject({ subagentId: "ag1" });
  expect(d.subagents.ag1.agentType).toBe("Explore");
  expect(d.subagents.ag1.events[0]).toMatchObject({ subagentId: "ag2" });
  expect(d.subagents.ag2.events[0]).toMatchObject({ kind: "text", text: "deep" });
});
