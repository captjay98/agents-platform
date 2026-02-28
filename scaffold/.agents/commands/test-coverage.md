---
description: 'Analyze test coverage and identify gaps'
---

@qa-engineer Analyze test coverage: $ARGUMENTS

## Protocol

1. Run coverage report:
```bash
# <!-- PROJECT: Your coverage command -->
```

2. Identify uncovered critical paths:
   - Auth flows
   - Payment/financial logic
   - Data mutations
   - Error handling paths

3. Prioritize gaps by risk (high-risk untested code first).

4. Write tests for top 3 gaps.

## Output

| Area | Coverage | Risk | Action |
|------|----------|------|--------|
<!-- Results here -->

Target: <!-- PROJECT: coverage target -->%
