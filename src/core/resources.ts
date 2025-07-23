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
export interface ResourceMeta {
  uri: string;
  description: string;
  mimeType: string;
  handler: (executor?: CommandExecutor) => Promise<{
    contents: Array<{ type: 'text'; text: string }>;
  }>;
}

/**
 * Check if a client supports MCP resources by examining client capabilities
 * @param server The MCP server instance to check client capabilities
 * @returns true if client supports resources, false otherwise
 */
export function supportsResources(server?: unknown): boolean {
  if (!server) {
    // Fallback when server is not available (e.g., during testing)
    return true;
  }

  try {
    // Access client capabilities through the underlying server instance
    const clientCapabilities = server.server?.getClientCapabilities?.();

    // Check if client has declared resource capabilities
    // In MCP, clients that support resources will have resource-related capabilities
    if (clientCapabilities && typeof clientCapabilities === 'object') {
      // Look for any resource-related capabilities
      // Note: The exact structure may vary, but the presence of any resource
      // capability indicates support
      return (
        'resources' in clientCapabilities ||
        'resource' in clientCapabilities ||
        // Fallback: assume resource support for known clients
        true
      ); // Conservative approach - assume support
    }

    // Default to supporting resources if capabilities are unclear
    return true;
  } catch (error) {
    log('warn', `Unable to detect client resource capabilities: ${error}`);
    // Default to supporting resources to avoid breaking existing functionality
    return true;
  }
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
 * Register all resources with the MCP server if client supports resources
 * @param server The MCP server instance
 * @returns true if resources were registered, false if skipped due to client limitations
 */
export async function registerResources(server: McpServer): Promise<boolean> {
  log('info', 'Checking client capabilities for resource support');

  // Check if client supports resources
  if (!supportsResources(server)) {
    log('info', 'Client does not support resources, skipping resource registration');
    return false;
  }

  log('info', 'Client supports resources, registering MCP resources');

  const resources = await loadResources();

  for (const [uri, resource] of resources) {
    server.resource(uri, resource.description, { mimeType: resource.mimeType }, resource.handler);

    log('info', `Registered resource: ${uri}`);
  }

  log('info', `Registered ${resources.size} resources`);
  return true;
}

/**
 * Get all available resource URIs
 * @returns Array of resource URI strings
 */
export async function getAvailableResources(): Promise<string[]> {
  const resources = await loadResources();
  return Array.from(resources.keys());
}

/**
 * Get tool names that should be excluded when resources are available
 * This prevents duplicate functionality between tools and resources
 * @returns Array of tool names to exclude
 */
export function getRedundantToolNames(): string[] {
  return [
    'list_sims', // Redundant with simulators resource
    // Add more tool names as we add more resources
  ];
}

/**
 * Check if a tool should be excluded when resources are registered
 * @param toolName The name of the tool to check
 * @param resourcesRegistered Whether resources were successfully registered
 * @returns true if tool should be excluded, false otherwise
 */
export function shouldExcludeTool(toolName: string, resourcesRegistered: boolean): boolean {
  if (!resourcesRegistered) {
    return false; // Don't exclude any tools if resources aren't available
  }

  return getRedundantToolNames().includes(toolName);
}
