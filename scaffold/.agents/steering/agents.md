# Agent Conventions

<!-- PROJECT: How AI agents should behave in your project -->

## Delegation Model

<!-- PROJECT: Which personas handle which domains. Example:
- Database/API work → @backend-engineer
- UI/components → @frontend-engineer
- Cross-stack features → @fullstack-engineer
- Deployment/infra → @devops-engineer
-->

## Verification Requirements

- Always run verification before claiming done
- Provide evidence (command + output), not just assertions
- If verification fails, fix before reporting

## File Conventions

- Skills: `.agents/skills/` — reusable knowledge
- Commands: `.agents/commands/` — workflows
- Steering: `.agents/steering/` — project context
- Rules: `.agents/rules/` — hard constraints
- Memory: `.agents/memory/` — institutional knowledge

## Communication

- Be direct. Skip preamble.
- Show code, not descriptions of code.
- When uncertain, say so. Don't guess.
