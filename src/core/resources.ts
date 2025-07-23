/**
 * Resource Management - MCP Resource handlers and URI management
 *
 * This module manages MCP resources, providing a unified interface for exposing
 * data through the Model Context Protocol resource system. Resources allow clients
 * to access data via URI references without requiring tool calls.
 *
 * Responsibilities:
 * - Loading resources from the plugin-based resource system
 * - Managing resource registration with the MCP server
 * - Providing fallback compatibility for clients without resource support
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { log, CommandExecutor } from '../utils/index.js';
import { RESOURCE_LOADERS } from './generated-resources.js';

/**
 * Resource metadata interface
 */
interface ResourceMeta {
  uri: string;
  description: string;
  mimeType: string;
  handler: (executor?: CommandExecutor) => Promise<{
    contents: Array<{ type: 'text'; text: string }>;
  }>;
}

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
 * Load all resources using generated loaders
 * @returns Map of resource URI to resource metadata
 */
export async function loadResources(): Promise<Map<string, ResourceMeta>> {
  const resources = new Map<string, ResourceMeta>();

  for (const [resourceName, loader] of Object.entries(RESOURCE_LOADERS)) {
    try {
      const resource = await loader();

      if (!resource.uri || !resource.handler || typeof resource.handler !== 'function') {
        throw new Error(`Invalid resource structure for ${resourceName}`);
      }

      resources.set(resource.uri, resource);
      log('info', `Loaded resource: ${resourceName} (${resource.uri})`);
    } catch (error) {
      log(
        'error',
        `Failed to load resource ${resourceName}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return resources;
}

/**
 * Register all resources with the MCP server
 * @param server The MCP server instance
 */
export async function registerResources(server: McpServer): Promise<void> {
  log('info', 'Registering MCP resources');

  const resources = await loadResources();

  for (const [uri, resource] of resources) {
    server.resource(uri, resource.description, { mimeType: resource.mimeType }, resource.handler);

    log('info', `Registered resource: ${uri}`);
  }

  log('info', `Registered ${resources.size} resources`);
}

/**
 * Get all available resource URIs
 * @returns Array of resource URI strings
 */
export async function getAvailableResources(): Promise<string[]> {
  const resources = await loadResources();
  return Array.from(resources.keys());
}
