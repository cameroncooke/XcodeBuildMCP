---
description: Reminder to use rp-cli
repoprompt_managed: true
repoprompt_commands_version: 5
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
rp-cli -e 'search "keyword"'

# Read file (or slice)
rp-cli -e 'read Root/file.swift'
rp-cli -e 'read Root/file.swift --start-line 50 --limit 30'

# Edit (search/replace) - JSON format required
rp-cli -e 'call apply_edits {"path":"Root/file.swift","search":"old","replace":"new"}'
rp-cli -e 'call apply_edits {"path":"Root/file.swift","search":"a\nb","replace":"c\nd"}'

# File operations
rp-cli -e 'file create Root/new.swift "content..."'
rp-cli -e 'file delete /absolute/path.swift'
rp-cli -e 'file move Root/old.swift Root/new.swift'
```

## Context Management

```bash
# Check selection
rp-cli -e 'select get'

# Add files for chat context
rp-cli -e 'select add Root/path/file.swift'
```

Continue with your task using these tools.