import { render, screen } from "@testing-library/react";
import { HeaderStrip } from "./HeaderStrip";
import { makeSummary } from "../../test/fixtures";

test("shows token total, tool tally, skills and duration", () => {
  render(<HeaderStrip summary={makeSummary({
    tokens: { input: 40, output: 20, cacheCreation: 400, cacheRead: 4000, total: 4460 },
    tools: { Bash: 5, Read: 2 }, skills: ["tdd"], durationSeconds: 185 })} />);
  expect(screen.getByText("4.5k")).toBeInTheDocument();
  expect(screen.getByText("Bash×5")).toBeInTheDocument();
  expect(screen.getByText("tdd")).toBeInTheDocument();
  expect(screen.getByText("3m 05s")).toBeInTheDocument();
});

test("shows the full session id", () => {
  render(<HeaderStrip summary={makeSummary({ sessionId: "11111111-2222-3333-4444-555555555555" })} />);
  expect(screen.getByText("11111111-2222-3333-4444-555555555555")).toBeInTheDocument();
});
