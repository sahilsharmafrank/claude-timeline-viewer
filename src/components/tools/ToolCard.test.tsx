import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToolCard } from "./ToolCard";
import type { SubagentRun, ToolEvent } from "@/lib/transcripts/types";

const tool = (o: Partial<ToolEvent>): ToolEvent => ({
  kind: "tool", uuid: "a", parentUuid: null, timestamp: null, isSidechain: false,
  toolUseId: "t1", name: "Bash", input: {}, result: null, subagentId: null, ...o });

test("bash shows command, output and truncation note", () => {
  render(<ToolCard subagents={{}} event={tool({ input: { command: "ls -la" },
    result: { content: "file.txt", isError: false, truncated: true } })} />);
  expect(screen.getByText("$ ls -la")).toBeInTheDocument();
  expect(screen.getByText("file.txt")).toBeInTheDocument();
  expect(screen.getByText("Output truncated to 20,000 characters")).toBeInTheDocument();
});

test("tool without result says so", () => {
  render(<ToolCard subagents={{}} event={tool({ input: { command: "sleep 9" } })} />);
  expect(screen.getByText("No result recorded")).toBeInTheDocument();
});

test("edit shows removed and added lines", () => {
  render(<ToolCard subagents={{}} event={tool({ name: "Edit",
    input: { file_path: "/a.ts", old_string: "let x = 1", new_string: "const x = 1" } })} />);
  expect(screen.getByText("- let x = 1")).toBeInTheDocument();
  expect(screen.getByText("+ const x = 1")).toBeInTheDocument();
});

test("agent call expands into nested subagent timeline", async () => {
  const run: SubagentRun = { agentId: "ag1", agentType: "Explore", description: "look", model: null, toolUseId: "t1",
    events: [{ kind: "text", text: "found it", model: null, uuid: "x", parentUuid: null, timestamp: null, isSidechain: true }] };
  render(<ToolCard subagents={{ ag1: run }} event={tool({ name: "Agent", input: { description: "look" }, subagentId: "ag1" })} />);
  await userEvent.click(screen.getByRole("button", { name: /Subagent · Explore · 1 events/ }));
  expect(screen.getByText("found it")).toBeInTheDocument();
});

test("unknown tool falls back to generic", () => {
  render(<ToolCard subagents={{}} event={tool({ name: "mcp__x__y", input: { a: 1 } })} />);
  expect(screen.getByText("mcp__x__y")).toBeInTheDocument();
});

test("known tool with missing field falls back instead of crashing", () => {
  render(<ToolCard subagents={{}} event={tool({ name: "Read", input: {} })} />);
  expect(screen.getByText("Read")).toBeInTheDocument();
});

test("error result has red border; missing subagent noted", () => {
  const { container } = render(<ToolCard subagents={{}} event={tool({ name: "Agent", input: {}, subagentId: "zz",
    result: { content: "boom", isError: true, truncated: false } })} />);
  expect(screen.getByText("Subagent transcript not found")).toBeInTheDocument();
  expect(container.querySelector(".border-red-500")).not.toBeNull();
});
