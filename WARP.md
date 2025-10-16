# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Quick Development Commands

### Build & Compilation
```bash
npm run build              # Compile TypeScript with tsup, generates version info
npm run dev               # Watch mode development with auto-rebuild
npm run typecheck         # TypeScript type checking without emitting files
npm run bundle:axe        # Bundle AXe CLI tool for simulator automation
```

### Testing & Quality
```bash
npm run test              # Run complete Vitest test suite
npm run test:watch        # Watch mode testing
npm run test:coverage     # Generate test coverage reports
npm run lint              # ESLint code checking
npm run lint:fix          # ESLint code checking and auto-fixing
npm run format:check      # Prettier code formatting check
npm run format            # Auto-format code with Prettier
```

### Development Tools
```bash
npm run inspect           # Run interactive MCP protocol inspector
npm run doctor            # System environment validation and troubleshooting
npm run tools:list        # List all available MCP tools
npm run tools:count       # Count tools by workflow group
```

### Single Test Execution
```bash
npx vitest run src/mcp/tools/simulator/list_sims.test.ts  # Run specific test file
npx vitest run --reporter=verbose simulator               # Run tests matching pattern
```

### Testing with Reloaderoo (Development/CLI Testing)
```bash
# Direct tool testing without MCP client setup
npx reloaderoo inspect list-tools -- node build/index.js
npx reloaderoo inspect call-tool list_devices --params '{}' -- node build/index.js

# Hot-reload proxy for MCP clients
npx reloaderoo proxy -- node build/index.js
```

## Architecture Overview

XcodeBuildMCP is a Model Context Protocol (MCP) server that exposes Xcode operations as tools for AI assistants. Built as a TypeScript/Node.js project with stdio-based MCP communication.

### High-Level Flow
1. **Entry Point**: `src/index.ts` → `build/index.js` (via package.json bin)
2. **Server Creation**: MCP server with stdio transport (src/server/server.ts)
3. **Plugin Discovery**: Build-time scanning of `src/mcp/tools/` and `src/mcp/resources/`
4. **Tool Registration**: Auto-discovery and registration based on directory structure
5. **Request Handling**: MCP client calls → tool validation → execution → response

### Plugin-Based Architecture
Tools are organized into workflow directories under `src/mcp/tools/`:
- `simulator/` - iOS Simulator operations (18 tools)
- `device/` - Physical device management (14 tools)
- `project-discovery/` - Xcode project inspection (5 tools)
- `swift-package/` - SPM operations (6 tools)
- `macos/` - macOS development (11 tools)
- `ui-testing/` - UI automation (11 tools)
- `logging/` - Log capture (4 tools)

Resources (efficient data access) in `src/mcp/resources/`:
- `simulators.ts` - Direct simulator data access
- `devices.ts` - Connected device information
- `doctor.ts` - Environment diagnostics

## Key Architectural Concepts

### Build-Time Plugin Discovery
- **Performance**: Avoids runtime filesystem scanning via build-time generation
- **Generated Files**: `src/core/generated-plugins.ts` and `src/core/generated-resources.ts`
- **Build Script**: `build-plugins/plugin-discovery.ts` scans tool directories
- **Result**: Dynamic import maps for lazy loading

### Operating Modes
**Static Mode (Default)**:
- Environment: `XCODEBUILDMCP_DYNAMIC_TOOLS=false` or unset
- Behavior: All tools loaded at startup
- Use Case: Full toolset availability, larger context window

**Dynamic Mode (AI-Powered)**:
- Environment: `XCODEBUILDMCP_DYNAMIC_TOOLS=true`
- Behavior: Only `discover_tools` loaded initially, AI selects workflow groups
- Use Case: Context window optimization, requires MCP Sampling support

### Dependency Injection Testing Philosophy
**CRITICAL**: All testing uses dependency injection - **NO VITEST MOCKING ALLOWED**
```typescript
// ✅ Correct pattern
const mockExecutor = createMockExecutor({ success: true, output: 'result' });
const result = await toolLogic(params, mockExecutor);

// ❌ Banned patterns
vi.mock(), vi.fn(), vi.spyOn() // All vitest mocking is forbidden
```

### TypeScript Import Standards
**Internal imports use `.ts` extensions**:
```typescript
// ✅ Correct
import { tool } from './tool.ts';
export { default } from '../shared/tool.ts';

// ❌ Incorrect  
import { tool } from './tool.js'; // ESLint error for internal files
```

### Focused Facades Pattern
Utilities organized in focused subdirectories instead of barrel imports:
```typescript
// ✅ Preferred
import { log } from '../utils/logging/index.ts';
import { createTypedTool } from '../utils/typed-tool-factory.ts';

// ❌ Deprecated (ESLint forbidden)
import { log, createTypedTool } from '../utils/index.ts';
```

## Development Rules & Conventions

### Tool Implementation Pattern
Every tool follows this standardized structure:
```typescript
// 1. Zod schema for parameters
const toolSchema = z.object({
  param: z.string().describe('AI-friendly description'),
});

// 2. Separate, testable logic function
export async function toolNameLogic(
  params: z.infer<typeof toolSchema>,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  // Business logic with injected dependencies
}

// 3. Auto-discovered tool export
export default {
  name: 'tool_name',
  description: 'Tool description with example usage',
  schema: toolSchema.shape,
  handler: createTypedTool(toolSchema, toolNameLogic, getDefaultCommandExecutor),
};
```

### Tool Naming Convention
Pattern: `{action}_{target}_{specifier}_{projectType}`
- **action**: Primary verb (build, test, get, list)
- **target**: Subject (sim, dev, mac for simulator/device/macOS)
- **specifier**: Identifier type (id for UUID, name for human-readable)
- **projectType**: ws for workspace, proj for project

Examples:
- `build_sim` - Build for simulator
- `list_devices` - List physical devices  
- `get_mac_app_path` - Get macOS app path

### File Organization
- **Tools**: `src/mcp/tools/{workflow-group}/{tool-name}.ts`
- **Resources**: `src/mcp/resources/{resource-name}.ts`
- **Tests**: `__tests__/` subdirectory alongside implementation
- **Utilities**: `src/utils/{domain}/index.ts` (focused facades)

### Testing Requirements
- Every tool must have corresponding test in `__tests__/` subdirectory
- Logic functions must accept injected CommandExecutor parameter
- Use `createMockExecutor()` and `createMockFileSystemExecutor()` only
- Test pattern validation, business logic, error handling
- No vitest mocking (`vi.mock`, `vi.fn`, `vi.spyOn` are forbidden)

### Code Quality Standards
- TypeScript strict mode enabled
- ESLint + Prettier for formatting
- Zod schemas for runtime validation  
- Error handling with `createErrorResponse()` and `createTextResponse()`
- Structured logging via `log()` utility
- Source maps enabled for debugging

### Environment Configuration
Key environment variables:
- `XCODEBUILDMCP_DYNAMIC_TOOLS=true` - Enable dynamic tool loading
- `INCREMENTAL_BUILDS_ENABLED=true` - Enable experimental fast builds
- `XCODEBUILDMCP_SENTRY_DISABLED=true` - Disable error reporting
- `XCODEBUILDMCP_ENABLED_WORKFLOWS=simulator,device` - Selective workflow loading

Use `npm run doctor` to validate environment setup and dependencies.