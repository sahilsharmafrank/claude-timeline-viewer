# Claude Session Viewer

A local, read-only web UI for browsing Claude Code session transcripts. It reads the JSONL files under `~/.claude/projects`, lists every session across all projects (newest first, searchable), and shows each session as a timeline: prompts, replies, tool calls with their output, hooks, injected context, slash commands, and nested subagent runs, with token totals. No database, no API keys, no network calls; the production server binds to `127.0.0.1` only.

## Setup

```bash
npm install
```

## Everyday use

```bash
npm run app
```

This builds and starts the server, then open <http://127.0.0.1:3000>.

## Development

```bash
npm run dev
```

Dev runs on <http://127.0.0.1:3000>. Both modes bind to `127.0.0.1` only.

## Using a different transcripts folder

The root defaults to `~/.claude/projects`. Override it with `CLAUDE_ROOT`:

```bash
CLAUDE_ROOT=/path/to/projects npm run app
```

The viewer never writes, moves, or deletes anything under that folder.

## Tests

```bash
npm test
```

## How transcripts are read

- Folder names are not URL-encoded (`/` and `.` both become `-`), so the project path is taken from the `cwd` of the first line that has one; the decoded folder name is only a fallback.
- One API reply is written as several `assistant` lines that each repeat the same `usage`, so tokens are counted once per `message.id`.
- Hooks come from `attachment` lines (`hook_success`, `async_hook_response`, `hook_additional_context`, `hook_system_message`) and `stop_hook_summary` system lines.
- Injected context (`skill_listing`, `environment`, `instructions`, ...) comes from `attachment` lines; when present, the exact text the model saw is shown from `rendered`.
- Slash commands are detected from `<command-name>` in user lines and `local_command` system lines.
- Subagents are separate files in `<session-id>/subagents/`; each `.meta.json`'s `toolUseId` links it to the parent `Agent` tool call, and it is nested under that call.
- Bookkeeping lines with no `uuid`/`timestamp` (`ai-title`, `cost-state`, `queue-operation`, `file-history-snapshot`, ...) stay off the timeline; `ai-title` supplies the session title. Unknown line types are shown as raw events, never dropped.
