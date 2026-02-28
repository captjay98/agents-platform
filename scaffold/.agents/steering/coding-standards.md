# Coding Standards

<!-- PROJECT: Your language-specific conventions -->

## General

- Strict types everywhere
- No `any` types (TypeScript) / no mixed types (PHP)
- Explicit error handling — no silent catches
- Guard clauses before happy path

## Formatting

<!-- PROJECT: Your formatter and linter. Example:
- Formatter: Prettier / Pint
- Linter: ESLint / PHPStan
- Config: `.prettierrc`, `eslint.config.js`
- Run: `bun run lint`, `bun run format`
-->

## Naming

- Files: kebab-case
- Functions/variables: camelCase (TS) / snake_case (PHP/Python)
- Classes: PascalCase
- Constants: UPPER_SNAKE_CASE
- Database columns: snake_case
