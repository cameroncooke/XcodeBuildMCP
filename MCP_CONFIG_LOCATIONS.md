# MCP Configuration Locations

> **Purpose:** Reference guide for where each AI tool stores MCP server configurations
> **Last Updated:** 2025-01-11
> **Status:** All configs point to local XcodeBuildMCP build
> **Note:** Added comprehensive Claude Code CLI vs Claude Desktop differences

## Configuration Files by Tool

### 1. Claude Code CLI

**Primary Location:**
```
~/.claude.json
```

**Additional Files:**
- `~/.claude/settings.json` - User preferences, hooks, plugins
- `./.mcp.json` - Project-scoped MCP servers (when using `--scope project`)

**Configuration Structure:**
```json
{
  "mcpServers": {
    "XcodeBuildMCP": {
      "type": "stdio",
      "command": "node",
      "args": [
        "/Users/dalecarman/Groove Jones Dropbox/Dale Carman/Projects/dev/XcodeBuildMCP/build/index.js"
      ],
      "env": {
        "XCODEBUILDMCP_ENABLED_WORKFLOWS": "simulator,device,logging,project-discovery,ui-testing",
        "XCODEBUILDMCP_SENTRY_DISABLED": "true",
        "INCREMENTAL_BUILDS_ENABLED": "false"
      }
    },
    "RepoPrompt": {
      "type": "stdio",
      "command": "/Users/dalecarman/RepoPrompt/repoprompt_cli",
      "args": [],
      "env": {}
    }
  }
}
```

**Status:** ✅ Using local build

**Configuration Methods:**
1. **CLI Commands:** `claude mcp add`, `claude mcp list`, `claude mcp remove`
2. **Direct file editing:** Edit `~/.claude.json`
3. **JSON import:** `claude mcp add-json`
4. **Project configs:** `.mcp.json` files (committed to Git)

**Configuration Scopes:**
- **Local scope** (`--scope local`) - Project-specific, user-private (default)
- **Project scope** (`--scope project`) - Team-shared via Git
- **User scope** (`--scope user`) - Cross-project, user-private

**Example Commands:**
```bash
# Add XcodeBuildMCP with different scopes
claude mcp add --transport stdio xcodebuild -- node /path/to/xcodebuildmcp/build/index.js
claude mcp add --transport stdio xcodebuild --scope user -- node /path/to/xcodebuildmcp/build/index.js

# List and manage
claude mcp list
claude mcp get XcodeBuildMCP
claude mcp remove XcodeBuildMCP

# Import from Claude Desktop
claude mcp add-from-claude-desktop
```

**Development Features:**
- Hot-reload with `restart_server` command for MCP development
- Debug mode: `--mcp-debug` flag
- Timeout configuration: `MCP_TIMEOUT` environment variable
- Output limits: `MAX_MCP_OUTPUT_TOKENS` environment variable

---

### 2. Cursor

**Location:**
```
~/.cursor/mcp.json
```

**Format:** JSON

**Current Configuration:**
```json
{
  "mcpServers": {
    "XcodeBuildMCP-Production": {
      "command": "node",
      "args": [
        "/Users/dalecarman/Groove Jones Dropbox/Dale Carman/Projects/dev/XcodeBuildMCP/build/index.js"
      ],
      "env": {
        "XCODEBUILDMCP_ENABLED_WORKFLOWS": "simulator,device,logging,project-discovery,ui-testing",
        "XCODEBUILDMCP_SENTRY_DISABLED": "true",
        "INCREMENTAL_BUILDS_ENABLED": "false"
      }
    },
    "XcodeBuildMCP-Dev": {
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
  }
}
```

**Status:** ✅ Both Production and Dev use local build

**Notes:**
- Has two configurations (Production and Dev)
- Both point to same local build
- Dev includes additional workflows (project-scaffolding)

---

### 3. Claude Desktop

**Location (macOS):**
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Location (Windows):**
```
%APPDATA%\Claude\claude_desktop_config.json
```

**Configuration Structure:**
```json
{
  "mcpServers": {
    "XcodeBuildMCP": {
      "command": "node",
      "args": [
        "/Users/dalecarman/Groove Jones Dropbox/Dale Carman/Projects/dev/XcodeBuildMCP/build/index.js"
      ],
      "env": {
        "XCODEBUILDMCP_ENABLED_WORKFLOWS": "simulator,device,logging,project-discovery,ui-testing",
        "XCODEBUILDMCP_SENTRY_DISABLED": "true",
        "INCREMENTAL_BUILDS_ENABLED": "false"
      }
    }
  }
}
```

**Status:** ✅ Using local build (when configured)

**Access Method:**
1. Open Claude Desktop
2. Settings → Developer → Edit Config
3. This creates/opens the config file

