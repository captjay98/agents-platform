---
name: sentry-create-alert
description: Create Sentry alerts using the workflow engine API. Use when asked to create alerts, set up notifications, or configure issue priority alerts. Supports email, Slack, PagerDuty, Discord.
---

# Create Sentry Alert

Adapted from the official `getsentry/sentry-agent-skills` repo (Apache-2.0). Uses Sentry's workflow engine API (beta).

## When to Use

- User asks to create a Sentry alert or set up notifications
- User wants email/Slack/PagerDuty notifications for issues
- User mentions priority alerts or workflow automations

## Prerequisites

- `curl` available in shell
- Sentry org auth token with `alerts:write` scope

## Phase 1: Gather Configuration

| Detail | Required | Example |
|--------|----------|---------|
| Org slug | Yes | `my-org` |
| Auth token | Yes | `sntryu_...` (needs `alerts:write`) |
| Region | Yes (default: `us`) | `us` → `us.sentry.io`, `de` → `de.sentry.io` |
| Alert name | Yes | `"High Priority Alert"` |
| Trigger events | Yes | Which issue events fire the workflow |
| Conditions | Optional | Filter before actions execute |
| Action type | Yes | `email`, `slack`, `pagerduty` |
| Action target | Yes | User email, team, channel |

## Phase 2: Look Up IDs

```bash
API="https://{region}.sentry.io/api/0/organizations/{org}"
AUTH="Authorization: Bearer {token}"

# Find user ID by email
curl -s "$API/members/" -H "$AUTH" | python3 -c "
import json,sys
for m in json.load(sys.stdin):
  if m.get('email')=='USER_EMAIL': print(m['user']['id']); break"

# List teams
curl -s "$API/teams/" -H "$AUTH" | python3 -c "
import json,sys
for t in json.load(sys.stdin): print(t['id'], t['slug'])"

# List integrations (Slack/PagerDuty)
curl -s "$API/integrations/" -H "$AUTH" | python3 -c "
import json,sys
for i in json.load(sys.stdin): print(i['id'], i['provider']['key'], i['name'])"
```

## Phase 3: Build Payload

### Trigger Events

| Type | Fires when |
|------|-----------|
| `first_seen_event` | New issue created |
| `regression_event` | Resolved issue recurs |
| `reappeared_event` | Archived issue reappears |

### Filter Conditions

| Type | `comparison` format |
|------|---------------------|
| `issue_priority_greater_or_equal` | `75` (Low=25, Med=50, High=75) |
| `event_frequency_count` | `{"value": 100, "interval": "1hr"}` |
| `event_unique_user_frequency_count` | `{"value": 50, "interval": "1hr"}` |
| `tagged_event` | `{"key": "level", "match": "eq", "value": "error"}` |
| `level` | `{"level": 40, "match": "gte"}` (fatal=50, error=40, warning=30) |

### Actions

| Type | Key Config |
|------|-----------|
| `email` | `config.targetType`: `"user"/"team"/"issue_owners"`, `config.targetIdentifier`: `<id>` |
| `slack` | `integrationId`: `<id>`, `config.targetDisplay`: `"#channel"` |
| `pagerduty` | `integrationId`: `<id>`, `data.priority`: `"critical"` |

### Example Payload

```json
{
  "name": "High Priority Alert",
  "enabled": true,
  "environment": null,
  "config": { "frequency": 30 },
  "triggers": {
    "logicType": "any-short",
    "conditions": [
      { "type": "first_seen_event", "comparison": true, "conditionResult": true }
    ],
    "actions": []
  },
  "actionFilters": [{
    "logicType": "all",
    "conditions": [
      { "type": "issue_priority_greater_or_equal", "comparison": 75, "conditionResult": true }
    ],
    "actions": [{
      "type": "email",
      "integrationId": null,
      "data": {},
      "config": { "targetType": "user", "targetIdentifier": "<user_id>" },
      "status": "active"
    }]
  }]
}
```

Note: `triggers.actions` is always `[]` — actions live inside `actionFilters[].actions`.

`frequency`: minutes between repeated notifications. Values: `0`, `5`, `10`, `30`, `60`, `180`, `720`, `1440`.

## Phase 4: Create

```bash
curl -s -w "\n%{http_code}" -X POST \
  "https://{region}.sentry.io/api/0/organizations/{org}/workflows/" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{payload}'
```

Expect HTTP `201`. Response contains workflow `id`.

## Phase 5: Verify

Confirm at: `https://{org}.sentry.io/monitors/alerts/{workflow_id}/`

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Token needs `alerts:write` scope |
| 403 Forbidden | Token must belong to target org |
| 404 Not Found | Check org slug and region |
| 400 Bad Request | Validate JSON structure and required fields |
