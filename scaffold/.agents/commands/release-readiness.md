---
description: 'Pre-release gate check — runs all hard gates and reports GO / NO-GO with evidence'
---

@fullstack-engineer Run release readiness check: $ARGUMENTS

## Hard Gates (any failure = NO-GO)

### Step 1: Type Check

```bash
# <!-- PROJECT: Your typecheck command -->
```

**Expected**: Exit 0, no errors. **If fails**: NO-GO. List all errors.

### Step 2: Lint

```bash
# <!-- PROJECT: Your lint command -->
```

**Expected**: Exit 0. **If fails**: NO-GO. List violations.

### Step 3: Tests

```bash
# <!-- PROJECT: Your test command -->
```

**Expected**: All pass, 0 failures. **If fails**: NO-GO. List failing tests.

### Step 4: Build

```bash
# <!-- PROJECT: Your build command -->
```

**Expected**: Build succeeds. **If fails**: NO-GO.

### Step 5: Security

```bash
# <!-- PROJECT: Your audit/security scan command -->
```

**Expected**: No critical/high vulnerabilities.

## Soft Gates (flag but don't block)

- [ ] Test coverage meets target (<!-- PROJECT: target -->%)
- [ ] No new TODO/FIXME introduced
- [ ] Documentation is current
- [ ] Performance benchmarks within tolerance

## Verdict

Output: **GO** or **NO-GO** with evidence for each gate.
