import { formatDuration, formatTokens } from "./format";
test("formatDuration", () => {
  expect(formatDuration(null)).toBe("—");
  expect(formatDuration(42)).toBe("42s");
  expect(formatDuration(185)).toBe("3m 05s");
  expect(formatDuration(3720)).toBe("1h 02m");
});
test("formatTokens", () => {
  expect(formatTokens(950)).toBe("950");
  expect(formatTokens(1234)).toBe("1.2k");
  expect(formatTokens(3_400_000)).toBe("3.4M");
});
