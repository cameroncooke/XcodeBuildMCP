# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

XcodeBuildMCP is a Model Context Protocol (MCP) server that exposes Xcode operations as tools for AI assistants. It enables programmatic interaction with Xcode projects, simulators, devices, and Swift packages through a standardized interface.

## Architecture

### Core Structure

- **Entry Point**: `src/index.ts` - Server initialization, tool registration, and lifecycle management
- **Server Configuration**: `src/server/server.ts` - MCP server setup and transport configuration
- **Tool Organization**: Platform-specific tools in `src/tools/` grouped by functionality:
  - Build tools: `build_*.ts`
  - Simulator management: `simulator.ts`, `screenshot.ts`, `axe.ts`
  - Device management: `device.ts`, `device_log.ts`
  - Swift Package Manager: `*-swift-package.ts`
  - Project utilities: `discover_projects.ts`, `scaffold.ts`, `clean.ts`
- **Shared Utilities**: `src/utils/` - Command execution, validation, logging, and error handling
- **Type Definitions**: `src/types/common.ts` - Shared interfaces and type definitions

### Key Patterns

1. **Tool Registration**: Tools are registered in `src/utils/register-tools.ts` using a centralized system with workflow-based grouping
2. **Schema Validation**: All tools use Zod schemas for parameter validation before execution
3. **Command Execution**: Standardized pattern using `src/utils/command.ts` for external command execution
4. **Error Handling**: Consistent error wrapping and logging through `src/utils/errors.ts`
5. **Selective Tool Enablement**: Environment variables control which tools are exposed (see `src/utils/tool-groups.ts`)

## Development Commands

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Watch mode for development
npm run build:watch

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check

# Test the server with MCP Inspector
npm run inspect

# Run diagnostic tool
npm run diagnostic
```

## Adding New Tools

When adding a new tool:

1. Create the tool implementation in `src/tools/`
2. Define Zod schema for parameters
3. Follow the existing pattern:
   ```typescript
   export async function myNewTool(params: z.infer<typeof MyToolSchema>): Promise<{ output: string }> {
     // Validate parameters
     const validated = MyToolSchema.parse(params);
     
     // Execute command using command.ts utilities
     const result = await exec(...);
     
     // Return standardized output
     return { output: result };
   }
   ```
4. Register the tool in `src/utils/register-tools.ts`
5. Add to appropriate tool group in `src/utils/tool-groups.ts`
6. Update TOOL_OPTIONS.md if adding a new group
7. **Update TOOLS.md** with the new tool's name, MCP tool name, and description in the appropriate category

## Testing

Currently, testing is primarily done through:
- Manual testing with example projects in `example_projects/`
- MCP Inspector for interactive testing (`npm run inspect`)
- Diagnostic tool for environment validation

## Important Implementation Details

### Incremental Builds
- Experimental feature using `xcodemake` instead of `xcodebuild`
- Enabled via `INCREMENTAL_BUILDS_ENABLED` environment variable
- Implementation in `src/utils/xcodemake.ts`

### UI Automation
- Uses bundled AXe tool (`bundled/axe`) for simulator UI interaction
- Coordinates are obtained from UI hierarchy, not screenshots
- Implementation in `src/tools/axe.ts`

### Device Support
- Requires proper code signing configuration in Xcode
- Uses FB frameworks bundled in `bundled/Frameworks/`
- Supports both USB and Wi-Fi connected devices

### Template System
- Project scaffolding templates are external and versioned
- Downloaded on-demand from GitHub releases
- Managed by `src/utils/template-manager.ts`

## Debugging

1. **Server Logs**: Set `LOG_LEVEL=debug` environment variable
2. **MCP Inspector**: Use `npm run inspect` for interactive debugging
3. **Diagnostic Tool**: Run `npm run diagnostic` to check environment
4. **Client Logs**: Check MCP client logs (e.g., Cursor logs in `~/Library/Application Support/Cursor/logs`)

## Contributing Guidelines

1. Follow existing code patterns and structure
2. Use TypeScript strictly - no `any` types
3. Add proper error handling and logging
4. Update documentation for new features
5. **Update TOOLS.md** when adding, modifying, or removing tools
6. Test with example projects before submitting
7. Run lint and format checks before committing

## Tool Documentation

All available tools are comprehensively documented in **TOOLS.md**, which provides:
- Complete list of all 81 tools organized by category
- Tool names and MCP tool names
- Detailed descriptions and parameter requirements
- Common workflow patterns
- Environment variable configuration

## Common Operations Quick Reference

### Build Commands
- macOS: `build_mac_ws`, `build_mac_proj`
- iOS Simulator: `build_sim_name_ws`, `build_sim_id_ws`
- iOS Device: `build_dev_ws`, `build_dev_proj`
- Swift Package: `swift_package_build`

### Run Commands
- macOS: `launch_mac_app`
- iOS Simulator: `launch_app_sim`
- iOS Device: `launch_app_device`
- Swift Package: `swift_package_run`

### Test Commands
- macOS: `test_macos_ws`, `test_macos_proj`
- iOS Simulator: `test_sim_name_ws`, `test_sim_id_ws`
- iOS Device: `test_device_ws`, `test_device_proj`
- Swift Package: `swift_package_test`