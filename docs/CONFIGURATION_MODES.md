# XcodeBuildMCP: Configuration and Operating Modes

## Overview

XcodeBuildMCP operates in two distinct modes that fundamentally change how tools are exposed and registered with the MCP server. Understanding these modes is crucial for both development and deployment.

## Operating Modes

### Static Mode (Default)
**Environment**: `XCODEBUILDMCP_DYNAMIC_TOOLS=false` or unset

All available tools are loaded and registered immediately when the server starts. This provides the complete XcodeBuildMCP toolkit from the moment of connection.

**Characteristics**:
- ✅ **Complete toolset**: All 84+ tools available immediately
- ✅ **No AI dependency**: Works with any MCP client
- ✅ **Predictable**: Same tools every time
- ✅ **Fast tool access**: No loading delay
- ⚠️ **Large tool list**: Can overwhelm clients with many options
- ⚠️ **Memory usage**: All plugins loaded upfront

### Dynamic Mode (AI-Powered)
**Environment**: `XCODEBUILDMCP_DYNAMIC_TOOLS=true`

Only the `discover_tools` tool is initially available. Additional tools are loaded on-demand based on AI-powered analysis of user task descriptions.

**Characteristics**:
- ✅ **Focused toolset**: Only relevant tools for your task
- ✅ **Intelligent selection**: AI chooses appropriate workflows
- ✅ **Smaller footprint**: Minimal initial tool set
- ✅ **Better UX**: Less overwhelming for users
- ⚠️ **Requires sampling**: Client must support MCP sampling capability
- ⚠️ **AI dependency**: Needs LLM for tool selection

## Configuration

### Environment Variables

#### Core Configuration
```bash
# Operating mode selection
XCODEBUILDMCP_DYNAMIC_TOOLS=true    # Enable dynamic mode (default: false)

# Development and debugging
XCODEBUILDMCP_DEBUG=true           # Enable debug logging (default: false)

# Template paths for scaffolding tools
XCODEBUILDMCP_IOS_TEMPLATE_PATH=/path/to/ios/template
XCODEBUILDMCP_MACOS_TEMPLATE_PATH=/path/to/macos/template

# Build optimization
INCREMENTAL_BUILDS_ENABLED=true    # Enable xcodemake integration (default: false)
```

#### Advanced Configuration
```bash
# Sentry error reporting (optional)
SENTRY_DSN=your-sentry-dsn-here
SENTRY_ENVIRONMENT=development

# Xcodemake build acceleration (optional)
XCODEMAKE_PATH=/custom/path/to/xcodemake
```

### MCP Client Configuration

#### Claude Desktop / VSCode / Cursor
```json
{
  "mcpServers": {
    "XcodeBuildMCP": {
      "command": "node",
      "args": ["/path/to/XcodeBuildMCP/build/index.js"],
      "env": {
        "XCODEBUILDMCP_DYNAMIC_TOOLS": "true",
        "XCODEBUILDMCP_DEBUG": "true",
        "XCODEBUILDMCP_IOS_TEMPLATE_PATH": "/path/to/ios/template",
        "XCODEBUILDMCP_MACOS_TEMPLATE_PATH": "/path/to/macos/template"
      }
    }
  }
}
```

#### Reloaderoo Integration (Development)
```json
{
  "mcpServers": {
    "XcodeBuildMCP": {
      "command": "node",
      "args": [
        "/path/to/reloaderoo/dist/bin/reloaderoo.js",
        "inspect", 
        "mcp",
        "--working-dir", "/path/to/XcodeBuildMCP",
        "--",
        "node", "/path/to/XcodeBuildMCP/build/index.js"
      ],
      "env": {
        "XCODEBUILDMCP_DYNAMIC_TOOLS": "true",
        "XCODEBUILDMCP_DEBUG": "true"
      }
    }
  }
}
```

## Mode Selection Guide

### Choose Static Mode When:
- **Learning XcodeBuildMCP**: Want to see all available tools
- **Advanced workflows**: Need access to multiple tool categories
- **Automation scripts**: Require predictable, complete toolset
- **Client limitations**: MCP client doesn't support sampling
- **Performance critical**: Need immediate tool access

### Choose Dynamic Mode When:
- **Focused tasks**: Working on specific development workflows
- **Beginner friendly**: Want relevant tools only
- **Resource constrained**: Need minimal memory footprint  
- **Modern clients**: Using VSCode, Claude Desktop, or Cursor
- **AI-assisted development**: Want intelligent tool recommendations

## Dynamic Mode Workflow

### 1. Initial State
When server starts in dynamic mode:
```
Available Tools:
├── discover_tools    # The only tool initially available
```

### 2. Task Description
User describes their development task:
```
"I want to build and test my iOS Calculator app from the 
example_projects/iOS_Calculator directory using the 
CalculatorApp.xcworkspace and CalculatorApp scheme for iOS Simulator"
```

### 3. AI Analysis
The `discover_tools` tool:
1. Analyzes the task description using MCP sampling
2. Considers project type (workspace vs project)
3. Determines target platform (iOS, macOS, etc.)
4. Selects appropriate workflow group
5. Returns recommendation with reasoning

### 4. Tool Activation
Based on AI analysis, relevant tools are loaded:
```
Selected Workflow: simulator-workspace

Activated Tools:
├── discover_projs           # Find Xcode projects
├── list_schems_ws          # List workspace schemes  
├── boot_sim                # Start iOS Simulator
├── build_sim_name_ws       # Build for simulator
├── install_app_sim         # Install app on simulator
├── launch_app_sim          # Launch app on simulator
├── test_sim_name_ws        # Run tests on simulator
├── screenshot              # Capture simulator screenshot
└── ... (15+ related tools)
```

