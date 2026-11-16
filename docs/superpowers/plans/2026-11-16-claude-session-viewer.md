# Claude Code Session Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A local web app that reads Claude Code's JSONL transcripts under `~/.claude/projects` and shows a searchable sessions list plus a chronological per-session story (prompts, injected context, hooks, tools, skills, commands, thinking, responses, subagents).

**Architecture:** One Next.js (App Router) + TypeScript app, with no database and no separate backend. Server-only modules in `src/lib/transcripts/` read the files with Node `fs`, classify each line into a typed `Event` union, and build summaries and timelines. Server Components call those modules directly and pass plain JSON props to Client Components, which handle search, sort, collapsing and the per-tool views. Pages are dynamic, so each load or **Refresh** (`router.refresh()`) re-reads the files.

**Tech Stack:** Node 24, Next.js (latest, App Router, `src/` dir), React, TypeScript (strict), Tailwind CSS v4, react-markdown, Vitest + Testing Library + jsdom.

**Spec:** `claude-ui.plan.md` (repo root). Read it alongside "Corrections from recon" below, which overrides it where they conflict.

## Corrections from recon (override the spec)

These come from reading the real `~/.claude/projects` on 2026-11-16 (25,378 lines, 8 projects, 94 subagent files):

1. **Folder names are not URL-encoded.** `/` and `.` both become `-` (e.g. `/Users/me/.aws` → `-Users-me--aws`), so decoding is lossy. The project path comes from the `cwd` of the first line that has one. The decoded folder name is only a fallback.
2. **Assistant replies are split across lines.** One API message (`message.id`) is written as several `assistant` lines, one content block each, and **every line repeats the same `message.usage`** (727 of 1,003 replies split, up to 9 lines). Tokens must be counted once per `message.id`, or totals come out several times too high.
3. **Hooks live in `attachment` lines**: `attachment.type` ∈ `hook_success`, `async_hook_response`, `hook_additional_context`, `hook_system_message` (fields `hookEvent`, `hookName`, `command`, `exitCode`, `stdout`, `stderr`, `durationMs`, `content`). There is also `system` with `subtype: "stop_hook_summary"` (field `hookInfos`).
4. **Injected context is mostly `attachment` lines** (`skill_listing`, `environment`, `instructions`, `date`, `invoked_skills`, `queued_command`, …). When present, `line.rendered` is a list of `{"content": "<system-reminder>…"}` holding the exact text the model saw.
5. **Slash commands** are `user` lines whose string content contains `<command-name>/x</command-name>` (plus `<command-args>`), and `system` lines with `subtype: "local_command"`.
6. **Subagents** are separate files: `<project>/<session-id>/subagents/agent-<agentId>.jsonl` plus `agent-<agentId>.meta.json` = `{"agentType","description","toolUseId","model",…}`. `toolUseId` is the id of the parent `Agent` (formerly `Task`) `tool_use`. All depths sit flat in that one folder.
7. **Bookkeeping line types with no `uuid` or `timestamp`** stay off the timeline: `ai-title` (`aiTitle`, the best session title), `last-prompt`, `mode`, `permission-mode`, `atis-latch`, `api-request`, `api-request-blob`, `api-request-shape`, `queue-operation`, `file-history-snapshot`, `file-history-delta`, `cost-state`, `tools-used`.

## Global Constraints

- Read-only: never write, move or delete anything under the transcripts root.
- No database, no API keys, no login, no network calls. The production server binds to `127.0.0.1`.
- Transcripts root = `CLAUDE_ROOT` env var if set, else `~/.claude/projects` (spec §1).
- Unknown line types appear on the timeline as `raw` events, never dropped. The only exception is the bookkeeping set in correction 7.
- Tokens: the 4 raw usage fields only (`input_tokens`, `output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`).
- Tailwind for styling. Manual refresh only (no live tail) in v1.
- Summaries are cached by file mtime + size; only changed files are re-parsed (spec §3).
- Modules under `src/lib/transcripts/` start with `import "server-only"` and are never imported by a `"use client"` file. Props crossing to Client Components are plain JSON (timestamps as ISO strings).
- TypeScript `strict: true`; no `any` in `src/` (use `unknown` + narrowing for raw lines).

## Review Focus

1. **A running session whose last line is half-written** must load: the partial line is skipped. → Task 3 `skips a partial last line`.
2. **A multi-megabyte tool result** must not freeze the browser: clip to 20,000 chars, `truncated: true`, and the UI says so. → Task 6 `clips huge tool results`, Task 9 Bash test.
3. **A tool call with no result** (interrupted, denied or running) renders as "No result recorded". → Task 6 `unmatched tool call has no result`, Task 9 test.
4. **A missing or empty transcripts root** shows `No sessions found in <root>`, not an error page. → Task 7 page test.
5. **A crafted session id** (`../../etc/passwd`) gives a 404 and never reads outside the root. → Task 3 `findSession rejects traversal`, Task 8 page test.

---

## File Structure

