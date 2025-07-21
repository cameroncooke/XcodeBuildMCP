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

**MANDATORY TESTING PRINCIPLES - NO EXCEPTIONS**:

1. **✅ ALWAYS TEST PRODUCTION CODE**
   - Import and test actual tool functions from `src/tools/`
   - Never create mock implementations with business logic

2. **✅ ALWAYS MOCK EXTERNAL DEPENDENCIES ONLY**
   - Mock only: `child_process`, `fs`, network calls, logger
   - Never mock tool logic or validation

3. **✅ ALWAYS TEST ALL LOGIC PATHS**
   - Parameter validation (success and failure)
   - Command execution paths
   - Error handling scenarios

4. **✅ ALWAYS VALIDATE INPUT/OUTPUT**
   - Use exact response validation with `.toEqual()`
   - Verify complete response structure
   - Ensure `isError: true` on all failures

Example test structure:
```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { actualToolFunction } from './tool-file.js';

// Mock only external dependencies
vi.mock('child_process', () => ({
  execSync: vi.fn()
}));

describe('Tool Name', () => {
  it('should test actual production code', async () => {
    const mockExecSync = vi.mocked(execSync);
    mockExecSync.mockReturnValue('SUCCESS');
    
    const result = await actualToolFunction({ param: 'value' });
    
    expect(result).toEqual({
      content: [{ type: 'text', text: 'Expected output' }],
      isError: false
    });
  });
});
```

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

## Adding New Tools and Workflow Groups

XcodeBuildMCP uses a plugin architecture for organizing tools into logical workflow groups. This section provides complete instructions for adding new tools and creating new workflow groups.

### Understanding the Plugin Architecture

The plugin system organizes tools into directories under `/plugins/`, where each directory represents a complete end-to-end workflow:

```
plugins/
├── simulator-workspace/     # iOS Simulator + Workspace tools
├── device-workspace/        # iOS Device + Workspace tools  
├── macos-workspace/         # macOS + Workspace tools
├── swift-package/           # Swift Package Manager tools
├── ui-testing/              # UI automation tools
└── utilities/               # General utilities
```

Each plugin directory contains:
- `index.js` - Workflow metadata (required)
- `*.js` - Individual tool implementations
- `*.test.ts` - Test files

### Adding a New Tool to an Existing Workflow

To add a new tool to an existing workflow group:

1. **Create the tool file** in the appropriate plugin directory:

```typescript
// plugins/simulator-workspace/my_new_tool.js
import { z } from 'zod';
import { createTextResponse } from '../../src/utils/validation.js';
import { log } from '../../src/utils/logger.js';

export default {
  name: 'my_new_tool',
  description: 'Description of what this tool does',
  schema: {
    param1: z.string().describe('Description of parameter'),
    param2: z.number().optional().describe('Optional parameter'),
  },
  async handler({ param1, param2 }) {
    log('info', `Starting my_new_tool with param1: ${param1}`);
    
    try {
      // Your tool implementation here
      const result = await doSomething(param1, param2);
      
      return createTextResponse(`✅ Success: ${result}`);
    } catch (error) {
      log('error', `Error in my_new_tool: ${error}`);
      return createTextResponse(
        `Failed to execute my_new_tool: ${error instanceof Error ? error.message : 'Unknown error'}`,
        true  // isError = true
      );
    }
  },
};
```

2. **Create comprehensive tests** alongside your tool:

```typescript
// plugins/simulator-workspace/my_new_tool.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import myNewTool from './my_new_tool.js';

// Mock external dependencies only
vi.mock('../../src/utils/logger.js');

describe('my_new_tool plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('should have correct tool metadata', () => {
      expect(myNewTool.name).toBe('my_new_tool');
      expect(myNewTool.description).toContain('Description of what this tool does');
      expect(myNewTool.schema).toBeDefined();
      expect(myNewTool.handler).toBeInstanceOf(Function);
    });

    it('should validate required parameters', () => {
      const schema = myNewTool.schema;
      
      // Test valid input
      const validResult = schema.param1.safeParse('test value');
      expect(validResult.success).toBe(true);
      
      // Test invalid input
      const invalidResult = schema.param1.safeParse(123);
      expect(invalidResult.success).toBe(false);
    });
  });

  describe('handler functionality', () => {
    it('should return success response for valid input', async () => {
      const result = await myNewTool.handler({ param1: 'test' });
      
      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('✅ Success');
    });

    it('should return error response for failures', async () => {
      // Test error scenarios
      const result = await myNewTool.handler({ param1: 'invalid' });
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to execute');
    });
  });
});
```

3. **Run tests** to ensure everything works:

```bash
npm test -- plugins/simulator-workspace/my_new_tool.test.ts
```

### Creating a New Workflow Group

To create an entirely new workflow group:

1. **Create the plugin directory**:

```bash
mkdir plugins/my-new-workflow
```

2. **Create the workflow metadata file**:

```javascript
// plugins/my-new-workflow/index.js
export const workflow = {
  name: "My New Workflow",
  description: "Complete workflow description for what this group accomplishes",
  platforms: ["iOS", "macOS"],           // Optional: target platforms
  targets: ["simulator", "device"],      // Optional: target types
  projectTypes: ["workspace", "project"], // Optional: project file types
  capabilities: ["build", "test", "deploy"] // Optional: workflow capabilities
};
```

