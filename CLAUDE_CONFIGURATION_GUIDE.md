# Claude Configuration Locations & Differences: Claude Code CLI vs Claude Desktop

> **Last Updated:** 2025-01-11
> **Based on:** Official Claude documentation and MCP specifications

## Quick Reference Summary

| Platform | Config File | Config Key | Scope Support | Primary Use Case |
|----------|-------------|------------|---------------|------------------|
| **Claude Code CLI** | `~/.claude.json` | `mcpServers` | local, project, user | Development, coding, automation |
| **Claude Desktop** | `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) | `mcpServers` | Global only | General use,写作, brainstorming |
| **Factory Droid** | `~/.factory/mcp.json` | `mcpServers` | Global only | Factory AI Droid CLI |
| **Cursor** | `~/.cursor/mcp.json` | `mcpServers` | Global only | VS Code alternative |
| **Claude Desktop (Windows)** | `%APPDATA%\Claude\claude_desktop_config.json` | `mcpServers` | Global only | General use, Windows |

---

## Configuration File Locations

### Claude Code CLI

**Primary Configuration:**
```
~/.claude.json
```

**MCP Server Configuration Structure:**
```json
{
  "mcpServers": {
    "server-name": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/server.js"],
      "env": {
        "API_KEY": "value"
      }
    }
  },
  "otherSettings": {...}
}
```

**Additional Files:**
- `~/.claude/settings.json` - User preferences, hooks, plugins
- `~/.claude/projects/` - Project-specific settings
- `./.mcp.json` - Project-scoped MCP servers (when using `--scope project`)

### Claude Desktop

**macOS Location:**
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows Location:**
```
%APPDATA%\Claude\claude_desktop_config.json
```

**Configuration Structure:**
```json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/directory"],
      "env": {
        "API_KEY": "value"
      }
    }
  }
}
```

**Access Method:**
1. Open Claude Desktop
2. Settings → Developer → Edit Config
3. This creates/opens the config file

### Other Platforms

**Factory Droid:**
```
~/.factory/mcp.json
```

**Cursor:**
```
~/.cursor/mcp.json
```

---

## Platform Differences

### Claude Code CLI

**Advantages:**
- **Three configuration scopes:** local, project, user
- **Project-aware:** Deep codebase understanding
- **CLI-based:** Scriptable and automatable
- **Development-focused:** Built for coding workflows
- **Multiple transport types:** stdio, HTTP, SSE
- **Plugin system:** Extensible with plugins
- **Hot-reload:** `restart_server` command for MCP development

**Configuration Methods:**
1. **CLI Commands:** `claude mcp add`, `claude mcp list`, `claude mcp remove`
2. **Direct file editing:** Edit `~/.claude.json`
3. **JSON import:** `claude mcp add-json`
4. **Project configs:** `.mcp.json` files (committed to Git)

**Scope Hierarchy (highest to lowest priority):**
1. **Local scope** (`--scope local`) - Project-specific, user-private
2. **Project scope** (`--scope project`) - Team-shared via Git
3. **User scope** (`--scope user`) - Cross-project, user-private

**Example Commands:**
```bash
# Add server with different scopes
claude mcp add --transport stdio xcodebuild -- node /path/to/xcodebuildmcp
claude mcp add --transport http sentry --scope user https://mcp.sentry.dev/mcp
claude mcp add --transport http stripe --scope project https://mcp.stripe.com

# List and manage
claude mcp list
claude mcp get server-name
claude mcp remove server-name

# Import from Claude Desktop
claude mcp add-from-claude-desktop
```

### Claude Desktop

**Advantages:**
- **User-friendly:** GUI-based configuration
- **Simple setup:** Edit config file through Settings menu
- **Visual interface:** Better for non-developers
- **Consumer-focused:** Writing, brainstorming, general tasks

**Limitations:**
- **Single scope:** Global configuration only
- **Manual editing:** No CLI commands for management
- **Restart required:** Must restart app for config changes
- **Limited transports:** Primarily stdio-based servers

**Configuration Process:**
1. Open Claude Desktop
2. Click Settings → Developer → Edit Config
3. Edit JSON manually
4. Save and restart Claude Desktop

---

## MCP Installation Scopes

### Claude Code CLI Only

**Local Scope (Default)**
- **Storage:** Project-specific user settings
- **Visibility:** Private to user, current project only
- **Use case:** Personal development servers, sensitive credentials
- **Command:** `claude mcp add --scope local <server>`

**Project Scope**
- **Storage:** `./.mcp.json` (committed to version control)
- **Visibility:** Shared with entire team
- **Use case:** Team collaboration, project-specific tools
- **Command:** `claude mcp add --scope project <server>`
- **Approval:** Requires user approval for security

**User Scope**
- **Storage:** Cross-project user configuration
- **Visibility:** Private to user, all projects
- **Use case:** Personal utilities, frequently-used services
- **Command:** `claude mcp add --scope user <server>`

### Claude Desktop

**Global Scope Only**
- **Storage:** Single user configuration file
- **Visibility:** Available across all Claude Desktop sessions
- **No project-level isolation**

---

## Transport Types

### Claude Code CLI Supports:

1. **stdio (Standard Input/Output)**
   - Local process execution
   - Best for system access tools
   - Example: `claude mcp add --transport stdio filesystem -- npx -y @modelcontextprotocol/server-filesystem /path/to/dir`

2. **HTTP (Remote servers)**
   - Most widely supported for cloud services
   - Supports authentication headers
   - Example: `claude mcp add --transport http sentry https://mcp.sentry.dev/mcp`

3. **SSE (Server-Sent Events)**
   - Deprecated but still supported
   - Real-time communication
   - Example: `claude mcp add --transport sse asana https://mcp.asana.com/sse`