```
claude-lifecycle-ui/
├─ claude-ui.plan.md                       # spec (existing)
├─ package.json, tsconfig.json, next.config.ts, postcss.config.mjs, vitest.config.ts
├─ README.md
├─ test/
│  ├─ setup.ts                             # jest-dom, next/navigation mock
│  ├─ factories.ts                         # realistic transcript line builders + temp root
│  └─ fixtures.ts                          # makeSummary / sample events for UI tests
└─ src/
   ├─ lib/
   │  ├─ format.ts                         # formatDuration, formatTokens (shared, client-safe)
   │  └─ transcripts/                      # server-only
   │     ├─ types.ts                       # Event union, SessionSummary, SessionDetail, …
   │     ├─ util.ts                        # emptyTokens, addUsage, clip, asRecord, asString
   │     ├─ config.ts                      # claudeRoot()
   │     ├─ reader.ts                      # discover, findSession, readJsonl, readMeta, decodeProjectDir
   │     ├─ classify.ts                    # one raw line → events
   │     ├─ aggregate.ts                   # summarize, SummaryCache, listSummaries
   │     └─ timeline.ts                    # buildDetail (tool pairing, subagents)
   ├─ app/
   │  ├─ layout.tsx, globals.css
   │  ├─ page.tsx                          # sessions list (server)
   │  └─ sessions/[id]/page.tsx            # session detail (server)
   └─ components/                          # "use client"
      ├─ SessionListView.tsx, SessionTable.tsx, RefreshButton.tsx
      ├─ SessionDetailView.tsx, HeaderStrip.tsx, Timeline.tsx, EventView.tsx, Collapsible.tsx
      └─ tools/{ToolCard,ReadView,EditView,WriteView,BashView,GrepView,SkillView,SubagentView,GenericToolView}.tsx
```

`types.ts` is type-only. Client components import its types with `import type`, which is erased at build time, so `server-only` is never pulled into the browser bundle. Tests sit next to their source as `*.test.ts(x)`.

---

### Task 1: Scaffold Next.js app, test setup, config, factories

**Files:**
- Create: the Next.js app (via `create-next-app`), `vitest.config.ts`, `test/setup.ts`, `test/factories.ts`, `src/lib/transcripts/config.ts`
- Test: `src/lib/transcripts/config.test.ts`

**Interfaces:**
- Produces: `claudeRoot(): string` in `config.ts`, which reads `process.env.CLAUDE_ROOT` on every call, expands a leading `~`, and defaults to `path.join(os.homedir(), ".claude", "projects")`.
- `test/factories.ts` (used by every lib test). `parent` defaults to `null` and `sec` to `0` everywhere:
  - `ts(sec: number): string`: ISO UTC with `Z`, base `2026-11-16T10:00:00.000Z` + `sec` seconds
  - `makeRoot(): string`: `fs.mkdtempSync` under `os.tmpdir()` + `/projects` (created)
  - `userPrompt(text: string, o: { uuid: string; parent?: string | null; sec?: number; cwd?: string; extra?: Record<string, unknown> }): RawLine`. `cwd` defaults to `"/work/app"`; `extra` is merged at top level (e.g. `{ isMeta: true }`).
  - `toolResults(results: [id: string, content: string | unknown[], isError: boolean][], o: { uuid: string; parent?: string | null; sec?: number }): RawLine`
  - `assistant(msgId: string, block: Record<string, unknown>, o: { uuid: string; parent?: string | null; sec?: number; usage?: Record<string, number>; model?: string }): RawLine`. One line per block with `message = { id, role: "assistant", model, content: [block], usage }`. `model` defaults to `"claude-opus-5-5"`; `usage` defaults to `{ input_tokens: 10, output_tokens: 5, cache_creation_input_tokens: 100, cache_read_input_tokens: 1000 }`.
  - `attachment(att: Record<string, unknown>, o: { uuid: string; parent?: string | null; sec?: number; rendered?: string }): RawLine`, where `rendered` becomes `[{ content: rendered }]`
  - `system(subtype: string, o: { uuid: string; parent?: string | null; sec?: number; fields?: Record<string, unknown> }): RawLine`
  - `meta(type: string, fields?: Record<string, unknown>): RawLine`: only `type`, `sessionId` and the fields
  - `writeSession(root: string, projectDir: string, sessionId: string, lines: (RawLine | string)[], subagents?: Record<string, [meta: Record<string, unknown>, lines: RawLine[]]>): string`. Returns the file path; string items are written verbatim.
  - Every event line carries `uuid`, `parentUuid`, `timestamp`, `sessionId`, `cwd`, `gitBranch: "main"`, `version: "2.1.0"`, `isSidechain: false`, `userType: "external"`.
  - `RawLine = Record<string, unknown>` (exported from `src/lib/transcripts/types.ts` in Task 2; define it locally in factories for now and switch the import in Task 2).

- [ ] **Step 1: Scaffold**

```bash
cd /Users/sahilsharma/Documents/optum/workspace/claude-lifecycle-ui
git init
npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
npm install server-only react-markdown
npm install -D vitest @vitejs/plugin-react vite-tsconfig-paths jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```
If `create-next-app` refuses because the folder is not empty, move `claude-ui.plan.md` and `docs/` aside, scaffold, then move them back. Remove the starter page content and images.
`vitest.config.ts`: plugins `react()` and `tsconfigPaths()`; `test: { environment: "jsdom", globals: true, setupFiles: ["./test/setup.ts"], include: ["src/**/*.test.{ts,tsx}"] }`; `resolve.alias: { "server-only": <path to an empty file test/empty.ts> }`. Create the empty `test/empty.ts`.
`test/setup.ts`: `import "@testing-library/jest-dom/vitest"`, and `vi.mock("next/navigation", …)` returning `useRouter: () => ({ push: vi.fn(), refresh: vi.fn() })` and `notFound: () => { throw new Error("NEXT_NOT_FOUND") }`.
`package.json` scripts: add `"test": "vitest run"` and change `"start"` to `"next start -H 127.0.0.1"`. Add `"vitest/globals"` to `compilerOptions.types` in `tsconfig.json`.

- [ ] **Step 2: Write the failing test**

