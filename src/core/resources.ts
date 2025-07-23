/**
 * Resource Management - MCP Resources system for XcodeBuildMCP
 *
 * This module provides MCP resource management capabilities, enabling
 * clients to access simulator, device, and project information via
 * resource URIs rather than tool calls.
 *
 * Responsibilities:
 * - Managing MCP resource registrations
 * - Handling resource URI schemes (mcp://xcodebuild/*)
 * - Providing backward compatibility with existing tools
 * - Enabling efficient data access patterns for AI clients
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { log } from '../utils/logger.js';
import { list_simsLogic } from '../plugins/simulator-shared/list_sims.js';
import { getDefaultCommandExecutor } from '../utils/index.js';

/**
 * Check if a client supports resources capability
 * This is used for backward compatibility fallbacks
 */
export function supportsResources(): boolean {
  // For now, we'll assume resources are supported
  // In a real implementation, this would check client capabilities
  return true;
}

/**
 * Register all MCP resources with the server
 * @param server The MCP server instance
 */
export function registerResources(server: McpServer): void {
  log('info', 'Registering MCP resources...');

  // Register the list_sims resource
  server.resource(
    'simulators',
    'mcp://xcodebuild/simulators',
    'Available iOS simulators with their UUIDs and states',
    async () => {
      try {
        log('debug', 'Processing resource request for simulators');

        // Use the existing list_sims logic
        const result = await list_simsLogic({}, getDefaultCommandExecutor());

        if (result.isError) {
          log('error', 'Failed to retrieve simulators for resource');
          return {
            contents: [
              {
                type: 'text',
                text: result.content[0]?.text || 'Failed to retrieve simulators',
              },
            ],
          };
        }

        return {
          contents: [
            {
              type: 'text',
              text: result.content[0]?.text || 'No simulator data available',
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log('error', `Error in simulators resource handler: ${errorMessage}`);

        return {
          contents: [
            {
              type: 'text',
              text: `Error retrieving simulators: ${errorMessage}`,
            },
          ],
        };
      }
    },
  );

  log('info', '✅ Registered 1 MCP resource (simulators)');
}
