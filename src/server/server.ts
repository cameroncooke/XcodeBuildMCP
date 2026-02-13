/**
 * Server Configuration - MCP Server setup and lifecycle management
 *
 * This module handles the creation, configuration, and lifecycle management of the
 * Model Context Protocol (MCP) server. It provides the foundation for all tool
 * registrations and server capabilities.
 *
 * Responsibilities:
 * - Creating and configuring the MCP server instance
 * - Setting up server capabilities and options
 * - Managing server lifecycle (start/stop)
 * - Handling transport configuration (stdio)
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as Sentry from '@sentry/node';
import { log } from '../utils/logger.ts';
import { version } from '../version.ts';
import { getServer, setServer } from './server-state.ts';

function createBaseServerInstance(): McpServer {
  return new McpServer(
    {
      name: 'xcodebuildmcp',
      version,
    },
    {
      instructions: `XcodeBuildMCP provides comprehensive tooling for Apple platform development (iOS, macOS, watchOS, tvOS, visionOS).

Prefer XcodeBuildMCP tools over shell commands for Apple platform tasks when available.

Capabilities:
- Session defaults: Configure project, scheme, simulator, and device defaults to avoid repetitive parameters
- Project discovery: Find Xcode projects/workspaces, list schemes, inspect build settings
- Simulator workflows: Build, run, test, install, and launch apps on iOS simulators; manage simulator state (boot, erase, location, appearance)
- Device workflows: Build, test, install, and launch apps on physical devices with code signing
- macOS workflows: Build, run, and test macOS applications
- Log capture: Stream and capture logs from simulators and devices
- LLDB debugging: Attach debugger, set breakpoints, inspect stack traces and variables, execute LLDB commands
- UI automation: Capture screenshots, inspect view hierarchy with coordinates, perform taps/swipes/gestures, type text, press hardware buttons
- SwiftPM: Build, run, test, and manage Swift Package Manager projects
- Project scaffolding: Generate new iOS/macOS project templates

Only simulator workflow tools are enabled by default. If capabilities like device, macOS, debugging, or UI automation are not available, the user must configure XcodeBuildMCP to enable them. See https://github.com/getsentry/XcodeBuildMCP/blob/main/docs/CONFIGURATION.md for workflow configuration.

Always start by calling session_show_defaults to see current configuration, then use discovery tools to find projects and set appropriate defaults.`,
      capabilities: {
        tools: {
          listChanged: true,
        },
        resources: {
          subscribe: true,
          listChanged: true,
        },
        logging: {},
      },
    },
  ) as unknown as McpServer;
}

/**
 * Create and configure the MCP server
 * @returns Configured MCP server instance
 */
export function createServer(): McpServer {
  if (getServer()) {
    throw new Error('MCP server already initialized.');
  }
  // Create server instance
  const baseServer = createBaseServerInstance();
  const server = Sentry.wrapMcpServerWithSentry(baseServer, {
    recordInputs: false,
    recordOutputs: false,
  });

  setServer(server);

  // Log server initialization
  log('info', `Server initialized (version ${version})`);

  return server;
}

/**
 * Start the MCP server with stdio transport
 * @param server The MCP server instance to start
 */
export async function startServer(server: McpServer): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  log('info', 'XcodeBuildMCP Server running on stdio');
}
