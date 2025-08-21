# Contributing

Contributions are welcome! Here's how you can help improve XcodeBuildMCP.

## Local development setup

### Prerequisites

In addition to the prerequisites mentioned in the [Getting started](README.md/#getting-started) section of the README, you will also need:

- Node.js (v18 or later)
- npm

#### Optional: Enabling UI Automation

When running locally, you'll need to install AXe for UI automation:

```bash
# Install axe (required for UI automation)
brew tap cameroncooke/axe
brew install axe
```

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Build the project:
   ```
   npm run build
   ```
4. Start the server:
   ```
   node build/index.js
   ```

### Configure your MCP client

Most MCP clients (Cursor, VS Code, Windsurf, Claude Desktop etc) have standardised on the following JSON configuration format, just add the the following to your client's JSON configuration's `mcpServers` object:

```json
{
  "mcpServers": {
    "XcodeBuildMCP": {
      "command": "node",
      "args": [
        "/path_to/XcodeBuildMCP/build/index.js"
      ]
    }
  }
}
```

### Developing using VS Code

VS Code is especially good for developing XcodeBuildMCP as it has a built-in way to view MCP client/server logs as well as the ability to configure MCP servers at a project level. It probably has the most comprehensive support for MCP development.

To make your development workflow in VS Code more efficient:

1.  **Start the MCP Server**: Open the `.vscode/mcp.json` file. You can start the `xcodebuildmcp-dev` server either by clicking the `Start` CodeLens that appears above the server definition, or by opening the Command Palette (`Cmd+Shift+P` or `Ctrl+Shift+P`), running `Mcp: List Servers`, selecting `xcodebuildmcp-dev`, and starting the server.
2.  **Launch the Debugger**: Press `F5` to attach the Node.js debugger.

Once these steps are completed, you can utilize the tools from the MCP server you are developing within this repository in agent mode.
For more details on how to work with MCP servers in VS Code see: https://code.visualstudio.com/docs/copilot/chat/mcp-servers

### Debugging

#### MCP Inspector (Basic Debugging)

You can use MCP Inspector for basic debugging via:

```bash
npm run inspect
```

or if you prefer the explicit command:

```bash
npx @modelcontextprotocol/inspector node build/index.js
```

#### Reloaderoo (Advanced Debugging) - **RECOMMENDED**

For development and debugging, we strongly recommend using **Reloaderoo**, which provides hot-reloading capabilities and advanced debugging features for MCP servers.

Reloaderoo operates in two modes:

##### 1. Proxy Mode (Hot-Reloading)
Provides transparent hot-reloading without disconnecting your MCP client:

```bash
# Install reloaderoo globally
npm install -g reloaderoo

# Start XcodeBuildMCP through reloaderoo proxy
reloaderoo -- node build/index.js
```

**Benefits**:
- 🔄 Hot-reload server without restarting client
- 🛠️ Automatic `restart_server` tool added to toolset
- 🌊 Transparent MCP protocol forwarding
- 📡 Full protocol support (tools, resources, prompts)

**MCP Client Configuration for Proxy Mode**:
```json
"XcodeBuildMCP": {
  "command": "reloaderoo",
  "args": ["--", "node", "/path/to/XcodeBuildMCP/build/index.js"],
  "env": {
    "XCODEBUILDMCP_DYNAMIC_TOOLS": "true",
    "XCODEBUILDMCP_DEBUG": "true"
  }
}
```

##### 2. Inspection Mode (Raw MCP Debugging)
Exposes debug tools for making raw MCP protocol calls and inspecting server responses:

```bash
# Start reloaderoo in inspection mode
reloaderoo inspect mcp -- node build/index.js
```

**Available Debug Tools**:
- `list_tools` - List all server tools
- `call_tool` - Execute any server tool with parameters
- `list_resources` - List all server resources
- `read_resource` - Read any server resource
- `list_prompts` - List all server prompts
- `get_prompt` - Get any server prompt
- `get_server_info` - Get comprehensive server information
- `ping` - Test server connectivity

**MCP Client Configuration for Inspection Mode**:
```json
"XcodeBuildMCP": {
  "command": "node",
  "args": [
    "/path/to/reloaderoo/dist/bin/reloaderoo.js",
    "inspect", "mcp",
    "--working-dir", "/path/to/XcodeBuildMCP",
    "--",
    "node", "/path/to/XcodeBuildMCP/build/index.js"
  ],
  "env": {
    "XCODEBUILDMCP_DYNAMIC_TOOLS": "true",
    "XCODEBUILDMCP_DEBUG": "true"
  }
}
```

#### Operating Mode Testing

Test both static and dynamic modes during development:

```bash
# Test static mode (all tools loaded immediately)
XCODEBUILDMCP_DYNAMIC_TOOLS=false reloaderoo inspect mcp -- node build/index.js

# Test dynamic mode (only discover_tools initially available)
XCODEBUILDMCP_DYNAMIC_TOOLS=true reloaderoo inspect mcp -- node build/index.js
```

**Key Differences to Test**:
- **Static Mode**: 50+ tools available immediately via `list_tools`
- **Dynamic Mode**: Only 2 tools (`discover_tools` and `discover_projs`) available initially
- **Dynamic Discovery**: After calling `discover_tools`, additional workflow tools become available

#### Using XcodeBuildMCP doctor tool

Running the XcodeBuildMCP server with the environmental variable `XCODEBUILDMCP_DEBUG=true` will expose a new doctor MCP tool called `doctor` which your agent can call to get information about the server's environment, available tools, and configuration status.

> [!NOTE]
> You can also call the doctor tool directly using the following command but be advised that the output may vary from that of the MCP tool call due to environmental differences:
> ```bash
> npm run doctor
> ```

#### Development Workflow with Reloaderoo

1. **Start Development Session**:
   ```bash
   # Terminal 1: Start in hot-reload mode
   reloaderoo -- node build/index.js

   # Terminal 2: Start build watcher
   npm run build:watch
   ```

2. **Make Changes**: Edit source code in `src/`

3. **Test Changes**: Ask your AI client to restart the server:
   ```
   "Please restart the MCP server to load my changes"
   ```
   The AI will automatically call the `restart_server` tool provided by reloaderoo.

4. **Verify Changes**: New functionality immediately available without reconnecting client

## Architecture and Code Standards

Before making changes, please familiarize yourself with:
- [ARCHITECTURE.md](ARCHITECTURE.md) - Comprehensive architectural overview
- [CLAUDE.md](CLAUDE.md) - AI assistant guidelines and testing principles
- [TOOLS.md](TOOLS.md) - Complete tool documentation
- [TOOL_OPTIONS.md](TOOL_OPTIONS.md) - Tool configuration options

### Code Quality Requirements

1. **Follow existing code patterns and structure**
2. **Use TypeScript strictly** - no `any` types, proper typing throughout
3. **Add proper error handling and logging** - all failures must set `isError: true`
4. **Update documentation for new features**
5. **Test with example projects before submitting**

### Testing Standards

All contributions must adhere to the testing standards outlined in the [**XcodeBuildMCP Plugin Testing Guidelines (docs/TESTING.md)**](docs/TESTING.md). This is the canonical source of truth for all testing practices.

**Key Principles (Summary):**
- **No Vitest Mocking**: All forms of `vi.mock`, `vi.fn`, `vi.spyOn`, etc., are strictly forbidden.
- **Dependency Injection**: All external dependencies (command execution, file system access) must be injected into tool logic functions using the `CommandExecutor` and `FileSystemExecutor` patterns.
- **Test Production Code**: Tests must import and execute the actual tool logic, not mock implementations.
- **Comprehensive Coverage**: Tests must cover input validation, command generation, and output processing.

Please read [docs/TESTING.md](docs/TESTING.md) in its entirety before writing tests.

### Pre-Commit Checklist

**MANDATORY**: Run these commands before any commit and ensure they all pass:

```bash
# 1. Run linting (must pass with 0 errors)
npm run lint

# 2. Run formatting (must format all files)
npm run format

# 3. Run build (must compile successfully)
npm run build

# 4. Run tests (all tests must pass)
npm test
```

**NO EXCEPTIONS**: Code that fails any of these commands cannot be committed.

## Making changes

1. Fork the repository and create a new branch
2. Follow the TypeScript best practices and existing code style
3. Add proper parameter validation and error handling

## Plugin Development

For comprehensive instructions on creating new tools and workflow groups, see our dedicated [Plugin Development Guide](docs/PLUGIN_DEVELOPMENT.md).

The plugin development guide covers:
- Auto-discovery system architecture
- Tool creation with dependency injection patterns
- Workflow group organization
- Testing guidelines and patterns
- Integration with dynamic tool discovery

### Quick Plugin Development Checklist

1. Choose appropriate workflow directory in `src/mcp/tools/`
2. Follow naming conventions: `{action}_{target}_{specifier}_{projectType}`
3. Use dependency injection pattern with separate logic functions
4. Create comprehensive tests using `createMockExecutor()`
5. Add workflow metadata if creating new workflow group

See [PLUGIN_DEVELOPMENT.md](docs/PLUGIN_DEVELOPMENT.md) for complete details.

### Working with Project Templates

XcodeBuildMCP uses external template repositories for the iOS and macOS project scaffolding features. These templates are maintained separately to allow independent versioning and updates.

#### Template Repositories

- **iOS Template**: [XcodeBuildMCP-iOS-Template](https://github.com/cameroncooke/XcodeBuildMCP-iOS-Template)
- **macOS Template**: [XcodeBuildMCP-macOS-Template](https://github.com/cameroncooke/XcodeBuildMCP-macOS-Template)

#### Local Template Development

When developing or testing changes to the templates:

1. Clone the template repository you want to work on:
   ```bash
   git clone https://github.com/cameroncooke/XcodeBuildMCP-iOS-Template.git
   git clone https://github.com/cameroncooke/XcodeBuildMCP-macOS-Template.git
   ```

2. Set the appropriate environment variable to use your local template:
   ```bash
   # For iOS template development
   export XCODEBUILDMCP_IOS_TEMPLATE_PATH=/path/to/XcodeBuildMCP-iOS-Template

   # For macOS template development
   export XCODEBUILDMCP_MACOS_TEMPLATE_PATH=/path/to/XcodeBuildMCP-macOS-Template
   ```

3. When using MCP clients, add these environment variables to your MCP configuration:
```json
"XcodeBuildMCP": {
  "command": "node",
  "args": ["/path_to/XcodeBuildMCP/build/index.js"],
  "env": {
    "XCODEBUILDMCP_IOS_TEMPLATE_PATH": "/path/to/XcodeBuildMCP-iOS-Template",
    "XCODEBUILDMCP_MACOS_TEMPLATE_PATH": "/path/to/XcodeBuildMCP-macOS-Template"
  }
}
```

4. The scaffold tools will use your local templates instead of downloading from GitHub releases.

#### Template Versioning

- Templates are versioned independently from XcodeBuildMCP
- The default template version is specified in `package.json` under `templateVersion`
- You can override the template version with `XCODEBUILD_MCP_TEMPLATE_VERSION` environment variable
- To update the default template version:
  1. Update `templateVersion` in `package.json`
  2. Run `npm run build` to regenerate version.ts
  3. Create a new XcodeBuildMCP release

#### Testing Template Changes

1. Make changes to your local template
2. Test scaffolding with your changes using the local override
3. Verify the scaffolded project builds and runs correctly
4. Once satisfied, create a PR in the template repository
5. After merging, create a new release in the template repository using the release script

## Testing

1. Build the project with `npm run build`
2. Test your changes with MCP Inspector
3. Verify tools work correctly with different MCP clients

## Submitting

1. Run `npm run lint` to check for linting issues (use `npm run lint:fix` to auto-fix)
2. Run `npm run format:check` to verify formatting (use `npm run format` to fix)
3. Update documentation if you've added or modified features
4. Add your changes to the CHANGELOG.md file
5. Push your changes and create a pull request with a clear description
6. Link any related issues

For major changes or new features, please open an issue first to discuss your proposed changes.

## Code of Conduct

Please follow our [Code of Conduct](CODE_OF_CONDUCT.md) and community guidelines.
