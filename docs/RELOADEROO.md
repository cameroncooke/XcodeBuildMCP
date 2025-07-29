# Reloaderoo Integration Guide

This guide explains how to use Reloaderoo v1.1.2+ for testing and developing XcodeBuildMCP with both CLI inspection tools and transparent proxy capabilities.

## Overview

**Reloaderoo** is a dual-mode MCP development tool that operates as both a CLI inspection tool and a transparent proxy server for the Model Context Protocol (MCP). It provides two distinct operational modes for different development workflows.

## Installation

Reloaderoo is available via npm and can be used with npx for universal compatibility.

```bash
# Use npx to run reloaderoo (works on any system)
npx reloaderoo@latest --help

# Or install globally if preferred
npm install -g reloaderoo
reloaderoo --help
```

## Two Operational Modes

### 🔍 **CLI Mode** (Inspection & Testing)

Direct command-line access to MCP servers without client setup - perfect for testing and debugging:

**Key Benefits:**
- ✅ **One-shot commands** - Test tools, list resources, get server info
- ✅ **No MCP client required** - Perfect for testing and debugging
- ✅ **Raw JSON output** - Ideal for scripts and automation  
- ✅ **8 inspection commands** - Complete MCP protocol coverage
- ✅ **AI agent friendly** - Designed for terminal-based AI development workflows

**Basic Commands:**

```bash
# List all available tools
npx reloaderoo@latest inspect list-tools -- node build/index.js

# Call any tool with parameters  
npx reloaderoo@latest inspect call-tool <tool_name> --params '<json>' -- node build/index.js

# Get server information
npx reloaderoo@latest inspect server-info -- node build/index.js

# List available resources
npx reloaderoo@latest inspect list-resources -- node build/index.js

# Read a specific resource
npx reloaderoo@latest inspect read-resource "<uri>" -- node build/index.js

# List available prompts
npx reloaderoo@latest inspect list-prompts -- node build/index.js

# Get a specific prompt
npx reloaderoo@latest inspect get-prompt <name> --args '<json>' -- node build/index.js

# Check server connectivity
npx reloaderoo@latest inspect ping -- node build/index.js
```

**Example Tool Calls:**

```bash
# List connected devices
npx reloaderoo@latest inspect call-tool list_devices --params '{}' -- node build/index.js

# Get diagnostic information
npx reloaderoo@latest inspect call-tool diagnostic --params '{}' -- node build/index.js

# List iOS simulators
npx reloaderoo@latest inspect call-tool list_sims --params '{}' -- node build/index.js

# Read devices resource
npx reloaderoo@latest inspect read-resource "xcodebuildmcp://devices" -- node build/index.js
```

### 🔄 **Proxy Mode** (Hot-Reload Development)

Transparent MCP proxy server that enables seamless hot-reloading during development:

**Key Benefits:**
- ✅ **Hot-reload MCP servers** without disconnecting your AI client
- ✅ **Session persistence** - Keep your development context intact
- ✅ **Automatic `restart_server` tool** - AI agents can restart servers on demand
- ✅ **Transparent forwarding** - Full MCP protocol passthrough
- ✅ **Process management** - Spawns, monitors, and restarts your server process

**Usage:**

```bash
# Start proxy mode (your AI client connects to this)
npx reloaderoo@latest proxy -- node build/index.js

# With debug logging
npx reloaderoo@latest proxy --log-level debug -- node build/index.js

# Then in your AI session, request:
# "Please restart the MCP server to load my latest changes"
```

The AI agent will automatically call the `restart_server` tool, preserving your session while reloading code changes.

## MCP Inspection Server Mode

Start CLI mode as a persistent MCP server for interactive debugging through MCP clients:

```bash
# Start reloaderoo in CLI mode as an MCP server
npx reloaderoo@latest inspect mcp -- node build/index.js
```

This runs CLI mode as a persistent MCP server, exposing 8 debug tools through the MCP protocol:
- `list_tools` - List all server tools
- `call_tool` - Call any server tool
- `list_resources` - List all server resources  
- `read_resource` - Read any server resource
- `list_prompts` - List all server prompts
- `get_prompt` - Get any server prompt
- `get_server_info` - Get comprehensive server information
- `ping` - Test server connectivity

## Claude Code Compatibility

When running under Claude Code, XcodeBuildMCP automatically detects the environment and consolidates multiple content blocks into single responses with `---` separators.

**Automatic Detection Methods:**
1. **Environment Variables**: `CLAUDECODE=1` or `CLAUDE_CODE_ENTRYPOINT=cli`
2. **Parent Process Analysis**: Checks if parent process contains 'claude'
3. **Graceful Fallback**: Falls back to environment variables if process detection fails

**No Configuration Required**: The consolidation happens automatically when Claude Code is detected.

