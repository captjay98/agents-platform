---
description: 'Configure Neon PostgreSQL database'
---

@devops-engineer Set up Neon database: $ARGUMENTS

## Protocol

1. Create project/branch in Neon dashboard (or CLI).
2. Get connection string and set in `.env`.
3. Run migrations:
```bash
# <!-- PROJECT: Your migration command -->
```
4. Verify connection:
```bash
# <!-- PROJECT: Your DB connection test command -->
```

## Branch Strategy

- `main` branch → production database
- Feature branches → use Neon branching for isolated dev databases

<!-- PROJECT: Your specific Neon project ID, branching workflow, and pooling config -->