### 5. Tool Replacement vs Addition

By default, `discover_tools` **replaces** existing workflows:
```json
// First call - enables simulator-project tools
{ "task_description": "Build my iOS project" }

// Second call - REPLACES with workspace tools
{ "task_description": "Actually I need workspace tools" }
// Result: Only workspace tools are active
```

For **additive** behavior (multiple workflows):
```json
// First call - enables simulator-workspace tools
{ "task_description": "Build and test my iOS workspace" }

// Second call - ADDS ui-testing tools
{ 
  "task_description": "I also need UI automation tools",
  "additive": true 
}
// Result: Both simulator-workspace AND ui-testing tools active
```

### 6. Workflow Execution
User can now execute their complete development workflow using the activated tools.

## Client Compatibility

### MCP Sampling Capability
Dynamic mode requires MCP clients that support the `sampling` capability:

#### ✅ Compatible Clients
- **VSCode MCP Extension**: Full support with auto-detection
- **Claude Desktop**: Full support with manual refresh
- **Cursor**: Full support with auto-detection  

#### ⚠️ Limited Clients
- **Claude Code**: Requires manual refresh for new tools
- **Windsurf**: Requires manual refresh for new tools

#### ❌ Incompatible Clients
- Custom MCP clients without sampling support
- Older MCP implementations

### Fallback Behavior
When a client doesn't support sampling, `discover_tools` returns:
```
Your client does not support the sampling feature required for 
dynamic tool discovery. Please use XCODEBUILDMCP_DYNAMIC_TOOLS=false 
to use the standard tool set.
```

## Workflow Groups

Dynamic mode organizes tools into logical workflow groups:

### Core Workflows
- **`discovery`**: Plugin and project discovery tools
- **`project-discovery`**: Xcode project analysis and introspection
- **`diagnostics`**: System diagnostics and debugging

### iOS Development  
- **`simulator-project`**: iOS simulator + .xcodeproj workflows
- **`simulator-workspace`**: iOS simulator + .xcworkspace workflows
- **`device-project`**: iOS device + .xcodeproj workflows  
- **`device-workspace`**: iOS device + .xcworkspace workflows

### macOS Development
- **`macos-project`**: macOS + .xcodeproj workflows
- **`macos-workspace`**: macOS + .xcworkspace workflows

### Specialized Workflows
- **`swift-package`**: Swift Package Manager operations
- **`ui-testing`**: UI automation and accessibility testing
- **`logging`**: Log capture and monitoring
- **`utilities`**: Project scaffolding and maintenance

### Shared Tools
- **`simulator-shared`**: Common iOS simulator operations
- **`device-shared`**: Common iOS device operations  
- **`macos-shared`**: Common macOS operations

## Development Workflow

### Adding New Workflows
1. Create new directory in `src/plugins/`
2. Add `index.ts` with workflow metadata
3. Add tool files with default exports
4. Build project to regenerate plugin registry
5. Tools automatically available in both modes

### Testing Mode Changes
```bash
# Test static mode
XCODEBUILDMCP_DYNAMIC_TOOLS=false npm start

# Test dynamic mode  
XCODEBUILDMCP_DYNAMIC_TOOLS=true npm start

# Debug both modes
XCODEBUILDMCP_DEBUG=true npm start
```

### Troubleshooting

#### Dynamic Mode Not Working
1. **Check client support**: Ensure MCP client supports sampling
2. **Verify environment**: `XCODEBUILDMCP_DYNAMIC_TOOLS=true` set correctly
3. **Check logs**: Look for `Starting in DYNAMIC mode` message
4. **Test discover_tools**: Should be the only initially available tool

#### Static Mode Issues  
1. **Tool count**: Should see 84+ tools immediately
2. **Memory usage**: All plugins loaded at startup
3. **Build errors**: Ensure all plugins compile correctly

#### General Debugging
```bash
# Enable debug logging
export XCODEBUILDMCP_DEBUG=true

# Check server startup
tail -f server.log | grep -E "(DYNAMIC|STATIC|mode)"

# Verify tool count
# Static: 84+ tools
# Dynamic: 1 tool initially (discover_tools)
```

## Performance Characteristics

### Static Mode
- **Startup**: ~2-3 seconds (loads all plugins)
- **Memory**: ~50-100MB (all tools in memory)
- **Tool access**: Instant (no loading delay)
- **Bundle size**: ~400KB (all tools bundled)

### Dynamic Mode  
- **Startup**: ~1 second (minimal plugin loading)
- **Memory**: ~20-30MB initially, grows with activated workflows
- **Tool access**: ~500ms delay for new workflows (code-splitting load)
- **Bundle size**: ~50KB initially, additional chunks loaded on-demand

## Best Practices

### For End Users
- **Start with dynamic mode** for focused, task-oriented workflows
- **Use static mode** when exploring capabilities or building complex automation
- **Provide detailed task descriptions** for better AI tool selection in dynamic mode

### For Developers
- **Test both modes** when adding new workflows
- **Follow workflow naming conventions** for proper AI selection
- **Include comprehensive metadata** in workflow index.ts files
- **Use debug mode** during development and troubleshooting

### For CI/CD and Automation
- **Prefer static mode** for predictable tool availability
- **Set explicit environment variables** rather than relying on defaults
- **Monitor bundle size** impact of new plugins
- **Test mode switching** in deployment pipelines