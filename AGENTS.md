This file provides guidance to AI assisants (Claude Code, Cursor etc) when working with code in this repository.

## Project Overview

XcodeBuildMCP is a Model Context Protocol (MCP) server providing standardized tools for AI assistants to interact with Xcode projects, iOS simulators, devices, and Apple development workflows. It's a TypeScript/Node.js project that runs as a stdio-based MCP server.

## Common Commands

### Build & Development
```bash
npm run build         # Compile TypeScript with tsup, generates version info
npm run dev           # Watch mode development
npm run bundle:axe    # Bundle axe CLI tool for simulator automation (needed when using local MCP server)
npm run test          # Run complete Vitest test suite
npm run test:watch    # Watch mode testing
npm run lint          # ESLint code checking
npm run lint:fix       # ESLint code checking and fixing
npm run format:check  # Prettier code checking
npm run format        # Prettier code formatting
npm run typecheck     # TypeScript type checking
npm run inspect       # Run interactive MCP protocol inspector
npm run doctor        # Doctor CLI
```

### Development with Reloaderoo

**Reloaderoo** (v1.1.2+) provides CLI-based testing and hot-reload capabilities for XcodeBuildMCP without requiring MCP client configuration.

#### Quick Start

**CLI Mode (Testing & Development):**
```bash
# List all tools
npx reloaderoo inspect list-tools -- node build/index.js

# Call any tool
npx reloaderoo inspect call-tool list_devices --params '{}' -- node build/index.js

# Get server information
npx reloaderoo inspect server-info -- node build/index.js

# List and read resources
npx reloaderoo inspect list-resources -- node build/index.js
npx reloaderoo inspect read-resource "xcodebuildmcp://devices" -- node build/index.js
```

**Proxy Mode (MCP Client Integration):**
```bash
# Start persistent server for MCP clients
npx reloaderoo proxy -- node build/index.js

# With debug logging
npx reloaderoo proxy --log-level debug -- node build/index.js

# Then ask AI: "Please restart the MCP server to load my changes"
```

#### All CLI Inspect Commands

Reloaderoo provides 8 inspect subcommands for comprehensive MCP server testing:

```bash
# Server capabilities and information
npx reloaderoo inspect server-info -- node build/index.js

# Tool management
npx reloaderoo inspect list-tools -- node build/index.js
npx reloaderoo inspect call-tool <tool_name> --params '<json>' -- node build/index.js

# Resource access
npx reloaderoo inspect list-resources -- node build/index.js
npx reloaderoo inspect read-resource "<uri>" -- node build/index.js

# Prompt management
npx reloaderoo inspect list-prompts -- node build/index.js
npx reloaderoo inspect get-prompt <name> --args '<json>' -- node build/index.js

# Connectivity testing
npx reloaderoo inspect ping -- node build/index.js
```

#### Advanced Options

```bash
# Custom working directory
npx reloaderoo inspect list-tools --working-dir /custom/path -- node build/index.js

# Timeout configuration
npx reloaderoo inspect call-tool slow_tool --timeout 60000 --params '{}' -- node build/index.js

# Use timeout configuration if needed
npx reloaderoo inspect server-info --timeout 60000 -- node build/index.js

# Debug logging (use proxy mode for detailed logging)
npx reloaderoo proxy --log-level debug -- node build/index.js
```

#### Key Benefits

- ✅ **No MCP Client Setup**: Direct CLI access to all 84+ tools
- ✅ **Raw JSON Output**: Perfect for AI agents and programmatic use
- ✅ **Hot-Reload Support**: `restart_server` tool for MCP client development
- ✅ **Claude Code Compatible**: Automatic content block consolidation
- ✅ **8 Inspect Commands**: Complete MCP protocol testing capabilities
- ✅ **Universal Compatibility**: Works on any system via npx

For complete documentation, examples, and troubleshooting, see @docs/RELOADEROO.md

## Architecture Overview

### Plugin-Based MCP architecture

XcodeBuildMCP uses the concept of configuration by convention for MCP exposing and running MCP capabilities like tools and resources. This means to add a new tool or resource, you simply create a new file in the appropriate directory and it will be automatically loaded and exposed to MCP clients.

#### Tools

Tools are the core of the MCP server and are the primary way to interact with the server. They are organized into directories by their functionality and are automatically loaded and exposed to MCP clients.

For more information see @docs/PLUGIN_DEVELOPMENT.md

#### Resources

Resources are the secondary way to interact with the server. They are used to provide data to tools and are organized into directories by their functionality and are automatically loaded and exposed to MCP clients.

For more information see @docs/PLUGIN_DEVELOPMENT.md

### Operating Modes

XcodeBuildMCP has two modes to manage its extensive toolset, controlled by the `XCODEBUILDMCP_DYNAMIC_TOOLS` environment variable.

#### Static Mode (Default)
- **Environment**: `XCODEBUILDMCP_DYNAMIC_TOOLS=false` or unset.
- **Behavior**: All tools are loaded at startup. This provides immediate access to the full toolset but uses a larger context window.

#### Dynamic Mode (AI-Powered)
- **Environment**: `XCODEBUILDMCP_DYNAMIC_TOOLS=true`.
- **Behavior**: Only the `discover_tools` tool is available initially. You can use this tool by providing a natural language task description. The server then uses an LLM call (via MCP Sampling) to identify the most relevant workflow group and dynamically loads only those tools. This conserves context window space.

#### Claude Code Compatibility Workaround
- **Detection**: Automatic detection when running under Claude Code.
- **Purpose**: Workaround for Claude Code's MCP specification violation where it only displays the first content block in tool responses.
- **Behavior**: When Claude Code is detected, multiple content blocks are automatically consolidated into a single text response, separated by `---` dividers. This ensures all information (including test results and stderr warnings) is visible to Claude Code users.

### Core Architecture Layers
1. **MCP Transport**: stdio protocol communication
2. **Plugin Discovery**: Automatic tool AND resource registration system  
3. **MCP Resources**: URI-based data access (e.g., `xcodebuildmcp://simulators`)
4. **Tool Implementation**: Self-contained workflow modules
5. **Shared Utilities**: Command execution, build management, validation
6. **Types**: Shared interfaces and Zod schemas

For more information see @docs/ARCHITECTURE.md

## Testing

The project enforces a strict **Dependency Injection (DI)** testing philosophy.

- **NO Vitest Mocking**: The use of `vi.mock()`, `vi.fn()`, `vi.spyOn()`, etc., is **completely banned**.
- **Executors**: All external interactions (like running commands or accessing the file system) are handled through injectable "executors".
    - `CommandExecutor`: For running shell commands.
    - `FileSystemExecutor`: For file system operations.
- **Testing Logic**: Tests import the core `...Logic` function from a tool file and pass in a mock executor (`createMockExecutor` or `createMockFileSystemExecutor`) to simulate different outcomes.

This approach ensures that tests are robust, easy to maintain, and verify the actual integration between components without being tightly coupled to implementation details.

For complete guidelines, refer to @docs/TESTING.md.

## Release Process

Follow standardized development workflow with feature branches, structured pull requests, and linear commit history. **Never push to main directly or force push without permission.**

For complete guidelines, refer to @docs/RELEASE_PROCESS.md

## Useful external resources

### Model Context Protocol

https://modelcontextprotocol.io/llms-full.txt

### MCP Specification

https://modelcontextprotocol.io/specification

### MCP Inspector

https://github.com/modelcontextprotocol/inspector

### MCP Client SDKs

https://github.com/modelcontextprotocol/typescript-sdk