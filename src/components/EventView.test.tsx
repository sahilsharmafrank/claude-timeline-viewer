import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EventView } from "./EventView";
import type { Event } from "@/lib/transcripts/types";

const base = { uuid: "u", parentUuid: null, timestamp: "2026-11-16T10:00:00Z", isSidechain: false };
const show = (event: Event) => render(<EventView event={event} subagents={{}} />);

test("thinking is collapsed by default", async () => {
  show({ ...base, kind: "thinking", text: "secret plan" });
  expect(screen.queryByText("secret plan")).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: /thinking/i }));
  expect(screen.getByText("secret plan")).toBeInTheDocument();
});

test("injected shows source and stays collapsed", () => {
  show({ ...base, kind: "injected", source: "skill_listing", text: "skills…", truncated: false });
  expect(screen.getByRole("button", { name: /Injected · skill_listing/ })).toHaveAttribute("aria-expanded", "false");
});

test("failing hook shows exit code", () => {
  show({ ...base, kind: "hook", hookEvent: "PreToolUse", hookName: "PreToolUse:Bash", command: "gate.sh",
         exitCode: 2, durationMs: 5, stdout: "", stderr: "blocked", content: "" });
  expect(screen.getByText(/Hook · PreToolUse · PreToolUse:Bash/)).toBeInTheDocument();
  expect(screen.getByText("exit 2")).toBeInTheDocument();
});

test("unknown line type is still shown", () => {
  show({ ...base, kind: "raw", lineType: "brand-new", data: { foo: 1 } });
  expect(screen.getByRole("button", { name: /Unrecognized · brand-new/ })).toBeInTheDocument();
});

test("markdown images are not rendered", () => {
  const { container } = show({ ...base, kind: "text", text: "hi ![x](http://e/x.png)", model: null });
  expect(container.querySelector("img")).toBeNull();
});

test("raw html in text is not rendered as elements", () => {
  const { container } = show({ ...base, kind: "text", text: "<script>alert(1)</script><b>hi</b>", model: null });
  expect(container.querySelector("script")).toBeNull();
  expect(container.querySelector("b")).toBeNull();
});
