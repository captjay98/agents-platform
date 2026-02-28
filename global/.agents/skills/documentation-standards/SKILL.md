---
name: documentation-standards
description: Documentation standards and best practices for modern software projects
---

## Documentation Types

### 1. API Documentation

**Location**: `docs/api/`

**Format**:

````markdown
# Feature Name API

## Endpoints

### GET /api/batches

Get all batches for a farm

**Parameters:**

- `farmId` (string, required) - Farm UUID

**Response:**

```typescript
{
  batches: Array<{
    id: string;
    batchName: string;
    species: string;
    status: string;
  }>;
}
```
````

**Example:**

```typescript
const batches = await getBatches({ farmId: "uuid" });
```

````

### 2. Architecture Documentation
**Location**: `docs/ARCHITECTURE.md`

**Sections:**
- System overview
- Request flow
- Key patterns
- Technology stack
- Design decisions

### 3. Database Documentation
**Location**: `docs/DATABASE.md`

**Sections:**
- Schema overview
- Table relationships
- Indexes
- Constraints
- Migration guide

### 4. User Guides
**Location**: `docs/guides/`

**Format**:
```markdown
# Feature Name Guide

## Overview
What this feature does

## Getting Started
Step-by-step instructions

## Common Tasks
- Task 1
- Task 2

## Troubleshooting
Common issues and solutions

## FAQ
Frequently asked questions
````

### 5. Development Log

**Location**: `DEVLOG.md`

**Format**:

```markdown
## Day N (YYYY-MM-DD)

### What I Built

- Feature 1
- Feature 2

### Technical Decisions

- Decision and rationale

### Challenges & Solutions

- Challenge: Description
- Solution: How it was solved

### Time Spent

- Feature work: X hours
- Bug fixes: Y hours
- Documentation: Z hours

### Next Steps

- [ ] Task 1
- [ ] Task 2
```

## Code Documentation

### JSDoc Comments

```typescript
/**
 * Calculate feed conversion ratio for a batch
 * @param feedConsumed - Total feed consumed in kg
 * @param weightGained - Total weight gained in kg
 * @returns FCR value (lower is better)
 * @example
 * const fcr = calculateFCR(1000, 600) // Returns 1.67
 */
export function calculateFCR(
  feedConsumed: number,
  weightGained: number,
): number {
  return feedConsumed / weightGained;
}
```

### Inline Comments

```typescript
// Only comment complex logic, not obvious code

// ✅ Good - explains WHY
// Use dynamic import for Cloudflare Workers compatibility
const { db } = await import('~/lib/db')

// ❌ Bad - explains WHAT (obvious from code)
// Loop through batches
for (const batch of batches) {
```

### README Files

Each major directory should have a README:

```markdown
# Directory Name

## Purpose

What this directory contains

## Structure

- `file1.ts` - Description
- `file2.ts` - Description

## Usage

How to use code in this directory

## Related

Links to related documentation
```

## Documentation Standards

### Writing Style

- Clear and concise
- Active voice
- Present tense
- Second person ("you")
- Short paragraphs

### Code Examples

- Complete and runnable
- Include imports
- Show expected output
- Handle errors

### Formatting

- Use markdown
- Code blocks with language tags
- Tables for structured data
- Lists for steps/items
- Headings for hierarchy

## Documentation Checklist

### New Feature

- [ ] API documentation
- [ ] User guide
- [ ] Code comments
- [ ] README updated
- [ ] DEVLOG entry
- [ ] CHANGELOG entry

### Bug Fix

- [ ] DEVLOG entry
- [ ] CHANGELOG entry
- [ ] Update affected docs

### Refactoring

- [ ] Update architecture docs
- [ ] Update code comments
- [ ] DEVLOG entry

## Maintenance

### Regular Updates

- Review docs quarterly
- Update outdated examples
- Fix broken links
- Verify code examples still work

### Documentation Debt

Track in issues:

```markdown
## Documentation Debt

- [ ] Document batch forecasting algorithm
- [ ] Add examples to financial calculations
- [ ] Update deployment guide for new Cloudflare features
```

## Tools

### Markdown Linting

```bash
# Check markdown formatting
markdownlint docs/**/*.md
```

### Link Checking

```bash
# Verify no broken links
markdown-link-check docs/**/*.md
```

### API Documentation Generation

```bash
# Generate TypeScript API docs
typedoc --out docs/api app/
```

## Templates

### Feature Documentation Template

```markdown
# Feature Name

## Overview

Brief description

## Use Cases

- Use case 1
- Use case 2

## Implementation

Technical details

## API Reference

Endpoints and functions

## Examples

Code examples

## Testing

How to test

## Troubleshooting

Common issues
```

### Migration Guide Template

```markdown
# Migration: Old → New

## Breaking Changes

List of breaking changes

## Migration Steps

1. Step 1
2. Step 2

## Code Changes

Before/after examples

## Rollback

How to rollback if needed
```
