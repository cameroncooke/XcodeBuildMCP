# XcodeBuildMCP Installation Guide

> **Last Updated:** 2025-01-11
> **Purpose:** Complete guide for installing and configuring XcodeBuildMCP with all supported AI tools

## Quick Start

```bash
# 1. Clone and build
git clone <your-repo-url>
cd XcodeBuildMCP
npm install
npm run build

# 2. Configure all AI tools
./scripts/setup-claude-code.sh all

# 3. Verify installation
./scripts/setup-claude-code.sh --verify-only all
```

## Prerequisites

### System Requirements
- macOS 14+ (Sonoma) or later
- Node.js 18+ (recommended: latest LTS)
- Xcode 15+ with command line tools
- jq (JSON processor for configuration scripts)

### Install Dependencies
```bash
# Install Node.js (if not already installed)
brew install node

# Install jq (required for setup scripts)
brew install jq

# Install Xcode command line tools (if not already installed)
xcode-select --install
```

## Installation Steps

### Step 1: Clone and Build

```bash
# Clone the repository
git clone https://github.com/your-org/XcodeBuildMCP.git
cd XcodeBuildMCP

# Install dependencies
npm install

# Build the project
npm run build

# Verify build
ls -la build/index.js
```

### Step 2: Configure AI Tools

#### Option A: Automatic Configuration (Recommended)

```bash
# Configure all supported AI tools
./scripts/setup-claude-code.sh all

# Or configure specific tools
./scripts/setup-claude-code.sh claude-code
./scripts/setup-claude-code.sh claude-desktop
./scripts/setup-claude-code.sh factory-droid
```

#### Option B: Manual Configuration

See **MCP_CONFIG_LOCATIONS.md** for detailed manual configuration steps.

### Step 3: Verify Installation

```bash
# Verify all configurations
./scripts/setup-claude-code.sh --verify-only all

# Test with Claude Code CLI
claude mcp list

# Test with Factory Droid
# (Restart Factory Droid if already running)
```

## AI Tool Configuration

### Claude Code CLI

**Features:**
- 3 configuration scopes (local, project, user)
- CLI-based management
- Hot-reload support
- Development debugging tools

**Configuration:**
```bash
# Add XcodeBuildMCP
claude mcp add --transport stdio xcodebuildmcp -- node /path/to/XcodeBuildMCP/build/index.js

# List configured servers
claude mcp list

# Remove server
claude mcp remove xcodebuildmcp
```

**Scopes:**
- `--scope local` (default): Project-specific, user-private
- `--scope project`: Team-shared via Git
- `--scope user`: Cross-project, user-private

### Claude Desktop

**Features:**
- GUI-based configuration
- User-friendly setup
- Visual interface

**Configuration:**
1. Open Claude Desktop
2. Settings → Developer → Edit Config
3. Add configuration (see MCP_CONFIG_LOCATIONS.md)
4. Restart Claude Desktop

**Limitations:**
- Global configuration only
- Manual editing required
- No hot-reload support

### Factory Droid CLI

**Features:**
- Global configuration
- Similar to Claude Desktop
- Command-line interface

**Configuration:**
```bash
# Edit configuration file
~/.factory/mcp.json

# Restart Factory Droid to apply changes
```

## Development Setup

### Local Development Workflow

```bash
# 1. Make changes to code
# 2. Build locally
npm run build

# 3. Test with Claude Code hot-reload
# (No restart needed for Claude Code with stdio servers)

# 4. Test with other tools (requires restart)
# Restart Claude Desktop or Factory Droid
```

### Development Commands

```bash
# Development build with watch mode
npm run dev

# Bundle axe CLI tool (required for local MCP server)
npm run bundle:axe

# Run tests
npm run test

# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix
```

### Testing MCP Server Locally

```bash
# Using Reloaderoo (recommended for development)
npx reloaderoo inspect list-tools -- node build/index.js

# Call a specific tool
npx reloaderoo inspect call-tool list_sims --params '{}' -- node build/index.js

# Start persistent server for testing
npx reloaderoo proxy -- node build/index.js
```

## Platform-Specific Setup

### visionOS Development

XcodeBuildMCP includes visionOS support. Ensure you have:

```bash
# List available visionOS simulators
npx reloaderoo inspect call-tool list_sims --params '{}' -- node build/index.js

# Test visionOS build
npx reloaderoo inspect call-tool build_sim --params '{"platform":"visionOS Simulator"}' -- node build/index.js
```

