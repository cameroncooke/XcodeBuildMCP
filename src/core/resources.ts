/**
 * Resource Management - MCP Resource handlers and URI management
 *
 * This module manages MCP resources, providing a unified interface for exposing
 * data through the Model Context Protocol resource system.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';
import { log } from '../utils/logging/index.ts';
import type { CommandExecutor } from '../utils/execution/index.ts';

// Direct imports - no codegen needed
import devicesResource from '../mcp/resources/devices.ts';
import doctorResource from '../mcp/resources/doctor.ts';
import sessionStatusResource from '../mcp/resources/session-status.ts';
import simulatorsResource from '../mcp/resources/simulators.ts';
import xcodeIdeStateResource from '../mcp/resources/xcode-ide-state.ts';

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
 * All available resources
 */
const RESOURCES: ResourceMeta[] = [
  devicesResource,
  doctorResource,
  sessionStatusResource,
  simulatorsResource,
  xcodeIdeStateResource,
];

/**
 * Load all resources
 * @returns Map of resource URI to resource metadata
 */
export async function loadResources(): Promise<Map<string, ResourceMeta>> {
  const resources = new Map<string, ResourceMeta>();

  for (const resource of RESOURCES) {
    if (!resource.uri || !resource.handler || typeof resource.handler !== 'function') {
      log(
        'error',
        `[infra/resources] invalid resource structure for ${resource.name ?? 'unknown'}`,
        { sentry: true },
      );
      continue;
    }

    resources.set(resource.uri, resource);
    log('info', `Loaded resource: ${resource.name} (${resource.uri})`);
  }

  return resources;
}

/**
 * Register all resources with the MCP server
 * @param server The MCP server instance
 * @returns true if resources were registered
 */
export async function registerResources(server: McpServer): Promise<boolean> {
  const resources = await loadResources();

  for (const [uri, resource] of resources) {
    const readCallback = async (resourceUri: URL): Promise<ReadResourceResult> => {
      const result = await resource.handler(resourceUri);
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
