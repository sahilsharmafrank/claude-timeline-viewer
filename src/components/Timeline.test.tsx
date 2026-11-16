import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Timeline } from "./Timeline";
import type { Event } from "@/lib/transcripts/types";

const base = { uuid: "same", parentUuid: null, timestamp: "2026-11-16T10:00:00Z", isSidechain: false };

test("events sharing a uuid keep distinct keys and open state across filtering", async () => {
  const err = vi.spyOn(console, "error").mockImplementation(() => {});
  const events: Event[] = [
    { ...base, kind: "prompt", text: "first" },
    { ...base, kind: "thinking", text: "deep thought" },
  ];
  render(<Timeline events={events} subagents={{}} />);
  await userEvent.click(screen.getByRole("button", { name: /thinking/i }));
  expect(screen.getByText("deep thought")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("checkbox", { name: "prompt" }));
  await userEvent.click(screen.getByRole("checkbox", { name: "prompt" }));

  expect(screen.getByText("first")).toBeInTheDocument();
  expect(screen.getByText("deep thought")).toBeInTheDocument();
  expect(err).not.toHaveBeenCalled();
  err.mockRestore();
});
