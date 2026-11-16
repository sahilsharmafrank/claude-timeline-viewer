import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SessionTable, filterSessions } from "./SessionTable";
import { makeSummary } from "../../test/fixtures";

const a = makeSummary({ sessionId: "a", title: "Fix login", project: "web", startedAt: "2026-11-15T10:00:00Z", tools: { Bash: 5, Read: 2 } });
const b = makeSummary({ sessionId: "b", title: "Add charts", project: "api", startedAt: "2026-11-16T10:00:00Z", tools: { Edit: 1 } });

test("newest first by default and row click selects", async () => {
  const onSelect = vi.fn();
  render(<SessionTable sessions={[a, b]} onSelect={onSelect} />);
  const rows = screen.getAllByRole("row").slice(1);
  expect(within(rows[0]).getByText("Add charts")).toBeInTheDocument();
  await userEvent.click(rows[1]);
  expect(onSelect).toHaveBeenCalledWith("a");
});

test("filter matches title, project and tool names", () => {
  expect(filterSessions([a, b], "LOGIN").map(s => s.sessionId)).toEqual(["a"]);
  expect(filterSessions([a, b], "api").map(s => s.sessionId)).toEqual(["b"]);
  expect(filterSessions([a, b], "bash").map(s => s.sessionId)).toEqual(["a"]);
});

test("date cell shows the viewer's local date and time", () => {
  render(<SessionTable sessions={[a]} onSelect={vi.fn()} />);
  const d = new Date("2026-11-15T10:00:00Z");
  const expected = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  const time = screen.getByText(expected);
  expect(time.tagName).toBe("TIME");
  expect(time).toHaveAttribute("datetime", "2026-11-15T10:00:00Z");
});