**Required fields:**
- `name`: Human-readable workflow name
- `description`: Detailed description for LLM-based tool selection

**Optional fields (but recommended):**
- `platforms`: Target platforms (iOS, macOS, watchOS, tvOS, visionOS)
- `targets`: Deployment targets (simulator, device, mac)
- `projectTypes`: Project file types (workspace, project, package)
- `capabilities`: Workflow capabilities (build, test, deploy, debug, ui-automation, log-capture)

3. **Add your tools** to the directory following the tool creation guidelines above.

4. **Test the workflow metadata**:

```bash
# Verify workflow loads correctly
npm run build
node -e "import('./build/index.js')"
```

### Tool Implementation Guidelines

**MANDATORY Requirements:**

1. **Export Structure**: Always use default export with this exact structure:
```javascript
export default {
  name: 'tool_name',
  description: 'Tool description',
  schema: { /* Zod schema */ },
  async handler(params) { /* implementation */ }
};
```

2. **Error Handling**: Always use `createTextResponse` and set `isError: true` for failures:
```javascript
return createTextResponse('Error message', true);
```

3. **Logging**: Use the logger utility for all output:
```javascript
import { log } from '../../src/utils/logger.js';
log('info', 'Starting operation');
log('error', 'Operation failed');
```

4. **Parameter Validation**: Use Zod schemas for type-safe parameter validation:
```javascript
schema: {
  param: z.string().min(1).describe('Parameter description'),
  optional: z.number().optional().describe('Optional parameter')
}
```

### Dynamic Mode and Discovery Tool

The discovery tool uses workflow metadata to intelligently select tools based on natural language descriptions. When creating workflows:

1. **Write clear descriptions** that help the LLM understand when to use this workflow
2. **Use descriptive capability tags** that match common development tasks
3. **Include platform and target information** for precise selection

Example of good workflow metadata:
```javascript
export const workflow = {
  name: "React Native iOS Development",
  description: "Complete React Native iOS development workflow for .xcworkspace files with CocoaPods dependencies, targeting iOS simulators and devices. Includes building, testing, bundling, and deployment capabilities.",
  platforms: ["iOS"],
  targets: ["simulator", "device"], 
  projectTypes: ["workspace"],
  capabilities: ["build", "test", "bundle", "deploy", "debug", "log-capture"]
};
```

### Tool Naming Conventions

Follow these naming patterns:

- **Build tools**: `build_[platform]_[target]` (e.g., `build_ios_sim`, `build_mac_ws`)
- **Test tools**: `test_[platform]_[target]` (e.g., `test_ios_device`, `test_macos_proj`)
- **Launch tools**: `launch_[type]_[target]` (e.g., `launch_app_sim`, `launch_mac_app`)
- **Utility tools**: `[action]_[object]` (e.g., `screenshot`, `list_devices`, `clean_proj`)

### Re-exporting Shared Tools

Some tools need to be available in multiple workflows. Use re-exports rather than duplication:

1. **Primary implementation** in the most logical workflow:
```javascript
// plugins/simulator-workspace/shared_tool.js
export default {
  name: 'shared_tool',
  // ... implementation
};
```

2. **Re-export** in other workflows that need it:
```javascript
// plugins/simulator-project/shared_tool.js
export { default } from '../simulator-workspace/shared_tool.js';
```

### Testing New Workflow Groups

1. **Unit tests** for each tool
2. **Integration test** that workflow metadata loads correctly
3. **Discovery test** that LLM can select the workflow appropriately

Example workflow integration test:
```typescript
// plugins/my-new-workflow/workflow.test.ts
import { describe, it, expect } from 'vitest';
import { loadWorkflowGroups } from '../../src/core/plugin-registry.js';

describe('My New Workflow', () => {
  it('should load workflow metadata correctly', async () => {
    const workflows = await loadWorkflowGroups();
    const myWorkflow = workflows.get('my-new-workflow');
    
    expect(myWorkflow).toBeDefined();
    expect(myWorkflow?.workflow.name).toBe('My New Workflow');
    expect(myWorkflow?.workflow.description).toContain('Complete workflow description');
    expect(myWorkflow?.tools.length).toBeGreaterThan(0);
  });

  it('should have valid tool implementations', async () => {
    const workflows = await loadWorkflowGroups();
    const myWorkflow = workflows.get('my-new-workflow');
    
    for (const tool of myWorkflow?.tools || []) {
      expect(tool.name).toBeTruthy();
      expect(tool.handler).toBeInstanceOf(Function);
      expect(tool.schema).toBeDefined();
    }
  });
});
```

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
   {
     "mcpServers": {
       "XcodeBuildMCP": {
         "command": "node",
         "args": ["/path_to/XcodeBuildMCP/build/index.js"],
         "env": {
           "XCODEBUILDMCP_IOS_TEMPLATE_PATH": "/path/to/XcodeBuildMCP-iOS-Template",
           "XCODEBUILDMCP_MACOS_TEMPLATE_PATH": "/path/to/XcodeBuildMCP-macOS-Template"
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
