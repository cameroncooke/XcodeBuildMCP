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

import { McpServer } from '@camsoft/mcp-sdk/server/mcp.js';
import { ReadResourceResult } from '@camsoft/mcp-sdk/types.js';
import { log } from '../utils/logging/index.ts';
import type { CommandExecutor } from '../utils/execution/index.ts';
import { RESOURCE_LOADERS } from './generated-resources.ts';

/**
 * Resource metadata interface
 */
export interface ResourceMeta {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  handler: (
    uri: URL,
    executor?: CommandExecutor,
  ) => Promise<{
    contents: Array<{ text: string }>;
  }>;
}

/**
 * Load all resources using generated loaders
 * @returns Map of resource URI to resource metadata
 */
export async function loadResources(): Promise<Map<string, ResourceMeta>> {
  const resources = new Map<string, ResourceMeta>();

  for (const [resourceName, loader] of Object.entries(RESOURCE_LOADERS)) {
    try {
      const resource = (await loader()) as ResourceMeta;

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
  const resources = await loadResources();

  for (const [uri, resource] of Array.from(resources)) {
    // Create a handler wrapper that matches ReadResourceCallback signature
    const readCallback = async (resourceUri: URL): Promise<ReadResourceResult> => {
      const result = await resource.handler(resourceUri);
      // Transform the content to match MCP SDK expectations
      return {
        contents: result.contents.map((content) => ({
          uri: resourceUri.toString(),
          text: content.text,
          mimeType: resource.mimeType,
        })),
      };
    };

    server.resource(
      resource.name,
      uri,
      {
        mimeType: resource.mimeType,
        title: resource.description,
      },
      readCallback,
    );

    log('info', `Registered resource: ${resource.name} at ${uri}`);
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
