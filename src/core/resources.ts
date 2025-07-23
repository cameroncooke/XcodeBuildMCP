/**
 * Resource Management - MCP Resource handlers and URI management
 *
 * This module manages MCP resources, providing a unified interface for exposing
 * data through the Model Context Protocol resource system. Resources allow clients
 * to access data via URI references without requiring tool calls.
 *
 * Responsibilities:
 * - Defining resource URI schemes and handlers
 * - Managing resource registration with the MCP server
 * - Providing fallback compatibility for clients without resource support
 * - Integrating with existing tool logic through dependency injection
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { log, getDefaultCommandExecutor, CommandExecutor } from '../utils/index.js';
import { list_simsLogic } from '../plugins/simulator-shared/list_sims.js';

/**
 * Resource URI schemes supported by XcodeBuildMCP
 */
export const RESOURCE_URIS = {
  SIMULATORS: 'mcp://xcodebuild/simulators',
} as const;

/**
 * Check if a client supports MCP resources
 * This is a placeholder for actual capability detection
 */
export function supportsResources(): boolean {
  // In a real implementation, this would check client capabilities
  // For now, assume resources are supported
  return true;
}

/**
 * Resource handler for simulator data
 * Uses existing list_simsLogic to maintain consistency
 */
async function handleSimulatorsResource(executor?: CommandExecutor): Promise<{
  contents: Array<{ type: 'text'; text: string }>;
}> {
  try {
    log('info', 'Processing simulators resource request');

    // Use existing logic with dependency injection
    const result = await list_simsLogic({}, executor || getDefaultCommandExecutor());

    if (result.isError) {
      throw new Error(result.content[0]?.text || 'Failed to retrieve simulator data');
    }

    return {
      contents: [
        {
          type: 'text' as const,
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
          type: 'text' as const,
          text: `Error retrieving simulator data: ${errorMessage}`,
        },
      ],
    };
  }
}

/**
 * Register all resources with the MCP server
 * @param server The MCP server instance
 */
export function registerResources(server: McpServer): void {
  log('info', 'Registering MCP resources');

  // Register simulators resource with wrapper to support dependency injection in tests
  server.resource(
    RESOURCE_URIS.SIMULATORS,
    'Available iOS simulators with their UUIDs and states',
    { mimeType: 'text/plain' },
    (executor?: CommandExecutor) => handleSimulatorsResource(executor),
  );

  log('info', `Registered resource: ${RESOURCE_URIS.SIMULATORS}`);
}

/**
 * Get all available resource URIs
 * @returns Array of resource URI strings
 */
export function getAvailableResources(): string[] {
  return Object.values(RESOURCE_URIS);
}
