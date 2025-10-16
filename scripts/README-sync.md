# AGENT_QUICK_START.md Sync Script

## Purpose

Maintains version-tracked `AGENT_QUICK_START.md` file across all 5 orchestrator repos to ensure all AI agents (Claude Code, Codex, etc.) have consistent XcodeBuildMCP documentation.

## Usage

```bash
# From XcodeBuildMCP repo root:
./scripts/sync-agent-quickstart.sh
```

## What It Does

1. Reads master version from `AGENT_QUICK_START.md`
2. Extracts version number from header
3. Copies file to all 5 orchestrator repos:
   - groovetech-media-server
   - PfizerOutdoCancerV2
   - groovetech-media-player
   - orchestrator
   - AVPStreamKit
4. Compares versions (skips if already up to date)
5. Reports sync status

## Version Management

### Current Version
Master file location:
```
/Users/dalecarman/Groove Jones Dropbox/Dale Carman/Projects/dev/XcodeBuildMCP/AGENT_QUICK_START.md
```

Version tracked in file header:
```markdown
> **Version:** 1.0.0
> **Last Updated:** 2025-10-10
```

### Updating Version

When you modify `AGENT_QUICK_START.md`:

1. **Edit the master file** in XcodeBuildMCP repo
2. **Bump the version** in the header:
   - Patch: Bug fixes, typos (1.0.0 → 1.0.1)
   - Minor: New sections, workflow additions (1.0.0 → 1.1.0)
   - Major: Breaking changes, restructure (1.0.0 → 2.0.0)
3. **Update "Last Updated"** date
4. **Run sync script** to deploy to all repos

### Version Numbering

Follow semantic versioning:

- **1.0.x** - Bug fixes, typos, clarifications
- **1.x.0** - New platform workflows, new sections, new troubleshooting
- **x.0.0** - Complete restructure, breaking changes to format

## Example Workflow

### Scenario: Adding New Troubleshooting Section

```bash
# 1. Edit master file
cd "/Users/dalecarman/Groove Jones Dropbox/Dale Carman/Projects/dev/XcodeBuildMCP"
# Edit AGENT_QUICK_START.md
# Update version: 1.0.0 → 1.1.0
# Update date: 2025-10-10

# 2. Run sync script
./scripts/sync-agent-quickstart.sh

# Output:
# 📦 Source: .../AGENT_QUICK_START.md
# 📌 Version: 1.1.0
#
# → Checking groovetech-media-server...
#   📝 Updating from v1.0.0 to v1.1.0
#   ✅ Synced successfully
# ...
# ✨ Sync complete! Version 1.1.0 deployed to 5 repos.
```

## Checking Current Versions

To see which version is deployed in each repo:

```bash
for repo in groovetech-media-server PfizerOutdoCancerV2 groovetech-media-player orchestrator AVPStreamKit; do
	echo "=== $repo ==="
	grep "Version:" "/Users/dalecarman/Groove Jones Dropbox/Dale Carman/Projects/dev/$repo/AGENT_QUICK_START.md" 2>/dev/null || echo "Not found"
done
```

## Integration with CLAUDE.md and AGENTS.md

Each repo's `CLAUDE.md` and `AGENTS.md` now references the quick start:

```markdown
## XcodeBuildMCP - Xcode Development Tools

**CRITICAL:** Before working on macOS, iPadOS, or visionOS development tasks, read:
- **@AGENT_QUICK_START.md** - Complete reference for XcodeBuildMCP tools
```

This ensures both Claude Code and Codex agents see the reference.

## Troubleshooting

### Script Fails to Copy

**Check repo paths exist:**
```bash
ls "/Users/dalecarman/Groove Jones Dropbox/Dale Carman/Projects/dev" | grep -E "(groovetech|Pfizer|orchestrator|AVP)"
```

### Version Not Detected

**Check version header format:**
```bash
head -5 AGENT_QUICK_START.md
# Should show:
# > **Version:** 1.0.0
```

### Permission Errors

**Make script executable:**
```bash
chmod +x scripts/sync-agent-quickstart.sh
```

## Maintenance

### When to Sync

Sync after:
- Adding new platform workflows
- Updating troubleshooting sections
- Fixing agent mistakes in documentation
- Adding new example workflows
- Updating testing status

### Before Syncing

1. Verify master file is correct
2. Bump version appropriately
3. Update "Last Updated" date
4. Test in one repo before mass sync

### After Syncing

The script doesn't auto-commit. You must manually:
1. Review changes in each repo
2. Commit if appropriate
3. Push to remotes

## Quick Reference

| Action | Command |
|--------|---------|
| Run sync | `./scripts/sync-agent-quickstart.sh` |
| Check versions | See "Checking Current Versions" above |
| Update version | Edit header in master file, then sync |
| View sync script | `cat scripts/sync-agent-quickstart.sh` |

---

**Master Location:** `/Users/dalecarman/Groove Jones Dropbox/Dale Carman/Projects/dev/XcodeBuildMCP/AGENT_QUICK_START.md`
