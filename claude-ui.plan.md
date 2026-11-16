# Claude Code Session Viewer — Build Plan

Nov 16, 2026 · @Franky

A local web app that reads Claude Code's own session transcripts and turns them into two views: a searchable list of every session (date, duration, tokens, tools, project) and, on click, a full chronological story of that session — the original prompt, what Claude Code injected, which hooks fired, which tools, skills, and commands ran, the thinking, and the responses. It reads files that already exist on disk; no database, no API keys, no login, no cloud. The stack is a single **Next.js (App Router) + React + TypeScript** app: server-side code reads and parses the JSONL directly, and the same app renders the UI, so it runs with one command.

The step-by-step implementation plan is in `docs/superpowers/plans/2026-11-16-claude-session-viewer.md`.

## 1. Data source & locations

Claude Code records every session as an append-only JSONL file (one JSON object per line, not pretty-printed) under a hidden `.claude` folder in the user's home directory. The full path pattern is:

```
~/.claude/projects/<encoded-project-path>/<session-id>.jsonl
~/.claude/projects/<encoded-project-path>/<session-id>/subagents/agent-<agentId>.jsonl   # subagent runs
~/.claude/projects/<encoded-project-path>/<session-id>/subagents/agent-<agentId>.meta.json
```

Key facts the parser relies on:

- **One file per session.** The filename is the session UUID. Files are append-only — Claude Code adds lines as the session runs; nothing is rewritten or deleted (so running sessions grow over time, and the last line may be half-written).
- **Project folders are lossily encoded paths.** Both `/` and `.` become `-`, e.g. `/Users/you/code/my-app` → `-Users-you-code-my-app` and `/Users/you/.aws` → `-Users-you--aws`, so the folder name can't be decoded reliably. The app takes the project path from the `cwd` stored inside the lines and only falls back to the folder name.
- **Override via env var.** The app honors a `CLAUDE_ROOT` environment variable to point at a non-default location — useful for Docker mounts or remote `.claude` dirs.
- **Same files for every surface.** The CLI, the VS Code / JetBrains extensions, and the desktop coding integrations all write to this one location.

Per-OS home location:

