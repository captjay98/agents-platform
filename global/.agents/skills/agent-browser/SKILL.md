---
name: agent-browser
description: Use when an agent needs deterministic browser automation, page interaction, screenshots, or DOM/state inspection from the terminal
---

# Agent Browser

Use `agent-browser` for fast, scriptable browser actions from the CLI.

## When to Use

- You need reliable web UI automation without writing Playwright test files
- You need structured page state via `snapshot` refs for follow-up actions
- You need artifacts like screenshots/PDFs while an agent is running

## Setup

```bash
agent-browser install
```

`BROWSER_USE_API_KEY` is only needed when you explicitly use the `browseruse` provider (`-p browseruse`). Local default usage does not require it.

## Core Flow

```bash
agent-browser open https://example.com
agent-browser wait --load networkidle
agent-browser snapshot -i
agent-browser screenshot /tmp/example.png
agent-browser close
```

## Common Operations

```bash
agent-browser click @e2
agent-browser fill @e3 "user@example.com"
agent-browser get title
agent-browser get url
agent-browser eval "document.title"
```

## Notes

- Keep one session per task with `--session <name>` when parallelizing work.
- Use `snapshot -i` before clicks/fills so refs are stable and explicit.
- Use `--headed` for debugging visual issues.
