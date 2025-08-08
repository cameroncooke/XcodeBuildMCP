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

import { McpServer } from '@camsoft/mcp-sdk/server/mcp.js';
import { StdioServerTransport } from '@camsoft/mcp-sdk/server/stdio.js';
import { log } from '../utils/logger.js';
import { version } from '../version.js';

/**
 * Create and configure the MCP server
 * @returns Configured MCP server instance
 */
export function createServer(): McpServer {
  // Create server instance
  const server = new McpServer(
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
