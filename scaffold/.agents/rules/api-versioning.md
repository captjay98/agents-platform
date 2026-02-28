---
trigger: file_edit
globs: ['**/routes/**', '**/api/**', '**/controllers/**']
---

# API Versioning

Version all API endpoints explicitly. Never break existing consumers.

## Enforcement

- Prefix routes: `/api/v1/`, `/api/v2/`
- New fields are additive (non-breaking)
- Removing or renaming fields requires a new version
- Document deprecation timeline

<!-- PROJECT: Show your project's route versioning pattern -->
