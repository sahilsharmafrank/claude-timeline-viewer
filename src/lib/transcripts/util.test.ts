import { addUsage, clip, emptyTokens } from "./util";

test("addUsage sums the 4 raw fields and ignores others", () => {
  const t = emptyTokens();
  addUsage(t, { input_tokens: 10, output_tokens: 5, cache_creation_input_tokens: 100,
                cache_read_input_tokens: 1000, service_tier: "standard" });
  addUsage(t, { output_tokens: null });
  addUsage(t, undefined);
  expect(t).toEqual({ input: 10, output: 5, cacheCreation: 100, cacheRead: 1000, total: 1115 });
});

test("clip", () => {
  expect(clip("abc", 5)).toEqual(["abc", false]);
  expect(clip("abcdef", 3)).toEqual(["abc", true]);
});
