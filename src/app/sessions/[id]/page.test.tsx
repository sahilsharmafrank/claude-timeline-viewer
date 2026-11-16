import fs from "node:fs";
import { render, screen } from "@testing-library/react";
import SessionPage from "./page";
import { makeRoot, userPrompt, writeSession } from "../../../../test/factories";

const SID = "11111111-2222-3333-4444-555555555555";
const page = (id: string) => SessionPage({ params: Promise.resolve({ id }) });

beforeEach(() => {
  const root = makeRoot();
  writeSession(root, "-p", SID, [userPrompt("hello there", { uuid: "u1" })]);
  process.env.CLAUDE_ROOT = root;
});
afterEach(() => { delete process.env.CLAUDE_ROOT; });

test("renders a session", async () => {
  render(await page(SID));
  expect(screen.getAllByText("hello there").length).toBeGreaterThan(0);
});

test("traversal and unknown ids are not found", async () => {
  await expect(page("../../etc/passwd")).rejects.toThrow("NEXT_NOT_FOUND");
  await expect(page("nope")).rejects.toThrow("NEXT_NOT_FOUND");
});

test("session deleted between lookup and read is not found", async () => {
  const real = fs.readFileSync;
  const spy = vi.spyOn(fs, "readFileSync").mockImplementation(((p: fs.PathOrFileDescriptor, ...rest: unknown[]) => {
    if (String(p).endsWith(`${SID}.jsonl`)) throw Object.assign(new Error("gone"), { code: "ENOENT" });
    return (real as (...a: unknown[]) => unknown)(p, ...rest);
  }) as typeof fs.readFileSync);
  try {
    await expect(page(SID)).rejects.toThrow("NEXT_NOT_FOUND");
  } finally {
    spy.mockRestore();
  }
});