## Command Reference

### Command Structure

```bash
npx reloaderoo@latest [options] [command]

Two modes, one tool:
• Proxy MCP server that adds support for hot-reloading MCP servers.
• CLI tool for inspecting MCP servers.

Global Options:
  -V, --version    Output the version number
  -h, --help       Display help for command

Commands:
  proxy [options]  🔄 Run as MCP proxy server (default behavior)
  inspect          🔍 Inspect and debug MCP servers
  info [options]   📊 Display version and configuration information
  help [command]   ❓ Display help for command
```

### 🔄 **Proxy Mode Commands**

```bash
npx reloaderoo@latest proxy [options] -- <child-command> [child-args...]

Options:
  -w, --working-dir <directory>    Working directory for the child process
  -l, --log-level <level>          Log level (debug, info, notice, warning, error, critical)
  -f, --log-file <path>            Custom log file path (logs to stderr by default)
  -t, --restart-timeout <ms>       Timeout for restart operations (default: 30000ms)
  -m, --max-restarts <number>      Maximum restart attempts (0-10, default: 3)
  -d, --restart-delay <ms>         Delay between restart attempts (default: 1000ms)
  -q, --quiet                      Suppress non-essential output
  --no-auto-restart                Disable automatic restart on crashes
  --debug                          Enable debug mode with verbose logging
  --dry-run                        Validate configuration without starting proxy

Examples:
  npx reloaderoo proxy -- node build/index.js
  npx reloaderoo -- node build/index.js                    # Same as above (proxy is default)
  npx reloaderoo proxy --log-level debug -- node build/index.js
```

### 🔍 **CLI Mode Commands**

```bash
npx reloaderoo@latest inspect [subcommand] [options] -- <child-command> [child-args...]

Subcommands:
  server-info [options]            Get server information and capabilities
  list-tools [options]             List all available tools
  call-tool [options] <name>       Call a specific tool
  list-resources [options]         List all available resources
  read-resource [options] <uri>    Read a specific resource
  list-prompts [options]           List all available prompts
  get-prompt [options] <name>      Get a specific prompt
  ping [options]                   Check server connectivity

Examples:
  npx reloaderoo@latest inspect list-tools -- node build/index.js
  npx reloaderoo@latest inspect call-tool list_devices --params '{}' -- node build/index.js
  npx reloaderoo@latest inspect server-info -- node build/index.js
```

### **Info Command**

```bash
npx reloaderoo@latest info [options]

Options:
  -v, --verbose                    Show detailed information
  -h, --help                       Display help for command
  
Examples:
  npx reloaderoo@latest info              # Show basic system information
  npx reloaderoo@latest info --verbose    # Show detailed diagnostics
```

### Response Format

All CLI commands return structured JSON:

```json
{
  "success": true,
  "data": {
    // Command-specific response data
  },
  "metadata": {
    "command": "call-tool:list_devices",
    "timestamp": "2025-07-25T08:32:47.042Z",
    "duration": 1782
  }
}
```

### Error Handling

When commands fail, you'll receive:

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE"
  },
  "metadata": {
    "command": "failed-command",
    "timestamp": "2025-07-25T08:32:47.042Z",
    "duration": 100
  }
}
```

## Development Workflow

### 🔍 **CLI Mode Workflow** (Testing & Debugging)

Perfect for testing individual tools or debugging server issues without MCP client setup:

```bash
# 1. Build XcodeBuildMCP
npm run build

# 2. Test your server quickly
npx reloaderoo@latest inspect list-tools -- node build/index.js

# 3. Call specific tools to verify behavior
npx reloaderoo@latest inspect call-tool list_devices --params '{}' -- node build/index.js

# 4. Check server health and resources
npx reloaderoo@latest inspect ping -- node build/index.js
npx reloaderoo@latest inspect list-resources -- node build/index.js
```

### 🔄 **Proxy Mode Workflow** (Hot-Reload Development)

For full development sessions with AI clients that need persistent connections:

#### 1. **Start Development Session**
Configure your AI client to connect to reloaderoo proxy instead of your server directly:
```bash
npx reloaderoo@latest proxy -- node build/index.js
# or with debug logging:
npx reloaderoo@latest proxy --log-level debug -- node build/index.js
```

#### 2. **Develop Your MCP Server**
Work on your XcodeBuildMCP code as usual - make changes, add tools, modify functionality.

#### 3. **Test Changes Instantly**
```bash
# Rebuild your changes
npm run build

# Then ask your AI agent to restart the server:
# "Please restart the MCP server to load my latest changes"
```

The agent will call the `restart_server` tool automatically. Your new capabilities are immediately available!

#### 4. **Continue Development**
Your AI session continues with the updated server capabilities. No connection loss, no context reset.

### 🛠️ **MCP Inspection Server** (Interactive CLI Debugging)

For interactive debugging through MCP clients:

```bash
# Start reloaderoo CLI mode as an MCP server
npx reloaderoo@latest inspect mcp -- node build/index.js

