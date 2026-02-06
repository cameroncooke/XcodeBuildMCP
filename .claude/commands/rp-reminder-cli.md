---
description: Reminder to use rp-cli
repoprompt_managed: true
repoprompt_skills_version: 6
repoprompt_variant: cli
---

# RepoPrompt Tools Reminder (CLI)

Continue your current workflow using rp-cli instead of built-in alternatives.

## Primary Tools

| Task | Use This | Not This |
|------|----------|----------|
| Find files/content | `search` | grep, find, Glob |
| Read files | `read` | cat, Read |
| Edit files | `edit` | sed, Edit |
| Create/delete/move | `file` | touch, rm, mv, Write |

## Quick Reference

```bash
# Search (path or content)
rp-cli -w <window_id> -e 'search "keyword"'

# Read file (or slice)
rp-cli -w <window_id> -e 'read Root/file.swift'
rp-cli -w <window_id> -e 'read Root/file.swift --start-line 50 --limit 30'

# Edit (search/replace) - JSON format required
rp-cli -w <window_id> -e 'call apply_edits {"path":"Root/file.swift","search":"old","replace":"new"}'
rp-cli -w <window_id> -e 'call apply_edits {"path":"Root/file.swift","search":"a\nb","replace":"c\nd"}'

# File operations
rp-cli -w <window_id> -e 'file create Root/new.swift "content..."'
rp-cli -w <window_id> -e 'file delete /absolute/path.swift'
rp-cli -w <window_id> -e 'file move Root/old.swift Root/new.swift'
```

## Context Management

```bash
# Check selection
rp-cli -w <window_id> -e 'select get'

# Add files for chat context
rp-cli -w <window_id> -e 'select add Root/path/file.swift'
```

Continue with your task using these tools.