**Configuration Process:**
1. Open Claude Desktop
2. Click Settings → Developer → Edit Config
3. Edit JSON manually
4. Save and restart Claude Desktop

**Limitations:**
- Single scope: Global configuration only
- Manual editing: No CLI commands for management
- Restart required: Must restart app for config changes
- Limited transports: Primarily stdio-based servers

** Differences from Claude Code CLI:**
- **Configuration:** GUI-based vs CLI-based
- **Scopes:** Global only vs local/project/user scopes
- **Management:** Manual editing vs CLI commands
- **Development:** No hot-reload vs hot-reload support

---

### 4. Factory Droid CLI

**Location:**
```
~/.config/claude/mcp.json
```

**Format:** JSON (servers object, not mcpServers)

**Current Configuration:**
```json
{
  "servers": {
    "xcodebuildmcp": {
      "command": "node",
      "args": [
        "/Users/dalecarman/Groove Jones Dropbox/Dale Carman/Projects/dev/XcodeBuildMCP/build/index.js"
      ]
    }
  }
}
```

**Status:** ✅ Using local build

**Note:** Uses `servers` key, not `mcpServers` like other tools

---

### 4. Factory Droid CLI (Codex)

**Location:** Global config (NOT per-project)
```
~/.factory/mcp.json
```

**Format:** JSON (mcpServers object)

**Current Configuration:**
```json
{
  "mcpServers": {
    "XcodeBuildMCP": {
      "type": "stdio",
      "command": "node",
      "args": [
        "/Users/dalecarman/Groove Jones Dropbox/Dale Carman/Projects/dev/XcodeBuildMCP/build/index.js"
      ],
      "env": {
        "XCODEBUILDMCP_ENABLED_WORKFLOWS": "simulator,device,logging,project-discovery,ui-testing",
        "XCODEBUILDMCP_SENTRY_DISABLED": "true",
        "INCREMENTAL_BUILDS_ENABLED": "false"
      },
      "disabled": false
    }
  }
}
```

**Status:** ✅ Using local build

**Note:** Factory uses a GLOBAL config, not per-project configs

---

## Quick Reference

| Tool | Config Path | Format | Status |
|------|-------------|--------|--------|
| **Claude Code CLI** | `~/.claude.json` | JSON | ✅ Local build |
| **Cursor** | `~/.cursor/mcp.json` | JSON | ✅ Local build (2 servers) |
| **Claude Desktop** | `~/Library/Application Support/Claude/claude_desktop_config.json` | JSON | ✅ Local build (when configured) |
| **Factory Droid** | `~/.factory/mcp.json` | JSON | ✅ Local build |

---

## Updating Configuration

### When XcodeBuildMCP Code Changes

After making changes to XcodeBuildMCP:

```bash
# 1. Build the project
cd "/Users/dalecarman/Groove Jones Dropbox/Dale Carman/Projects/dev/XcodeBuildMCP"
npm run build

# 2. Restart your AI tool to reload MCP servers
# - Claude Code: Quit and relaunch
# - Cursor: Quit and relaunch
# - Factory Droid: Restart the CLI session
```

### Switching Between Published and Local

**To use published package (stable):**
```json
{
  "command": "npx",
  "args": ["-y", "xcodebuildmcp@latest"]
}
```

**To use local build (your changes):**
```json
{
  "command": "node",
  "args": ["/Users/dalecarman/Groove Jones Dropbox/Dale Carman/Projects/dev/XcodeBuildMCP/build/index.js"]
}
```

---

## Verification

**Check which version is running:**

In any AI tool, ask:
```
"What version of XcodeBuildMCP are you using?"
```

Should show:
- Version: 1.14.1 (from package.json)
- Using local build path if configured correctly

**Or check processes:**
```bash
ps aux | grep xcodebuildmcp | grep -v grep
```

Should show paths to your local build, not npm cache.

---

## Backups

**Before modifying configs, backups are created:**
- `~/.claude.json.backup-TIMESTAMP`
- `~/.cursor/mcp.json.backup-TIMESTAMP`

**To restore:**
```bash
cp ~/.claude.json.backup ~/.claude.json
cp ~/.cursor/mcp.json.backup ~/.cursor/mcp.json
```

---

## Summary

✅ **Claude Code CLI** - Using local build with full MCP configuration
✅ **Cursor** - Using local build (both Production and Dev)
✅ **Claude Desktop** - Configuration documented (requires manual setup)
✅ **Factory Droid** - Using local build

**Key Differences:**
- **Claude Code CLI:** 3 configuration scopes, CLI management, hot-reload for development
- **Claude Desktop:** GUI configuration, global scope only, manual setup required
- **Factory Droid:** Global configuration similar to Claude Desktop

**All configurable AI tools can use your local XcodeBuildMCP build with the visionOS platform fix.**