### iPad/iOS Development

Standard iOS development tools are supported:

```bash
# List iPad simulators
npx reloaderoo inspect call-tool list_sims --params '{}' -- node build/index.js

# Build for iPad
npx reloaderoo inspect call-tool build_sim --params '{"simulatorName":"iPad Pro"}' -- node build/index.js
```

### macOS Development

Native macOS app development:

```bash
# Build macOS app
npx reloaderoo inspect call-tool build_macos --params '{"projectPath":"/path/to/project.xcodeproj","scheme":"YourScheme"}' -- node build/index.js
```

## Troubleshooting

### Common Issues

#### Build Errors
```bash
# Clear build cache
rm -rf build
npm run build

# Check Node.js version
node --version  # Should be 18+
```

#### Configuration Issues
```bash
# Verify configuration files exist
ls -la ~/.claude.json
ls -la ~/Library/Application\ Support/Claude/claude_desktop_config.json
ls -la ~/.factory/mcp.json

# Use setup script to fix
./scripts/setup-claude-code.sh --verify-only all
```

#### MCP Server Connection Issues
```bash
# Test MCP server directly
node build/index.js

# Check if build is current
npm run build

# Verify paths in configuration files
```

### Debug Mode

```bash
# Enable debug logging for Claude Code
claude --mcp-debug

# Check MCP server output
npx reloaderoo proxy --log-level debug -- node build/index.js
```

### Log Locations

- **Claude Code:** `~/.claude/debug/`
- **Claude Desktop:** Console.app
- **Factory Droid:** Session logs
- **XcodeBuildMCP:** Configured via environment variables

## Configuration Files Reference

### Claude Code CLI: `~/.claude.json`
```json
{
  "mcpServers": {
    "XcodeBuildMCP": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/XcodeBuildMCP/build/index.js"],
      "env": {
        "XCODEBUILDMCP_ENABLED_WORKFLOWS": "simulator,device,logging,project-discovery,ui-testing",
        "XCODEBUILDMCP_SENTRY_DISABLED": "true",
        "INCREMENTAL_BUILDS_ENABLED": "false"
      }
    }
  }
}
```

### Claude Desktop: `~/Library/Application Support/Claude/claude_desktop_config.json`
```json
{
  "mcpServers": {
    "XcodeBuildMCP": {
      "command": "node",
      "args": ["/path/to/XcodeBuildMCP/build/index.js"],
      "env": {
        "XCODEBUILDMCP_ENABLED_WORKFLOWS": "simulator,device,logging,project-discovery,ui-testing",
        "XCODEBUILDMCP_SENTRY_DISABLED": "true",
        "INCREMENTAL_BUILDS_ENABLED": "false"
      }
    }
  }
}
```

### Factory Droid: `~/.factory/mcp.json`
```json
{
  "mcpServers": {
    "XcodeBuildMCP": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/XcodeBuildMCP/build/index.js"],
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

## Environment Variables

### XcodeBuildMCP Configuration
```bash
# Enable specific workflows
export XCODEBUILDMCP_ENABLED_WORKFLOWS="simulator,device,logging,project-discovery,ui-testing"

# Disable Sentry error reporting
export XCODEBUILDMCP_SENTRY_DISABLED="true"

# Disable incremental builds
export INCREMENTAL_BUILDS_ENABLED="false"

# Enable debug logging
export XCODEBUILDMCP_DEBUG="true"
```

### Claude Code Configuration
```bash
# MCP server timeout (milliseconds)
export MCP_TIMEOUT=30000

# Maximum MCP output tokens
export MAX_MCP_OUTPUT_TOKENS=50000

# Enable debug logging
export ANTHROPIC_LOG=debug
```

## Next Steps

After installation:

1. **Test visionOS builds**: See `AGENT_QUICK_START.md`
2. **Explore tools**: Use `/mcp` in Claude Code to see available tools
3. **Read documentation**: `docs/TOOLS.md` for complete tool reference
4. **Join community**: GitHub discussions for support

## Support

- **Documentation**: See `docs/` directory
- **Issues**: GitHub issues
- **Quick Reference**: `AGENT_QUICK_START.md`
- **Configuration**: `MCP_CONFIG_LOCATIONS.md`

## Version Information

Check your version:
```bash
cd XcodeBuildMCP
npm run version
```

For release notes, see `CHANGELOG.md`.
