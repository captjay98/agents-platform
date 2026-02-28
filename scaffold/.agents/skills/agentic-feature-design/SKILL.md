---
name: agentic-feature-design
description: Design features for dual consumption — humans (UI) and agents (API)
---

# Agentic Feature Design

Features must be designed for **dual consumption**: Humans (UI) and Agents (API/MCP).

## The "Headless First" Rule

Every feature must be fully functional via API _before_ any UI is built.

**Test:** Can an agent complete the entire user story using only API calls?

## The "Intention" Pattern

Expose semantic actions, not generic CRUD:

```
// ❌ Generic — agent can't infer intent
updateOrder(id, { status: 'shipped' })

// ✅ Semantic — agent understands the action
shipOrder(id, { trackingNumber, carrier })
```

## Design Checklist

- [ ] All actions available via API (not just UI)
- [ ] Responses are structured and machine-parseable
- [ ] Errors include actionable context (not just "something went wrong")
- [ ] State transitions are explicit and observable
- [ ] High-stakes actions have approval gates

<!-- PROJECT: Your specific API patterns, server function conventions, and agent integration points -->

## Decision Guide

**Use when:**
- Designing a new feature that an AI agent will need to execute
- Feature logic lives in UI components instead of API/service layer
- Adding a new API endpoint that should be self-documenting

**Don't use when:**
- Purely presentational features (charts, formatting, layout)
- Internal tooling that will never be agent-accessible

**Decision tree:**
- Can an agent complete this via API? → If no, refactor logic out of UI
- New endpoint? → Add description and workflow docs
- Generic CRUD? → Rename to semantic action
- High-stakes action? → Add approval gate

**Failure modes:**
- Logic in components → agents can't execute
- Generic names → agents can't infer intent
- No workflow docs → wrong function call order
- No approval gate → irreversible autonomous actions
