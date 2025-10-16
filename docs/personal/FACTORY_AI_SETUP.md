# Factory AI Droid CLI Setup Guide

Quick reference for using XcodeBuildMCP with Factory AI's Droid CLI.

---

## Configuration

**Location:** `~/.factory/mcp.json`

**Configured Servers:**
- `XcodeBuildMCP-Production` - Stable published version
- `XcodeBuildMCP-Dev` - Your local fork with enhancements

---

## Usage

### Check Available MCP Servers

```bash
# List configured servers
factory droid mcp list
```

### Test XcodeBuildMCP

**In Factory AI Droid CLI:**

```bash
# Start a session
factory droid start

# Test with production version
> Use XcodeBuildMCP-Production
> List available visionOS simulators

# Or test with dev version
> Use XcodeBuildMCP-Dev
> List available visionOS simulators
```

### Common Commands

**List visionOS Simulators:**
```
List all available Apple Vision Pro simulators
```

**Build for Vision Pro:**
```
Build my visionOS project for the simulator
```

**Capture Logs from Headset:**
```
Capture logs from my Vision Pro device
```

---

## Server Differences

### Production Version
- **Source:** Published npm package (v1.14.1)
- **Tools:** 61 (optimized workflows)
- **Stability:** High (tested release)
- **Use For:** Day-to-day development

### Dev Version
- **Source:** Your local fork
- **Tools:** 63 (includes project-scaffolding)
- **Stability:** Testing (your modifications)
- **Debug:** Enabled
- **Use For:** Testing new features

---

## Troubleshooting

### Factory AI Can't Find XcodeBuildMCP

1. **Verify config syntax:**
   ```bash
   cat ~/.factory/mcp.json | python3 -m json.tool
   ```

2. **Check Factory AI logs:**
   ```bash
   factory droid logs
   ```

3. **Restart Factory AI session:**
   ```bash
   factory droid stop
   factory droid start
   ```

### Build Path Issues

If Dev version fails, verify the path exists:
```bash
ls -la "/Users/dalecarman/Groove Jones Dropbox/Dale Carman/Projects/dev/XcodeBuildMCP/build/index.js"
```

Should show the built file.

---

## Configuration Details

**Production Server:**
```json
{
  "command": "npx",
  "args": ["-y", "xcodebuildmcp@latest"],
  "env": {
    "XCODEBUILDMCP_ENABLED_WORKFLOWS": "simulator,device,logging,project-discovery,ui-testing",
    "XCODEBUILDMCP_SENTRY_DISABLED": "true",
    "INCREMENTAL_BUILDS_ENABLED": "false"
  }
}
```

**Dev Server:**
```json
{
  "command": "node",
  "args": [
    "/Users/dalecarman/Groove Jones Dropbox/Dale Carman/Projects/dev/XcodeBuildMCP/build/index.js"
  ],
  "env": {
    "XCODEBUILDMCP_DEBUG": "true",
    "XCODEBUILDMCP_ENABLED_WORKFLOWS": "simulator,device,logging,project-discovery,ui-testing,project-scaffolding",
    "XCODEBUILDMCP_SENTRY_DISABLED": "true",
    "INCREMENTAL_BUILDS_ENABLED": "false"
  }
}
```

---

## Backup

**Backup created:** `~/.factory/mcp.json.backup-20251009`

To restore:
```bash
cp ~/.factory/mcp.json.backup-20251009 ~/.factory/mcp.json
```

---

## Quick Test

**Verify setup works:**

```bash
factory droid start
```

Then in the session:
```
List all visionOS simulators
```

**Expected:** Shows Apple Vision Pro simulators with xrOS runtimes

---

## Notes

- Factory AI Droid CLI has same dual-mode setup as Cursor
- Both Production and Dev versions available
- Use Production for stable work
- Use Dev for testing your enhancements
- Configuration identical to Cursor (same env vars, same workflows)

---

## Related Documentation

- `DALE_CHANGES.md` - Complete change log
- `TEAM_SETUP.md` - Team setup for Cursor
- `AVP_WORKFLOW_GUIDE.md` - Complete AVP workflows

---

**Last Updated:** 2025-10-09