```ts
// src/lib/transcripts/config.test.ts
import os from "node:os";
import path from "node:path";
import { claudeRoot } from "./config";

afterEach(() => { delete process.env.CLAUDE_ROOT; });

test("env var overrides root", () => {
  process.env.CLAUDE_ROOT = "/tmp/x";
  expect(claudeRoot()).toBe("/tmp/x");
});
test("default root", () => {
  expect(claudeRoot()).toBe(path.join(os.homedir(), ".claude", "projects"));
});
test("expands ~", () => {
  process.env.CLAUDE_ROOT = "~/y";
  expect(claudeRoot()).toBe(path.join(os.homedir(), "y"));
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/transcripts/config.test.ts`
Expected: FAIL, cannot resolve `./config`

- [ ] **Step 4: Implement `config.ts`, then `test/factories.ts` per the Interfaces block**

- [ ] **Step 5: Verify tests, lint and build**

Run: `npm test && npm run lint && npm run build`
Expected: 3 tests pass; lint clean; build succeeds

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with Vitest, config and transcript factories"
```

---

### Task 2: Types and utilities

**Files:**
- Create: `src/lib/transcripts/types.ts`, `src/lib/transcripts/util.ts`
- Modify: `test/factories.ts` (import `RawLine` from `types.ts`)
- Test: `src/lib/transcripts/util.test.ts`

**Interfaces:**
- Produces in `types.ts` (type-only, no runtime code, no `server-only` import):
  - `RawLine = Record<string, unknown>`
  - `TokenTotals { input: number; output: number; cacheCreation: number; cacheRead: number; total: number }`
  - `ToolResult { content: string; isError: boolean; truncated: boolean }`
  - `EventBase { uuid: string | null; parentUuid: string | null; timestamp: string | null; isSidechain: boolean }`
  - `Event = EventBase & (` one of:
    - `{ kind: "prompt"; text: string }`
    - `{ kind: "command"; name: string; args: string }`
    - `{ kind: "injected"; source: string; text: string; truncated: boolean }`
    - `{ kind: "hook"; hookEvent: string; hookName: string; command: string | null; exitCode: number | null; durationMs: number | null; stdout: string; stderr: string; content: string }`
    - `{ kind: "text"; text: string; model: string | null }`
    - `{ kind: "thinking"; text: string }`
    - `{ kind: "tool"; toolUseId: string; name: string; input: Record<string, unknown>; result: ToolResult | null; subagentId: string | null }`
    - `{ kind: "system"; subtype: string; text: string }`
    - `{ kind: "raw"; lineType: string; data: Record<string, unknown> }` `)`
  - `EventKind = Event["kind"]`, `EventOf<K extends EventKind> = Extract<Event, { kind: K }>`, `ToolEvent = EventOf<"tool">`
  - `SessionSummary { sessionId: string; project: string; projectPath: string; title: string; startedAt: string | null; endedAt: string | null; durationSeconds: number | null; prompts: number; assistantMessages: number; tokens: TokenTotals; tools: Record<string, number>; skills: string[]; slashCommands: string[]; models: string[]; gitBranch: string | null; version: string | null; subagentCount: number }`
  - `SubagentRun { agentId: string; agentType: string | null; description: string | null; model: string | null; toolUseId: string | null; events: Event[] }`
  - `SessionDetail { summary: SessionSummary; events: Event[]; subagents: Record<string, SubagentRun> }`
- Produces in `util.ts` (`import "server-only"`):
  - `emptyTokens(): TokenTotals`
  - `addUsage(t: TokenTotals, usage: unknown): void`: adds the 4 raw keys (non-numbers → 0) and keeps `total` equal to the sum
  - `clip(text: string, limit = 20_000): [string, boolean]`
  - `asRecord(v: unknown): Record<string, unknown> | null`, `asString(v: unknown): string | null`, `asNumber(v: unknown): number | null`: narrowing helpers for raw lines

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/transcripts/util.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/transcripts/util.test.ts`
Expected: FAIL, cannot resolve `./util`

- [ ] **Step 3: Implement `types.ts` and `util.ts` per the Interfaces block**

- [ ] **Step 4: Verify**

