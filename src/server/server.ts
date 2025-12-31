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
import { log } from '../utils/logger.ts';
import { version } from '../version.ts';
import * as Sentry from '@sentry/node';

/**
 * Create and configure the MCP server
 * @returns Configured MCP server instance
 */
export function createServer(): McpServer {
  // Create server instance
  const baseServer = new McpServer(
    {
      name: 'xcodebuildmcp',
      version,
    },
    {
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
  );

  // Wrap server with Sentry for MCP instrumentation
  const server = Sentry.wrapMcpServerWithSentry(baseServer);

  // Log server initialization
  log('info', `Server initialized with Sentry MCP instrumentation (version ${version})`);

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
