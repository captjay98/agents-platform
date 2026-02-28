---
trigger: before_commit
---

# Git Safety

Before any git commit, verify no sensitive data is being committed.

## Pre-Commit Checklist

1.  Run `git status` to see all staged files
2.  Run `git diff --cached` to review changes
3.  Check for sensitive data:
    - API keys and secrets
    - Passwords and credentials
    - `.env` files with real values
    - Private keys
    - Access tokens

## Files to Watch

- `.env`, `.env.local`, `.env.production`
- `*.pem`, `*.key` files
- `credentials.json`, `serviceAccount.json`
- Any config file with hardcoded secrets

## Build Artifacts to Exclude

- `node_modules/`
- `vendor/`
- `.dart_tool/`
- `build/`, `dist/`, `.next/`, `.output/`
- `*.log`

## If Sensitive Data Detected

STOP and warn the user. Do not proceed with commit.
