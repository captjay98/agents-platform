# Project Memory — [PROJECT_NAME]

## Workspace Shape
<!-- What repos exist, how they relate, what runs where -->

## Product Model
<!-- Core business loop in 3-5 bullet points. Who are the users? What's the critical flow? -->

## Operational Truths
<!-- The non-obvious things an agent MUST know to avoid breaking things.
     Money handling, auth patterns, data conventions, API contracts. -->

## High-Risk Areas
<!-- Files and modules where mistakes cause real damage.
     Financial flows, auth boundaries, data migrations, payment integrations. -->

## Verification Defaults
<!-- Exact commands to verify changes are correct -->
- Agent config: `bun .agents/scripts/build.mjs && bun .agents/scripts/lint.mjs`
- App: `<!-- PROJECT: your build/test commands -->`

## Recent Decisions
<!-- Decisions made in the last few sessions that agents should respect.
     Remove entries older than ~2 weeks. -->
