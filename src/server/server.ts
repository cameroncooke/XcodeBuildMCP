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
import { log } from '../utils/logger.js';
import { version } from '../version.js';

/**
 * Configuration interface for server capabilities
 */
export interface ServerCapabilitiesConfig {
  tools?: boolean;
  resources?: boolean;
  prompts?: boolean;
  sampling?: boolean;
}

/**
 * Default capabilities configuration
 */
const DEFAULT_CAPABILITIES: ServerCapabilitiesConfig = {
  tools: true,
  resources: true,
  prompts: true,
  sampling: false, // Disabled by default as it requires client support
};

/**
 * Create and configure the MCP server
 * @param capabilitiesConfig Optional configuration for server capabilities
 * @returns Configured MCP server instance
 */
export function createServer(capabilitiesConfig?: ServerCapabilitiesConfig): McpServer {
  const config = { ...DEFAULT_CAPABILITIES, ...capabilitiesConfig };

  // Build capabilities object based on configuration
  const capabilities: any = {};

  if (config.tools) {
    capabilities.tools = {
      listChanged: true,
    };
  }

  if (config.resources) {
    capabilities.resources = {
      subscribe: true,
      listChanged: true,
    };
  }

  if (config.prompts) {
    capabilities.prompts = {
      listChanged: true,
    };
  }

  if (config.sampling) {
    capabilities.sampling = {};
  }

  // Always include logging capability
  capabilities.logging = {};

  // Create server instance
  const server = new McpServer(
    {
      name: 'xcodebuildmcp',
      version,
    },
    {
      capabilities,
    },
  );

  // Log server initialization with enabled capabilities
  const enabledCapabilities = Object.keys(capabilities).join(', ');
  log('info', `Server initialized (version ${version}) with capabilities: ${enabledCapabilities}`);

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
