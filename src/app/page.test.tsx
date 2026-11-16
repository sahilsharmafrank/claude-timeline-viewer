import { render, screen } from "@testing-library/react";
import Home from "./page";

test("missing root shows an empty state naming the root", () => {
  process.env.CLAUDE_ROOT = "/definitely/not/here";
  render(Home());
  expect(screen.getByText("No sessions found in /definitely/not/here")).toBeInTheDocument();
  delete process.env.CLAUDE_ROOT;
});