### Claude Desktop Primarily Supports:

1. **stdio (Main transport)**
   - Local command execution
   - Most reliable for Desktop environment
   - Example: `"command": "npx", "args": ["-y", "@modelcontextprotocol/server-github"]`

2. **Limited HTTP/SSE support**
   - Possible but not well-documented
   - Workarounds required for remote servers

---

## Environment Variable Expansion

### Claude Code CLI (.mcp.json)

**Supported syntax:**
- `${VAR}` - expands to environment variable
- `${VAR:-default}` - expands with default value

**Expansion locations:**
```json
{
  "mcpServers": {
    "api-server": {
      "type": "http",
      "url": "${API_BASE_URL:-https://api.example.com}/mcp",
      "headers": {
        "Authorization": "Bearer ${API_KEY}"
      },
      "command": "${CUSTOM_SERVER_PATH:-/usr/local/bin/server}",
      "args": ["--config", "${CONFIG_DIR}"],
      "env": {
        "DATABASE_URL": "${DB_URL}"
      }
    }
  }
}
```

### Claude Desktop

**Limited expansion support:**
- Basic `${VAR}` syntax works
- Some limitations reported with complex expansions
- Best to use absolute paths for reliability

---

## Authentication

### Claude Code CLI

**OAuth 2.0 Support:**
- Built-in OAuth flow via `/mcp` command
- Secure token storage and refresh
- Works with HTTP servers
- Example workflow:
  1. `claude mcp add --transport http sentry https://mcp.sentry.dev/mcp`
  2. In Claude Code: `/mcp`
  3. Select "Authenticate" for Sentry
  4. Complete browser flow

### Claude Desktop

**Manual token management:**
- Tokens stored in config file
- Manual setup for authentication
- No built-in OAuth flows
- Example:
```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your-token-here"
      }
    }
  }
}
```

---

## Plugin Integration

### Claude Code CLI

**Plugin MCP Servers:**
- Plugins can bundle MCP servers
- Automatic lifecycle management
- Configuration via `plugin.json` or `.mcp.json`
- Environment variable: `${CLAUDE_PLUGIN_ROOT}`

**Example Plugin MCP:**
```json
{
  "name": "my-plugin",
  "mcpServers": {
    "plugin-api": {
      "command": "${CLAUDE_PLUGIN_ROOT}/servers/api-server",
      "args": ["--port", "8080"]
    }
  }
}
```

### Claude Desktop

**No plugin system:**
- Manual configuration only
- No automatic server discovery
- Static configuration file

---

## Windows Considerations

### Claude Code CLI

**Windows stdio setup:**
```bash
# Required for npx servers on Windows
claude mcp add --transport stdio my-server -- cmd /c npx -y @some/package
```

### Claude Desktop

**Windows paths:**
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "C:\\Users\\yourname\\Desktop",
        "C:\\Users\\yourname\\Downloads"
      ]
    }
  }
}
```

---

## Development & Debugging

### Claude Code CLI

**Development features:**
- Hot-reload with `restart_server` tool
- Debug mode: `--mcp-debug` flag
- Timeout configuration: `MCP_TIMEOUT` environment variable
- Output limits: `MAX_MCP_OUTPUT_TOKENS` environment variable
- Verbose logging for troubleshooting

### Claude Desktop

**Debugging limitations:**
- No built-in debugging tools
- Requires manual log inspection
- Must restart for config changes
- No hot-reload capabilities

---

## Use Case Recommendations

### Choose Claude Code CLI for:

1. **Software development:** Deep codebase integration
2. **Team collaboration:** Project-scoped configurations
3. **Automation:** CLI-driven workflows
4. **MCP development:** Hot-reload and debugging tools
5. **Complex setups:** Multiple scopes and transport types
6. **Professional use:** Enterprise features and security

### Choose Claude Desktop for:

1. **General writing:** User-friendly interface
2. **Simple integrations:** Basic MCP server setup
3. **Non-developers:** GUI-based configuration
4. **Consumer tasks:** Writing, brainstorming, research
5. **Single machine:** Simple setup without project complexity

---

## Migration Between Platforms

### From Claude Desktop to Claude Code CLI

```bash
# Import existing configurations
claude mcp add-from-claude-desktop

# Or manually convert format
# Desktop: {"servers": {...}}  
# Code: {"mcpServers": {...}}
```

### From Claude Code CLI to Claude Desktop

1. Copy server configurations from `~/.claude.json`
2. Convert to Desktop format if needed
3. Paste into `claude_desktop_config.json`
4. Restart Claude Desktop

---

## Security Considerations

### Claude Code CLI

**Advantages:**
- Project isolation with scopes
- Approval prompts for project-scoped servers
- Secure OAuth flows
- Environment variable isolation

### Claude Desktop

**Considerations:**
- Global configuration exposure
- Manual token management
- No approval workflows
- Static credential storage

---

## Troubleshooting

### Claude Code CLI

**Common commands:**
```bash
# Check server status
/mcp

# Reset project approvals
claude mcp reset-project-choices

# Debug mode
claude --mcp-debug

# Check configuration
claude mcp list
claude mcp get server-name
```

### Claude Desktop

**Troubleshooting steps:**
1. Check config file syntax
2. Verify Node.js installation
3. Restart application
4. Check server command paths
5. Monitor logs for errors

---

## Conclusion

**Claude Code CLI** is the superior choice for:
- Developers and technical users
- Team collaboration
- Complex MCP configurations
- Professional development workflows

**Claude Desktop** excels for:
- General consumers
- Simple use cases
- Writing and brainstorming
- Users preferring GUI interfaces

The choice depends on your technical requirements, collaboration needs, and preferred interaction model. For serious development work, Claude Code CLI's advanced features and configuration options provide significantly more power and flexibility.
