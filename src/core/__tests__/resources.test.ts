import { describe, it, expect, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import {
  registerResources,
  getAvailableResources,
  supportsResources,
  loadResources,
} from '../resources.js';

describe('resources', () => {
  let mockServer: McpServer;
  let registeredResources: Array<{
    uri: string;
    description: string;
    options: { mimeType: string };
    handler: any;
  }>;

  beforeEach(() => {
    registeredResources = [];
    // Create a mock MCP server using simple object structure
    mockServer = {
      resource: (uri: string, description: string, options: { mimeType: string }, handler: any) => {
        registeredResources.push({ uri, description, options, handler });
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
      expect(resources.has('mcp://xcodebuild/simulators')).toBe(true);
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
    it('should register all loaded resources with the server', async () => {
      await registerResources(mockServer);

      // Should have registered at least one resource
      expect(registeredResources.length).toBeGreaterThan(0);

      // Check simulators resource was registered
      const simulatorsResource = registeredResources.find(
        (r) => r.uri === 'mcp://xcodebuild/simulators',
      );
      expect(simulatorsResource).toBeDefined();
      expect(simulatorsResource?.description).toBe(
        'Available iOS simulators with their UUIDs and states',
      );
      expect(simulatorsResource?.options.mimeType).toBe('text/plain');
    });

    it('should register resources with correct handlers', async () => {
      await registerResources(mockServer);

      const simulatorsResource = registeredResources.find(
        (r) => r.uri === 'mcp://xcodebuild/simulators',
      );
      expect(typeof simulatorsResource?.handler).toBe('function');
    });
  });

  describe('getAvailableResources', () => {
    it('should return array of available resource URIs', async () => {
      const resources = await getAvailableResources();

      expect(Array.isArray(resources)).toBe(true);
      expect(resources.length).toBeGreaterThan(0);
      expect(resources).toContain('mcp://xcodebuild/simulators');
    });

    it('should return unique URIs', async () => {
      const resources = await getAvailableResources();
      const uniqueResources = [...new Set(resources)];

      expect(resources.length).toBe(uniqueResources.length);
    });
  });
});