| OS | Path | Notes |
| --- | --- | --- |
| macOS | `/Users/<you>/.claude/` | Hidden in Finder; `Cmd+Shift+.` to reveal, or `open ~/.claude` |
| Linux | `/home/<you>/.claude/` | Resolves to `$HOME`; hidden (`ls -la ~`) |
| Windows | `C:\Users\<you>\.claude\` | Also `%USERPROFILE%\.claude\`; enable “Show hidden items” |

## 2. JSONL transcript schema

Each line is a self-contained event. TypeScript types describe the parsed output (a discriminated `Event` union); raw lines are read as `unknown` and narrowed defensively, so a malformed or evolving transcript shows up as an "unrecognized" event instead of a crash.

**Top-level fields (on event lines):**

| Field | Meaning |
| --- | --- |
| `type` | Discriminator: `user`, `assistant`, `system`, `attachment`, and bookkeeping types |
| `uuid` | Unique id for this event |
| `parentUuid` | Id of the prior event — lets us rebuild the conversation tree |
| `timestamp` | ISO 8601; drives duration |
| `sessionId` | The session UUID |
| `cwd` | Working directory the session ran in |
| `gitBranch` | Branch at the time of the event |
| `version` | Claude Code version that wrote the line |

**Entry types (the `type` value):**

| Type | Payload |
| --- | --- |
| `user` | `message.content` is a **string** (typed prompt, slash command, or meta text) or an **array** of blocks (when returning tool results). `tool_result` blocks appear here, referencing the `tool_use_id` they answer |
| `assistant` | `message.content` holds blocks (text, thinking, tool\_use). One API reply is often split across several lines (one block each), and **each line repeats the same `message.usage`**. `message.model` is the model |
| `attachment` | Context Claude Code adds: hook results (`hook_success`, `async_hook_response`, `hook_additional_context`), skill listings, environment, instructions, invoked skills, queued commands, and more. `rendered` holds the exact text the model saw |
| `system` | Turn durations, stop-hook summaries, compaction boundaries, local commands, informational notices |
| bookkeeping | `ai-title`, `last-prompt`, `mode`, `permission-mode`, `api-request*`, `file-history-*`, `queue-operation`, `cost-state`, … — no `uuid`/`timestamp`; kept off the timeline (`ai-title` supplies the session title) |

**Content blocks inside `message.content`:**

| Block | Fields |
| --- | --- |
| `text` | Prose from either side |
| `thinking` | Extended thinking (plain text, shown collapsed; may be empty if not recorded) |
| `tool_use` | `id`, `name` (Read, Edit, Bash, Grep, Agent, Skill, `mcp__…`), `input` (shape varies by tool) |
| `tool_result` | `tool_use_id` (pairs it to its call), `content`, `is_error` |

**Token accounting (`message.usage` on assistant entries):** `input_tokens`, `output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`. These are counted **once per `message.id`** (not per line) and summed into per-session totals, including subagent runs. A later enhancement can split them across finer categories (CLAUDE.md, skills, @-mentions, tool I/O, thinking, user text, subagent overhead).

## 3. Sessions list — what we extract

The server scans every file and aggregates one summary row per session. These become the sortable, searchable columns of the list view.

| Column | Derived from |
| --- | --- |
| Session id | Filename (session UUID) |
| Project | `cwd` (folder name as fallback) |
| Title | `ai-title` line, else first real user prompt, truncated |
| Date | Date of the first `timestamp` |
| Duration | Last `timestamp` − first `timestamp` |
| Prompts / messages | Count of typed prompts and distinct assistant messages |
| Total tokens | Sum of `message.usage` once per message (4 raw fields) |
| Tools used | Tally of `tool_use` block names (count per tool) |
| Model(s) | Distinct `message.model` values |
| Git branch | `gitBranch` |
| CC version | `version` |

Results are cached by file mtime + size, so re-scans are fast and only changed files are re-parsed.

## 4. Session detail — the story

Clicking a session rebuilds it in file order (the file is append-only and chronological; `parentUuid` is kept on every event for a future branch view). Each event renders through a type-specific component, so the detail view reads as a narrative of what actually happened. The timeline surfaces:

- **Original prompt** — the first typed `user` prompt; later typed prompts shown inline in order.
- **Injected context** — `attachment` entries, `<system-reminder>` text blocks and meta user entries: the context Claude Code adds that you didn't type (collapsed).
- **Hooks** — hook attachments and stop-hook summaries, labelled with event, hook name and exit code.
- **Tools** — each `tool_use` (name + full input) paired to its `tool_result` by id, with per-tool views: Read shows the file path, Edit shows removed/added lines, Bash shows command + output, Grep shows the pattern and matches.
- **Skills** — `tool_use` with name `Skill`, plus `invoked_skills` attachments.
- **Commands** — slash commands (`<command-name>` user entries and `local_command` system entries); Bash commands appear as tool cards.
- **Responses** — assistant `text` blocks, rendered Markdown.
- **Thinking** — `thinking` blocks, collapsed by default.
- **Subagents** — `Agent` (formerly `Task`) tool calls, expandable into the subagent's own timeline read from its `subagents/` file; nests to any depth.

Above the timeline, a header strip repeats the session's totals (tokens by field, duration, tool tally, skills and commands used) so the “what happened” summary is visible at a glance.

## 5. How hooks, skills, commands & injected content are identified

These aren't separate fields in the transcript — they're derived from the raw lines. The parser applies these rules:

| What | How it's detected |
| --- | --- |
| Hooks | `attachment` with type `hook_success`, `async_hook_response`, `hook_additional_context`, `hook_system_message`; `system` with subtype `stop_hook_summary` |
| Injected context | Other `attachment` entries; `text` blocks beginning with `<system-reminder>`; `user` entries marked `isMeta` / `isCompactSummary` |
| Skills | `tool_use` blocks with `name` = `Skill` (skill name from `input.skill`); `invoked_skills` attachments |
| Commands | `user` string content with `<command-name>`; `system` with subtype `local_command`; Bash `tool_use` blocks |
| Tool pairing | `tool_use.id` matched to `tool_result.tool_use_id` in a later `user` entry |
| Subagents | `tool_use` named `Agent`/`Task`, linked to `subagents/agent-<id>.jsonl` via `toolUseId` in its `.meta.json` |

Because type names evolve across Claude Code versions, detection is defensive: anything unrecognized is still shown on the timeline as a raw event rather than dropped (only the known bookkeeping types are hidden).

## 6. Architecture & tech stack

The browser can't read `~/.claude/` directly, so the files are read on the server. Next.js lets that happen inside the same app as the UI: Server Components call the parsing code directly, so there is no separate backend, no REST API to keep in sync, and one set of TypeScript types shared end to end. The detail view is component-heavy (per-tool views, diffs, nested subagent trees, collapsible sections), which is exactly what React is suited to.

**Server side — `src/lib/transcripts/` (server-only TypeScript, Node `fs`)**

- `types.ts` defines the shared types: the `Event` union (prompt, command, injected, hook, text, thinking, tool, system, raw), `SessionSummary`, `SessionDetail`, `SubagentRun`, `TokenTotals`.
- `reader.ts` scans `CLAUDE_ROOT` or `~/.claude/projects`, finds sessions and their subagent files, and reads JSONL defensively (skips bad or partial lines).
- `classify.ts` turns each raw line into events per §5; `aggregate.ts` builds the list summaries with an mtime + size cache; `timeline.ts` builds the detail view (tool pairing, subagent linking).
- Later: live-tail running sessions.

**UI — React Server + Client Components, Tailwind**

- `app/page.tsx` (list) and `app/sessions/[id]/page.tsx` (detail) are dynamic Server Components that read fresh data on each load; a Refresh button calls `router.refresh()`.
- Client components handle search, sorting, collapsing and the per-tool views (`components/tools/`: Read, Edit, Write, Bash, Grep, Skill, Subagent (recursive), generic fallback).
- Markdown via `react-markdown`. Tests with Vitest + Testing Library.

## 7. Project structure

```
claude-lifecycle-ui/
├─ src/
│  ├─ lib/
│  │  ├─ format.ts             # duration / token formatting
│  │  └─ transcripts/          # server-only: types, reader, classify, aggregate, timeline, config
│  ├─ app/
│  │  ├─ layout.tsx, globals.css
│  │  ├─ page.tsx              # sessions list
│  │  └─ sessions/[id]/page.tsx  # session detail
│  └─ components/              # list, table, header strip, timeline, event views
│     └─ tools/                # one view per tool
├─ test/                       # factories, fixtures, setup
├─ package.json                # next, react, react-markdown, tailwind, vitest
└─ README.md
```

## 8. Running it

**Development:** `npm run dev` — hot reload on `http://localhost:3000`.

**Everyday use (one command):** `npm run app` — builds and starts the production server on `http://127.0.0.1:3000`. No database, no API keys, no login. Point at another transcripts folder with `CLAUDE_ROOT=/path npm run app`.

Setup is a single `npm install`.

## 9. Decisions

- [x] **Stack** — one Next.js + React + TypeScript app; no Postgres, no separate backend.
- [x] **Styling** — Tailwind.
- [x] **Types** — one shared TypeScript `types.ts` (no code generation needed in a single app).
- [x] **Token detail** — the 4 raw `usage` fields, counted once per message.
- [x] **Live tail** — manual refresh in v1.

**Next step:** execute the implementation plan task by task, testing against realistic sample transcripts, then check it against the real `~/.claude`.
