import { describe, it, expect, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import {
  registerResources,
  getAvailableResources,
  supportsResources,
  loadResources,
  shouldExcludeTool,
  getRedundantToolNames,
} from '../resources.js';

describe('resources', () => {
  let mockServer: McpServer;
  let registeredResources: Array<{
    name: string;
    uri: string;
    metadata: { mimeType: string; title: string };
    handler: any;
  }>;

  beforeEach(() => {
    registeredResources = [];
    // Create a mock MCP server using simple object structure
    mockServer = {
      resource: (
        name: string,
        uri: string,
        metadata: { mimeType: string; title: string },
        handler: any,
      ) => {
        registeredResources.push({ name, uri, metadata, handler });
      },
    } as unknown as McpServer;
  });

  describe('Exports', () => {
    it('should export supportsResources function', () => {
      expect(typeof supportsResources).toBe('function');
    });

    it('should export registerResources function', () => {
      expect(typeof registerResources).toBe('function');
    });

    it('should export getAvailableResources function', () => {
      expect(typeof getAvailableResources).toBe('function');
    });

    it('should export loadResources function', () => {
      expect(typeof loadResources).toBe('function');
    });
  });

  describe('supportsResources', () => {
    it('should return true for resource support', () => {
      expect(supportsResources()).toBe(true);
    });
  });

  describe('loadResources', () => {
    it('should load resources from generated loaders', async () => {
      const resources = await loadResources();

      // Should have at least the simulators resource
      expect(resources.size).toBeGreaterThan(0);
      expect(resources.has('xcodebuildmcp://simulators')).toBe(true);
    });

    it('should validate resource structure', async () => {
      const resources = await loadResources();

      for (const [uri, resource] of resources) {
        expect(resource.uri).toBe(uri);
        expect(typeof resource.description).toBe('string');
        expect(typeof resource.mimeType).toBe('string');
        expect(typeof resource.handler).toBe('function');
      }
    });
  });

  describe('registerResources', () => {
    it('should register all loaded resources with the server and return true', async () => {
      const result = await registerResources(mockServer);

      expect(result).toBe(true);

      // Should have registered at least one resource
      expect(registeredResources.length).toBeGreaterThan(0);

      // Check simulators resource was registered
      const simulatorsResource = registeredResources.find(
        (r) => r.uri === 'xcodebuildmcp://simulators',
      );
      expect(typeof simulatorsResource?.handler).toBe('function');
      expect(simulatorsResource?.metadata.title).toBe(
        'Available iOS simulators with their UUIDs and states',
      );
      expect(simulatorsResource?.metadata.mimeType).toBe('text/plain');
      expect(simulatorsResource?.name).toBe('simulators');
    });

    it('should register resources with correct handlers', async () => {
      const result = await registerResources(mockServer);

      expect(result).toBe(true);

      const simulatorsResource = registeredResources.find(
        (r) => r.uri === 'xcodebuildmcp://simulators',
      );
      expect(typeof simulatorsResource?.handler).toBe('function');
    });
  });

  describe('getAvailableResources', () => {
    it('should return array of available resource URIs', async () => {
      const resources = await getAvailableResources();

      expect(Array.isArray(resources)).toBe(true);
      expect(resources.length).toBeGreaterThan(0);
      expect(resources).toContain('xcodebuildmcp://simulators');
    });

    it('should return unique URIs', async () => {
      const resources = await getAvailableResources();
      const uniqueResources = [...new Set(resources)];

      expect(resources.length).toBe(uniqueResources.length);
    });
  });

  describe('tool filtering', () => {
    describe('getRedundantToolNames', () => {
      it('should return array of redundant tool names', () => {
        const redundantTools = getRedundantToolNames();

        expect(Array.isArray(redundantTools)).toBe(true);
        expect(redundantTools).toContain('list_sims');
      });
    });

    describe('shouldExcludeTool', () => {
      it('should exclude redundant tools when resources are registered', () => {
        expect(shouldExcludeTool('list_sims', true)).toBe(true);
        expect(shouldExcludeTool('other_tool', true)).toBe(false);
      });

      it('should not exclude any tools when resources are not registered', () => {
        expect(shouldExcludeTool('list_sims', false)).toBe(false);
        expect(shouldExcludeTool('other_tool', false)).toBe(false);
      });
    });

    describe('supportsResources', () => {
      it('should return true by default for backward compatibility', () => {
        expect(supportsResources()).toBe(true);
      });

      it('should return true when server is not provided', () => {
        expect(supportsResources(undefined)).toBe(true);
      });
    });
  });
});
