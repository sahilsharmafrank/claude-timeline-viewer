import fs from "node:fs";
import { decodeProjectDir, discover, findSession, readJsonl } from "./reader";
import { makeRoot, userPrompt, writeSession } from "../../../test/factories";

const SID = "11111111-2222-3333-4444-555555555555";

test("discovers sessions and their subagents", () => {
  const root = makeRoot();
  writeSession(root, "-work-app", SID, [userPrompt("hi", { uuid: "u1" })],
    { a1: [{ toolUseId: "t1" }, [userPrompt("sub", { uuid: "s1" })]] });
  const [sf] = discover(root);
  expect(sf.sessionId).toBe(SID);
  expect(sf.projectDir).toBe("-work-app");
  expect(sf.subagents.map(s => s.agentId)).toEqual(["a1"]);
  expect(sf.subagents[0].metaPath).not.toBeNull();
  expect(discover(root)).toHaveLength(1); // subagent files are not sessions
});

test("missing root is empty", () => {
  expect(discover("/definitely/not/here")).toEqual([]);
});

test("skips bad lines", () => {
  const p = writeSession(makeRoot(), "-p", SID, ["not json", "[1,2]", "", userPrompt("ok", { uuid: "u1" })]);
  expect(readJsonl(p).map(l => l.uuid)).toEqual(["u1"]);
});

test("skips a partial last line", () => {
  const p = writeSession(makeRoot(), "-p", SID, [userPrompt("ok", { uuid: "u1" })]);
  fs.appendFileSync(p, '{"type": "assistant", "mess');
  expect(readJsonl(p)).toHaveLength(1);
});

test("findSession rejects traversal and unknown ids", () => {
  const root = makeRoot();
  writeSession(root, "-p", SID, [userPrompt("ok", { uuid: "u1" })]);
  expect(findSession(root, SID)?.sessionId).toBe(SID);
  expect(findSession(root, "../../etc/passwd")).toBeNull();
  expect(findSession(root, "nope")).toBeNull();
});

test("decodeProjectDir", () => {
  expect(decodeProjectDir("-Users-me-code-app")).toBe("/Users/me/code/app");
});