Run: `npm test && npx tsc --noEmit`
Expected: all pass; no type errors

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: transcript event types and utilities"
```

---

### Task 3: Reader: discovery, JSONL reading, folder decoding

**Files:**
- Create: `src/lib/transcripts/reader.ts`
- Test: `src/lib/transcripts/reader.test.ts`

**Interfaces:**
- Consumes: factories (Task 1), `RawLine` (Task 2).
- Produces in `reader.ts` (all synchronous, `node:fs`):
  - `SubagentFile { agentId: string; path: string; metaPath: string | null }`
  - `SessionFile { sessionId: string; projectDir: string; path: string; subagents: SubagentFile[] }`
  - `discover(root: string): SessionFile[]`: reads `root/*/*.jsonl` only (never the `subagents/` files as sessions). Subagents come from `root/<project>/<sessionId>/subagents/agent-*.jsonl`, where `agentId` is the filename minus the `agent-` prefix and `.jsonl` suffix. A missing root → `[]`.
  - `findSession(root: string, sessionId: string): SessionFile | null`: returns `null` unless `sessionId` matches `/^[A-Za-z0-9-]{1,64}$/` **and** is a discovered id
  - `readJsonl(file: string): RawLine[]`: splits on `\n`, skips blank, non-JSON and non-object lines
  - `readMeta(file: string | null): Record<string, unknown>`: parsed object, or `{}` if missing or invalid
  - `decodeProjectDir(name: string): string`: lossy fallback, `"-Users-me-code-app"` → `"/Users/me/code/app"`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/transcripts/reader.test.ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/transcripts/reader.test.ts`
Expected: FAIL, cannot resolve `./reader`

- [ ] **Step 3: Implement `reader.ts` per the Interfaces block**

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/transcripts/reader.test.ts`
Expected: 6 passed

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: discover and read session transcript files"
```

---

### Task 4: Classify lines into events

**Files:**
- Create: `src/lib/transcripts/classify.ts`
- Test: `src/lib/transcripts/classify.test.ts`

**Interfaces:**
- Consumes: types, `clip`, narrowing helpers (Task 2).
- Produces in `classify.ts`:
  - `BOOKKEEPING_TYPES: ReadonlySet<string>`: exactly the types in correction 7
  - `classify(line: RawLine): Event[]`: every event copies `uuid`, `parentUuid`, `timestamp` and `isSidechain` from the line (missing → `null`/`false`)
  - `extractToolResults(line: RawLine): Map<string, ToolResult>`: for `user` lines, maps each `tool_result` block's `tool_use_id` to a `ToolResult`. Content is normalized to text: a string is kept as-is; a block list becomes its `text` values joined with `"\n"`, with each `image` block as `"[image]"`. Content is clipped.

Classification rules:

| Line | Becomes |
|---|---|
| type in `BOOKKEEPING_TYPES` | `[]` |
| `user`, string content containing `<command-name>` | `command` with `name` = `<command-name>` text, `args` = `<command-args>` text or `""` |
| `user`, string, `isMeta` or `isCompactSummary` true, or starts with `<` | `injected`, `source` = `"compact_summary"` if `isCompactSummary` else `"meta"`, text clipped |
| `user`, other string | `prompt` |
| `user`, block list: each `text` block | starts with `<system-reminder>` → `injected` with `source: "system-reminder"`, else `prompt`. `tool_result` blocks yield no event. |
| `assistant`: each content block | `text` → `text` (`model` = `message.model`); `thinking` → `thinking` (`block.thinking ?? ""`); `tool_use` → `tool` (`toolUseId` = `id`, `name`, `input`, `result: null`, `subagentId: null`); other block types → `raw` with `lineType: "assistant:<block type>"` |
| `attachment` with type `hook_success`, `async_hook_response`, `hook_additional_context` or `hook_system_message` | `hook`: `hookEvent` = `hookEvent ?? ""`, `hookName` = `hookName ?? hookEvent ?? ""`, plus `command`, `exitCode`, `durationMs`, `stdout`, `stderr`, `content`. List `content` is joined with `"\n\n"`. Text fields are clipped. |
| other `attachment` | `injected` with `source` = `attachment.type`. Text is the joined `rendered[].content` if present, else `attachment.content` if a string, else `JSON.stringify(attachment, null, 2)`. Clipped. |
| `system`, `stop_hook_summary` | `hook` with `hookEvent: "Stop"`, `hookName: "Stop"`, `content` = the `hookInfos[].command` values joined with `"\n"` |
| `system`, `local_command` | `command`, parsed from `content` like the user case |
| other `system` | `system` with `subtype ?? ""` and `text` = `content ?? ""` |
| any other type | `raw` with `lineType` = `type ?? "unknown"` and `data` = the line |

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/transcripts/classify.test.ts
import { classify, extractToolResults } from "./classify";
import { assistant, attachment, meta, system, toolResults, userPrompt } from "../../../test/factories";

const one = (l: Parameters<typeof classify>[0]) => { const e = classify(l); expect(e).toHaveLength(1); return e[0]; };

test("typed prompt", () => {
  expect(one(userPrompt("fix the bug", { uuid: "u1" }))).toMatchObject({ kind: "prompt", text: "fix the bug", uuid: "u1" });
});

test("slash command", () => {
  const text = "<command-message>superpowers:brainstorming</command-message>\n" +
    "<command-name>/superpowers:brainstorming</command-name>\n<command-args>x y</command-args>";
  expect(one(userPrompt(text, { uuid: "u1" }))).toMatchObject({ kind: "command", name: "/superpowers:brainstorming", args: "x y" });
});

test("meta user string is injected", () => {
  expect(one(userPrompt("<task-notification>done</task-notification>", { uuid: "u1", extra: { isMeta: true } })))
    .toMatchObject({ kind: "injected", source: "meta" });
});

test("system-reminder text block is injected", () => {
  const l = userPrompt("x", { uuid: "u1" });
  (l.message as Record<string, unknown>).content = [{ type: "text", text: "<system-reminder>ctx</system-reminder>" }];
  expect(one(l)).toMatchObject({ kind: "injected", source: "system-reminder" });
});

test("assistant blocks", () => {
  expect(one(assistant("m1", { type: "thinking", thinking: "hmm" }, { uuid: "a1" }))).toMatchObject({ kind: "thinking", text: "hmm" });
  expect(one(assistant("m1", { type: "tool_use", id: "t1", name: "Bash", input: { command: "ls" } }, { uuid: "a2" })))
    .toMatchObject({ kind: "tool", toolUseId: "t1", name: "Bash", input: { command: "ls" }, result: null });
  expect(one(assistant("m1", { type: "text", text: "done" }, { uuid: "a3" }))).toMatchObject({ kind: "text", model: "claude-opus-5-5" });
});

test("hook attachment", () => {
  expect(one(attachment({ type: "hook_success", hookEvent: "SessionStart", hookName: "SessionStart:startup",
    command: "boot.sh", exitCode: 0, stdout: "", stderr: "warn", durationMs: 12, content: "" }, { uuid: "h1" })))
    .toMatchObject({ kind: "hook", hookEvent: "SessionStart", hookName: "SessionStart:startup", exitCode: 0, stderr: "warn" });
});

test("hook additional context joins list content", () => {
  expect(one(attachment({ type: "hook_additional_context", hookEvent: "SessionStart", hookName: "SessionStart",
    content: ["a", "b"] }, { uuid: "h1" }))).toMatchObject({ content: "a\n\nb" });
});

test("other attachment uses rendered text", () => {
  expect(one(attachment({ type: "skill_listing", content: "- x" }, { uuid: "i1", rendered: "<system-reminder>skills</system-reminder>" })))
    .toMatchObject({ kind: "injected", source: "skill_listing", text: "<system-reminder>skills</system-reminder>" });
});

test("stop hook summary and compaction", () => {
  expect(one(system("stop_hook_summary", { uuid: "s1", fields: { hookInfos: [{ command: "a.sh" }, { command: "b.sh" }] } })))
    .toMatchObject({ kind: "hook", hookEvent: "Stop", content: "a.sh\nb.sh" });
  expect(one(system("compact_boundary", { uuid: "s2", fields: { content: "Conversation compacted" } })))
    .toMatchObject({ kind: "system", subtype: "compact_boundary" });
});

test("bookkeeping dropped, unknown kept", () => {
  expect(classify(meta("ai-title", { aiTitle: "T" }))).toEqual([]);
  expect(classify(meta("api-request-blob", { message: {} }))).toEqual([]);
  expect(one({ type: "brand-new", uuid: "z1", foo: 1 })).toMatchObject({ kind: "raw", lineType: "brand-new", data: { foo: 1 } });
});

test("extractToolResults normalizes content", () => {
  const r = extractToolResults(toolResults([["t1", "out", false],
    ["t2", [{ type: "text", text: "a" }, { type: "image" }], true]], { uuid: "u2" }));
  expect(r.get("t1")).toEqual({ content: "out", isError: false, truncated: false });
  expect(r.get("t2")).toEqual({ content: "a\n[image]", isError: true, truncated: false });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/transcripts/classify.test.ts`
Expected: FAIL, cannot resolve `./classify`

- [ ] **Step 3: Implement `classify.ts` per the rules table**

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/transcripts/classify.test.ts`
Expected: 11 passed

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: classify transcript lines into timeline events"
```

---

### Task 5: Session summaries and cache

**Files:**
- Create: `src/lib/transcripts/aggregate.ts`
- Test: `src/lib/transcripts/aggregate.test.ts`

**Interfaces:**
- Consumes: `SessionFile`, `discover`, `readJsonl`, `decodeProjectDir` (Task 3); `classify` (Task 4); `emptyTokens`, `addUsage` (Task 2).
- Produces in `aggregate.ts`:
  - `summarize(sf: SessionFile): SessionSummary`
  - `fingerprint(sf: SessionFile): string`: `mtimeMs:size` of the session file and every subagent `.jsonl`, joined
  - `class SummaryCache { constructor(summarizeFn = summarize); get(sf: SessionFile): SessionSummary }`: a `Map` keyed by `sf.path` holding `{ fingerprint, summary }`; re-summarizes only when the fingerprint changes
  - `defaultCache: SummaryCache`: module-level instance the pages use
  - `listSummaries(root: string, cache: SummaryCache = defaultCache): SessionSummary[]`: newest `startedAt` first, `null` last

Field rules:
- `projectPath` = first line's `cwd`, else `decodeProjectDir(projectDir)`. `project` = `path.basename(projectPath)`.
- `title` = last `ai-title`'s `aiTitle`; else the first `prompt` event's text with whitespace collapsed, cut to 80 chars; else `"(untitled)"`.
- `startedAt` / `endedAt` = min / max `timestamp` in the main file. `durationSeconds` = difference, or `null`.
- `prompts` = count of `prompt` events in the main file. `assistantMessages` = distinct `message.id` in the main file.
- `tokens`: `addUsage(message.usage)` **once per distinct `message.id` per file**, over the main file and every subagent file (correction 2).
- `tools` = count of `tool` event names in the main file. `skills` = the `input.skill` of `Skill` tool events plus `skills[].name` from `invoked_skills` attachments; distinct, first-seen order. `slashCommands` = `command` event names, distinct, in order.
- `models` = distinct `message.model` in the main file, skipping `"<synthetic>"`. `gitBranch` / `version` = from the last line that has them. `subagentCount` = `sf.subagents.length`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/transcripts/aggregate.test.ts
import fs from "node:fs";
import { SummaryCache, listSummaries, summarize } from "./aggregate";
import { discover } from "./reader";
import { assistant, makeRoot, meta, toolResults, userPrompt, writeSession } from "../../../test/factories";

const SID = "11111111-2222-3333-4444-555555555555";

function session(root: string, sid = SID, s0 = 0) {
  writeSession(root, "-work-app", sid, [
    userPrompt("fix   the\nlogin bug", { uuid: "u1", sec: s0, cwd: "/work/my.app" }),
    assistant("m1", { type: "thinking", thinking: "hm" }, { uuid: "a1", parent: "u1", sec: s0 + 1 }),
    assistant("m1", { type: "tool_use", id: "t1", name: "Bash", input: { command: "ls" } }, { uuid: "a2", parent: "a1", sec: s0 + 2 }),
    toolResults([["t1", "ok", false]], { uuid: "u2", parent: "a2", sec: s0 + 3 }),
    assistant("m2", { type: "tool_use", id: "t2", name: "Skill", input: { skill: "tdd" } }, { uuid: "a3", parent: "u2", sec: s0 + 4 }),
    assistant("m3", { type: "tool_use", id: "t3", name: "Agent", input: { prompt: "x" } }, { uuid: "a4", parent: "a3", sec: s0 + 90 }),
    meta("ai-title", { aiTitle: "Fix login" }),
  ], { ag1: [{ toolUseId: "t3", agentType: "Explore" },
              [assistant("s1", { type: "text", text: "found" }, { uuid: "x1", sec: s0 + 50 })]] });
}

test("summary fields", () => {
  const root = makeRoot(); session(root);
  const s = summarize(discover(root)[0]);
  expect(s).toMatchObject({ project: "my.app", projectPath: "/work/my.app", title: "Fix login",
    durationSeconds: 90, prompts: 1, assistantMessages: 3, tools: { Bash: 1, Skill: 1, Agent: 1 },
    skills: ["tdd"], subagentCount: 1, models: ["claude-opus-5-5"] });
});

test("tokens counted once per message, including subagents", () => {
  const root = makeRoot(); session(root);
  // main: m1 (2 lines, same usage), m2, m3 = 3 messages; subagent: s1 = 1
  expect(summarize(discover(root)[0]).tokens).toEqual({ input: 40, output: 20, cacheCreation: 400, cacheRead: 4000, total: 4460 });
});

test("title falls back to first prompt", () => {
  const root = makeRoot();
  writeSession(root, "-p", SID, [userPrompt("fix   the\nlogin bug", { uuid: "u1" })]);
  expect(summarize(discover(root)[0]).title).toBe("fix the login bug");
});

test("cache re-parses only on change", () => {
  const root = makeRoot(); session(root);
  const fn = vi.fn(summarize);
  const cache = new SummaryCache(fn);
  listSummaries(root, cache); listSummaries(root, cache);
  expect(fn).toHaveBeenCalledTimes(1);
  const p = discover(root)[0].path;
  fs.appendFileSync(p, "\n");
  listSummaries(root, cache);
  expect(fn).toHaveBeenCalledTimes(2);
});

test("newest first", () => {
  const root = makeRoot();
  session(root, SID, 0);
  session(root, "99999999-2222-3333-4444-555555555555", 1000);
  expect(listSummaries(root, new SummaryCache()).map(s => s.sessionId.slice(0, 2))).toEqual(["99", "11"]);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/transcripts/aggregate.test.ts`
Expected: FAIL, cannot resolve `./aggregate`

- [ ] **Step 3: Implement `aggregate.ts` per the field rules**

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/transcripts/aggregate.test.ts`
Expected: 5 passed

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: per-session summaries with deduplicated tokens and mtime cache"
```

---

### Task 6: Session detail timeline

**Files:**
- Create: `src/lib/transcripts/timeline.ts`
- Test: `src/lib/transcripts/timeline.test.ts`

**Interfaces:**
- Consumes: `SessionFile`, `readJsonl`, `readMeta` (Task 3); `classify`, `extractToolResults` (Task 4); `summarize` (Task 5).
- Produces in `timeline.ts`: `buildEvents(file: string): Event[]` and `buildDetail(sf: SessionFile): SessionDetail`.

Rules:
- Events keep **file order** (the file is append-only; some lines have no timestamp).
- Each `tool` event's `result` is filled from the matching `toolUseId` in any line of the same file. Unmatched → `null`.
- Subagents: one `SubagentRun` per `SubagentFile`, with `events = buildEvents(sub.path)` and `agentType` / `description` / `model` / `toolUseId` from `readMeta` (`agentType`, `description`, `model`, `toolUseId`; missing → `null`). Then every `tool` event (main or any subagent) whose `toolUseId` equals a run's `toolUseId` gets `subagentId = agentId`. Nesting at any depth therefore works.
- `summary = summarize(sf)` (not the cache; the detail page always reads fresh).

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/transcripts/timeline.test.ts
import { buildDetail } from "./timeline";
import { discover } from "./reader";
import { assistant, makeRoot, toolResults, userPrompt, writeSession } from "../../../test/factories";

const SID = "11111111-2222-3333-4444-555555555555";
const detail = (root: string) => buildDetail(discover(root)[0]);

test("file order and tool pairing", () => {
  const root = makeRoot();
  writeSession(root, "-p", SID, [
    userPrompt("go", { uuid: "u1" }),
    assistant("m1", { type: "tool_use", id: "t1", name: "Read", input: { file_path: "/a" } }, { uuid: "a1", parent: "u1", sec: 1 }),
    toolResults([["t1", "contents", false]], { uuid: "u2", parent: "a1", sec: 2 }),
    assistant("m2", { type: "text", text: "done" }, { uuid: "a2", parent: "u2", sec: 3 }),
  ]);
  const d = detail(root);
  expect(d.events.map(e => e.kind)).toEqual(["prompt", "tool", "text"]);
  expect(d.events[1]).toMatchObject({ result: { content: "contents" } });
});

test("unmatched tool call has no result", () => {
  const root = makeRoot();
  writeSession(root, "-p", SID, [
    assistant("m1", { type: "tool_use", id: "t1", name: "Bash", input: { command: "sleep 99" } }, { uuid: "a1" }),
  ]);
  expect(detail(root).events[0]).toMatchObject({ kind: "tool", result: null });
});

test("clips huge tool results", () => {
  const root = makeRoot();
  writeSession(root, "-p", SID, [
    assistant("m1", { type: "tool_use", id: "t1", name: "Bash", input: { command: "cat big" } }, { uuid: "a1" }),
    toolResults([["t1", "x".repeat(3_000_000), false]], { uuid: "u2", parent: "a1", sec: 1 }),
  ]);
  const ev = detail(root).events[0];
  expect(ev.kind === "tool" && ev.result?.content.length).toBe(20_000);
  expect(ev).toMatchObject({ result: { truncated: true } });
});

test("nested subagents link by toolUseId", () => {
  const root = makeRoot();
  writeSession(root, "-p", SID, [
    assistant("m1", { type: "tool_use", id: "t1", name: "Agent", input: { prompt: "look" } }, { uuid: "a1" }),
  ], {
    ag1: [{ toolUseId: "t1", agentType: "Explore", description: "look around" },
          [assistant("s1", { type: "tool_use", id: "t2", name: "Agent", input: {} }, { uuid: "x1" })]],
    ag2: [{ toolUseId: "t2", agentType: "general-purpose" },
          [assistant("s2", { type: "text", text: "deep" }, { uuid: "y1" })]],
  });
  const d = detail(root);
  expect(d.events[0]).toMatchObject({ subagentId: "ag1" });
  expect(d.subagents.ag1.agentType).toBe("Explore");
  expect(d.subagents.ag1.events[0]).toMatchObject({ subagentId: "ag2" });
  expect(d.subagents.ag2.events[0]).toMatchObject({ kind: "text", text: "deep" });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/transcripts/timeline.test.ts`
Expected: FAIL, cannot resolve `./timeline`

- [ ] **Step 3: Implement `timeline.ts` per the rules**

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: session timeline with tool pairing and nested subagents"
```

---

### Task 7: Sessions list page

**Files:**
- Create: `src/lib/format.ts`, `src/components/SessionListView.tsx`, `src/components/SessionTable.tsx`, `src/components/RefreshButton.tsx`, `test/fixtures.ts`
- Modify: `src/app/page.tsx`, `src/app/layout.tsx` (title `Claude Session Viewer`, base Tailwind body classes)
- Test: `src/lib/format.test.ts`, `src/components/SessionTable.test.tsx`, `src/app/page.test.tsx`

**Interfaces:**
- Consumes: `claudeRoot` (Task 1), `listSummaries` (Task 5), types (Task 2).
- Produces:
  - `format.ts` (no `server-only`): `formatDuration(seconds: number | null): string` and `formatTokens(n: number): string`
  - `test/fixtures.ts`: `makeSummary(overrides?: Partial<SessionSummary>): SessionSummary`
  - `RefreshButton()` (`"use client"`): a button labelled `Refresh` that calls `useRouter().refresh()`
  - `SessionTable({ sessions, onSelect }: { sessions: SessionSummary[]; onSelect: (id: string) => void })` (`"use client"`). Columns: Date (`startedAt`, local date + time), Project, Title, Duration, Prompts, Tokens (`formatTokens(tokens.total)` with a `title` tooltip listing the 4 fields), Tools (top 3 as `Name×n`, then `+k`), Model, Branch. Date, Project, Duration and Tokens sort via header buttons (click toggles direction); default Date descending. Rows are clickable and keyboard-activatable (`tabIndex={0}`, Enter).
  - `filterSessions(sessions: SessionSummary[], query: string): SessionSummary[]` (exported from `SessionTable.tsx`): case-insensitive substring match on title, project, projectPath, gitBranch, sessionId and tool names
  - `SessionListView({ root, sessions }: { root: string; sessions: SessionSummary[] })` (`"use client"`): search input (placeholder `Search sessions…`), `RefreshButton`, count `N sessions`, and the table. A row click calls `router.push(\`/sessions/${id}\`)`. An empty list shows `No sessions found in <root>`.
  - `src/app/page.tsx`: `export const dynamic = "force-dynamic"`; a default export Server Component that renders `<SessionListView root={claudeRoot()} sessions={listSummaries(claudeRoot())} />`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/format.test.ts
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
```

```tsx
// src/components/SessionTable.test.tsx
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
```

```tsx
// src/app/page.test.tsx
import { render, screen } from "@testing-library/react";
import Home from "./page";

test("missing root shows an empty state naming the root", () => {
  process.env.CLAUDE_ROOT = "/definitely/not/here";
  render(Home());
  expect(screen.getByText("No sessions found in /definitely/not/here")).toBeInTheDocument();
  delete process.env.CLAUDE_ROOT;
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/format.test.ts src/components/SessionTable.test.tsx src/app/page.test.tsx`
Expected: FAIL, modules not found or the starter page lacks the text

- [ ] **Step 3: Implement per the Interfaces block**

Dense table: `text-sm`, sticky header, zebra rows, `tabular-nums`.

- [ ] **Step 4: Run tests and a live check**

Run: `npm test`
Expected: all pass.
Run: `npm run dev`, then open `http://localhost:3000`.
Expected: your real sessions listed newest first; search narrows the list; Refresh reloads.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: searchable, sortable sessions list page"
```

---

### Task 8: Session detail page, header strip, timeline

**Files:**
- Create: `src/app/sessions/[id]/page.tsx`, `src/components/{SessionDetailView,HeaderStrip,Timeline,EventView,Collapsible}.tsx`, `src/components/tools/ToolCard.tsx` (stub until Task 9: renders the tool name)
- Test: `src/components/EventView.test.tsx`, `src/components/HeaderStrip.test.tsx`, `src/app/sessions/[id]/page.test.tsx`

**Interfaces:**
- Consumes: `claudeRoot`, `findSession` (Task 3), `buildDetail` (Task 6), `formatDuration` / `formatTokens` / `makeSummary` (Task 7), factories (Task 1).
- Produces (all components are `"use client"` except the page):
  - `Collapsible({ label, defaultOpen = false, children }: { label: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode })`: a `<button aria-expanded>` toggle; children are not rendered while closed
  - `HeaderStrip({ summary }: { summary: SessionSummary })`: title, projectPath, startedAt, duration, models, branch, version; the 4 token fields + total (via `formatTokens`); every tool as `Name×n` sorted by count; skills; slash commands; subagent count
  - `Timeline({ events, subagents }: { events: Event[]; subagents: Record<string, SubagentRun> })`: kind filter checkboxes (all 9 kinds, all on), then one `EventView` per visible event
  - `EventView({ event, subagents }: { event: Event; subagents: Record<string, SubagentRun> })` by `event.kind`:
    - `prompt`: "You" card, `whitespace-pre-wrap`
    - `command`: badge `name` + args
    - `injected`: `Collapsible` labelled `Injected · <source>`, closed
    - `hook`: row `Hook · <hookEvent> · <hookName>` with a badge whose text is `exit <code>` (red if non-zero, omitted if null), plus a `Collapsible` with command / stdout / stderr / content
    - `text`: react-markdown
    - `thinking`: `Collapsible` labelled `Thinking`, closed; empty text shows `(thinking not recorded)`
    - `tool`: `<ToolCard event subagents />`
    - `system`: muted row `subtype: text`; `compact_boundary` is a full-width divider labelled `Conversation compacted`
    - `raw`: `Collapsible` labelled `Unrecognized · <lineType>` with pretty JSON
  - `SessionDetailView({ detail }: { detail: SessionDetail })`: back link to `/`, `RefreshButton`, `HeaderStrip`, `Timeline`
  - `src/app/sessions/[id]/page.tsx`: `export const dynamic = "force-dynamic"`; `export default async function SessionPage({ params }: { params: Promise<{ id: string }> })`. It awaits `params`, calls `findSession(claudeRoot(), id)`, calls `notFound()` on `null`, else renders `<SessionDetailView detail={buildDetail(sf)} />`.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/EventView.test.tsx
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
```

```tsx
// src/components/HeaderStrip.test.tsx
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
```

```tsx
// src/app/sessions/[id]/page.test.tsx
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components src/app/sessions`
Expected: FAIL, modules not found

- [ ] **Step 3: Implement the components and the page**

- [ ] **Step 4: Run tests and a live check**

Run: `npm test`
Expected: all pass.
Run: `npm run dev`, then open a session from the list, then open `http://localhost:3000/sessions/..%2F..%2Fetc`.
Expected: the timeline renders; the crafted URL shows the 404 page.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: session detail page with header strip and timeline"
```

---

### Task 9: Tool views and subagent tree

**Files:**
- Create: `src/components/tools/{ReadView,EditView,WriteView,BashView,GrepView,SkillView,SubagentView,GenericToolView}.tsx`
- Modify: `src/components/tools/ToolCard.tsx` (replace the stub)
- Test: `src/components/tools/ToolCard.test.tsx`

**Interfaces:**
- Consumes: `ToolEvent`, `SubagentRun` types (Task 2); `Timeline`, `Collapsible` (Task 8).
- Produces: `ToolCard({ event, subagents }: { event: ToolEvent; subagents: Record<string, SubagentRun> })`, a card with the tool name as heading, then the per-tool view, then the result. The result has a red border when `isError`; shows `No result recorded` when `result` is null; and shows `Output truncated to 20,000 characters` when `truncated`. The view is chosen by `event.name`:
  - `Read` → `ReadView`: `input.file_path` (+ `offset`/`limit`); result collapsed
  - `Edit` → `EditView`: file path; each `old_string` line as its own element with text `- <line>` (red) and each `new_string` line as `+ <line>` (green), monospace; `replace_all` badge
  - `Write` → `WriteView`: file path + collapsed `content`
  - `Bash` → `BashView`: one element with text `$ <command>` (+ muted `description`); result shown open in monospace, `max-h-96 overflow-auto`
  - `Grep`, `Glob` → `GrepView`: `pattern` (+ `path`, `glob`); result collapsed
  - `Skill` → `SkillView`: badge `input.skill` + `input.args`
  - `Agent`, `Task` → `SubagentView`: `subagent_type` / `description`, prompt collapsed. If `subagents[event.subagentId]` exists, a `Collapsible` labelled `Subagent · <agentType> · <n> events` (closed) renders a nested `<Timeline events={run.events} subagents={subagents} />`; otherwise `Subagent transcript not found`
  - anything else (incl. `mcp__*`) → `GenericToolView`: pretty-JSON input (collapsed), result collapsed

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/tools/ToolCard.test.tsx
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/tools`
Expected: FAIL (the stub lacks these behaviours)

- [ ] **Step 3: Implement the views and the real `ToolCard`**

- [ ] **Step 4: Verify**

Run: `npm test && npm run lint && npm run build`
Expected: all pass; build succeeds

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: per-tool views and nested subagent tree"
```

---

### Task 10: README and end-to-end check on real data

**Files:**
- Modify: `README.md` (replace the create-next-app text), `package.json` (add `"app": "next build && next start -H 127.0.0.1"`)

- [ ] **Step 1: Write README**

Covers: what it is (one paragraph); `npm install`; everyday use `npm run app` → `http://127.0.0.1:3000`; dev `npm run dev`; `CLAUDE_ROOT=/path npm run app`; `npm test`; and a short "How transcripts are read" list summarizing corrections 1–7.

- [ ] **Step 2: Full verification**

Run: `npm test && npm run lint && npx tsc --noEmit && npm run build`
Expected: all green

- [ ] **Step 3: End-to-end check on real transcripts**

Run: `npm run app`, then open `http://127.0.0.1:3000`.
Expected, checked in the browser:
- The list shows sessions from all local projects, newest first.
- Search `claude-lifecycle-ui` narrows the list to this project.
- Open the session that wrote this plan: the token total is plausible, not ~5× inflated (compare against that session's `cost-state` line or `/cost`).
- The timeline shows the SessionStart hooks, the injected skill listing (collapsed), the `/superpowers:brainstorming` command, and Bash calls with output.
- Open a session from the `agnoknhw-insurance-incident-engine` project and expand an `Agent` card to see the nested subagent timeline.
- No errors in the browser console or the server terminal.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs: README and app script"
```

---

## Deferred (not in v1)

- Live tail of running sessions: manual Refresh in v1.
- Finer token categories (CLAUDE.md, skills, tool I/O, …): the 4 raw fields only.
- Stats rollups across sessions: no view needs them yet.
- `parentUuid` branch view: kept on every event, but the UI is linear.
- A JSON API (`/api/...`): Server Components read data directly; add route handlers only if something outside the UI needs the data.