# Then connect with an MCP client to access debug tools
# Available tools: list_tools, call_tool, list_resources, etc.
```

## Troubleshooting

### 🔄 **Proxy Mode Issues**

**Server won't start in proxy mode:**
```bash
# Check if XcodeBuildMCP runs independently first
node build/index.js

# Then try with reloaderoo proxy to validate configuration
npx reloaderoo@latest proxy -- node build/index.js
```

**Connection problems with MCP clients:**
```bash
# Enable debug logging to see what's happening
npx reloaderoo@latest proxy --log-level debug -- node build/index.js

# Check system info and configuration
npx reloaderoo@latest info --verbose
```

**Restart failures in proxy mode:**
```bash
# Increase restart timeout
npx reloaderoo@latest proxy --restart-timeout 60000 -- node build/index.js

# Check restart limits  
npx reloaderoo@latest proxy --max-restarts 5 -- node build/index.js
```

### 🔍 **CLI Mode Issues**

**CLI commands failing:**
```bash
# Test basic connectivity first
npx reloaderoo@latest inspect ping -- node build/index.js

# Enable debug logging for CLI commands (via proxy debug mode)
npx reloaderoo@latest proxy --log-level debug -- node build/index.js
```

**JSON parsing errors:**
```bash
# Check server information for diagnostics
npx reloaderoo@latest inspect server-info -- node build/index.js

# Ensure your server outputs valid JSON
node build/index.js | head -10
```

### **General Issues**

**Command not found:**
```bash
# Ensure npx can find reloaderoo
npx reloaderoo@latest --help

# If that fails, try installing globally
npm install -g reloaderoo
```

**Parameter validation:**
```bash
# Ensure JSON parameters are properly quoted
npx reloaderoo@latest inspect call-tool list_devices --params '{}' -- node build/index.js
```

### **General Debug Mode**

```bash
# Get detailed information about what's happening
npx reloaderoo@latest proxy --debug -- node build/index.js  # For proxy mode
npx reloaderoo@latest proxy --log-level debug -- node build/index.js  # For detailed proxy logging

# View system diagnostics
npx reloaderoo@latest info --verbose
```

### Debug Tips

1. **Always build first**: Run `npm run build` before testing
2. **Check tool names**: Use `inspect list-tools` to see exact tool names
3. **Validate JSON**: Ensure parameters are valid JSON strings
4. **Enable debug logging**: Use `--log-level debug` or `--debug` for verbose output
5. **Test connectivity**: Use `inspect ping` to verify server communication

## Advanced Usage

### Environment Variables

Configure reloaderoo behavior via environment variables:

```bash
# Logging Configuration
export MCPDEV_PROXY_LOG_LEVEL=debug           # Log level (debug, info, notice, warning, error, critical)
export MCPDEV_PROXY_LOG_FILE=/path/to/log     # Custom log file path (default: stderr)
export MCPDEV_PROXY_DEBUG_MODE=true           # Enable debug mode (true/false)

# Process Management
export MCPDEV_PROXY_RESTART_LIMIT=5           # Maximum restart attempts (0-10, default: 3)
export MCPDEV_PROXY_AUTO_RESTART=true         # Enable/disable auto-restart (true/false)
export MCPDEV_PROXY_TIMEOUT=30000             # Operation timeout in milliseconds
export MCPDEV_PROXY_RESTART_DELAY=1000        # Delay between restart attempts in milliseconds
export MCPDEV_PROXY_CWD=/path/to/directory     # Default working directory
```

### Custom Working Directory

```bash
npx reloaderoo@latest proxy --working-dir /custom/path -- node build/index.js
npx reloaderoo@latest inspect list-tools --working-dir /custom/path -- node build/index.js
```

### Timeout Configuration

```bash
npx reloaderoo@latest proxy --restart-timeout 60000 -- node build/index.js
```

## Integration with XcodeBuildMCP

Reloaderoo is specifically configured to work with XcodeBuildMCP's:

- **84+ Tools**: All workflow groups accessible via CLI
- **4 Resources**: Direct access to devices, simulators, environment, swift-packages
- **Dynamic Tool Discovery**: Compatible with `discover_tools` functionality
- **Claude Code Detection**: Automatic consolidation of multiple content blocks
- **Hot-Reload Support**: Seamless development workflow with `restart_server`

For more information about XcodeBuildMCP's architecture and capabilities, see:
- [Architecture Guide](ARCHITECTURE.md)
- [Plugin Development Guide](PLUGIN_DEVELOPMENT.md)
- [Testing Guide](TESTING.md)