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

To configure your MCP client to use your local XcodeBuildMCP server you can use the following configuration:

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

You can use MCP Inspector via:

```bash
npm run inspect
```

or if you prefer the explicit command:

```bash
npx @modelcontextprotocol/inspector node build/index.js
```

#### Using the diagnostic tool

Running the XcodeBuildMCP server with the environmental variable `XCODEBUILDMCP_DEBUG=true` will expose a new diagnostic tool which you can run using MCP Inspector:


```bash
XCODEBUILDMCP_DEBUG=true npm run inspect
```

Alternatively, you can run the diagnostic tool directly:

```bash
node build/diagnostic-cli.js
```

## Making changes

1. Fork the repository and create a new branch
2. Follow the TypeScript best practices and existing code style
3. Add proper parameter validation and error handling

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
   export XCODEBUILD_MCP_IOS_TEMPLATE_PATH=/path/to/XcodeBuildMCP-iOS-Template
   
   # For macOS template development
   export XCODEBUILD_MCP_MACOS_TEMPLATE_PATH=/path/to/XcodeBuildMCP-macOS-Template
   ```

3. When using MCP clients, add these environment variables to your MCP configuration:
   ```json
   {
     "mcpServers": {
       "XcodeBuildMCP": {
         "command": "node",
         "args": ["/path_to/XcodeBuildMCP/build/index.js"],
         "env": {
           "XCODEBUILD_MCP_IOS_TEMPLATE_PATH": "/path/to/XcodeBuildMCP-iOS-Template",
           "XCODEBUILD_MCP_MACOS_TEMPLATE_PATH": "/path/to/XcodeBuildMCP-macOS-Template"
         }
       }
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
