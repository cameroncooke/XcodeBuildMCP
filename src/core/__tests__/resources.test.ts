import { describe, it, expect, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import {
  registerResources,
  getAvailableResources,
  supportsResources,
  RESOURCE_URIS,
  setTestExecutor,
  clearTestExecutor,
} from '../resources.js';
import { createMockExecutor, CommandExecutor } from '../../utils/command.js';

describe('resources', () => {
  let mockServer: McpServer;

  beforeEach(() => {
    // Clear any test executor from previous tests
    clearTestExecutor();

    // Create a mock MCP server using simple object structure
    mockServer = {
      resource: () => {},
    } as unknown as McpServer;
  });

  describe('Constants and Exports', () => {
    it('should export correct RESOURCE_URIS', () => {
      expect(RESOURCE_URIS.SIMULATORS).toBe('mcp://xcodebuild/simulators');
    });

    it('should export supportsResources function', () => {
      expect(typeof supportsResources).toBe('function');
    });

    it('should export registerResources function', () => {
      expect(typeof registerResources).toBe('function');
    });

    it('should export getAvailableResources function', () => {
      expect(typeof getAvailableResources).toBe('function');
    });
  });

  describe('supportsResources', () => {
    it('should return true for resource support', () => {
      expect(supportsResources()).toBe(true);
    });
  });

  describe('getAvailableResources', () => {
    it('should return array of available resource URIs', () => {
      const resources = getAvailableResources();
      expect(Array.isArray(resources)).toBe(true);
      expect(resources).toContain('mcp://xcodebuild/simulators');
    });

    it('should return non-empty array', () => {
      const resources = getAvailableResources();
      expect(resources.length).toBeGreaterThan(0);
    });
  });

  describe('registerResources', () => {
    it('should register simulators resource with correct parameters', () => {
      let capturedUri: string | undefined;
      let capturedDescription: string | undefined;
      let capturedOptions: { mimeType: string } | undefined;
      let capturedHandler:
        | ((
            executor?: CommandExecutor,
          ) => Promise<{ contents: Array<{ type: 'text'; text: string }> }>)
        | undefined;

      // Capture the registration call parameters
      mockServer.resource = (
        uri: string,
        description: string,
        options: { mimeType: string },
        handler: (
          executor?: CommandExecutor,
        ) => Promise<{ contents: Array<{ type: 'text'; text: string }> }>,
      ) => {
        capturedUri = uri;
        capturedDescription = description;
        capturedOptions = options;
        capturedHandler = handler;
      };

      registerResources(mockServer);

      expect(capturedUri).toBe('mcp://xcodebuild/simulators');
      expect(capturedDescription).toBe('Available iOS simulators with their UUIDs and states');
      expect(capturedOptions).toEqual({ mimeType: 'text/plain' });
      expect(typeof capturedHandler).toBe('function');
    });

    it('should call server.resource once for each resource', () => {
      let callCount = 0;

      mockServer.resource = () => {
        callCount++;
      };

      registerResources(mockServer);

      expect(callCount).toBe(1);
    });
  });

  describe('Simulators Resource Handler', () => {
    let resourceHandler: (
      executor?: CommandExecutor,
    ) => Promise<{ contents: Array<{ type: 'text'; text: string }> }>;

    beforeEach(() => {
      mockServer.resource = (
        _uri: string,
        _description: string,
        _options: { mimeType: string },
        handler: (
          executor?: CommandExecutor,
        ) => Promise<{ contents: Array<{ type: 'text'; text: string }> }>,
      ) => {
        resourceHandler = handler;
      };
      registerResources(mockServer);
    });

    it('should handle successful simulator data retrieval', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: JSON.stringify({
          devices: {
            'iOS 17.0': [
              {
                name: 'iPhone 15 Pro',
                udid: 'ABC123-DEF456-GHI789',
                state: 'Shutdown',
                isAvailable: true,
              },
            ],
          },
        }),
      });

      const result = await resourceHandler(mockExecutor);

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].type).toBe('text');
      expect(result.contents[0].text).toContain('Available iOS Simulators:');
      expect(result.contents[0].text).toContain('iPhone 15 Pro');
      expect(result.contents[0].text).toContain('ABC123-DEF456-GHI789');
    });

    it('should handle command execution failure', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'Command failed',
      });

      const result = await resourceHandler(mockExecutor);

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].type).toBe('text');
      expect(result.contents[0].text).toContain('Failed to list simulators');
      expect(result.contents[0].text).toContain('Command failed');
    });

    it('should handle JSON parsing errors', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'invalid json',
      });

      const result = await resourceHandler(mockExecutor);

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].type).toBe('text');
      expect(result.contents[0].text).toBe('invalid json');
    });

    it('should handle spawn errors', async () => {
      const mockExecutor = createMockExecutor(new Error('spawn xcrun ENOENT'));

      const result = await resourceHandler(mockExecutor);

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].type).toBe('text');
      expect(result.contents[0].text).toContain('Failed to list simulators');
      expect(result.contents[0].text).toContain('spawn xcrun ENOENT');
    });

    it('should handle empty simulator data', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: JSON.stringify({ devices: {} }),
      });

      const result = await resourceHandler(mockExecutor);

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].type).toBe('text');
      expect(result.contents[0].text).toContain('Available iOS Simulators:');
    });

    it('should handle booted simulators correctly', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: JSON.stringify({
          devices: {
            'iOS 17.0': [
              {
                name: 'iPhone 15 Pro',
                udid: 'ABC123-DEF456-GHI789',
                state: 'Booted',
                isAvailable: true,
              },
            ],
          },
        }),
      });

      const result = await resourceHandler(mockExecutor);

      expect(result.contents[0].text).toContain('[Booted]');
    });

    it('should filter out unavailable simulators', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: JSON.stringify({
          devices: {
            'iOS 17.0': [
              {
                name: 'iPhone 15 Pro',
                udid: 'ABC123-DEF456-GHI789',
                state: 'Shutdown',
                isAvailable: true,
              },
              {
                name: 'iPhone 14',
                udid: 'XYZ789-UVW456-RST123',
                state: 'Shutdown',
                isAvailable: false,
              },
            ],
          },
        }),
      });

      const result = await resourceHandler(mockExecutor);

      expect(result.contents[0].text).toContain('iPhone 15 Pro');
      expect(result.contents[0].text).not.toContain('iPhone 14');
    });

    it('should include next steps guidance', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: JSON.stringify({
          devices: {
            'iOS 17.0': [
              {
                name: 'iPhone 15 Pro',
                udid: 'ABC123-DEF456-GHI789',
                state: 'Shutdown',
                isAvailable: true,
              },
            ],
          },
        }),
      });

      const result = await resourceHandler(mockExecutor);

      expect(result.contents[0].text).toContain('Next Steps:');
      expect(result.contents[0].text).toContain('boot_sim');
      expect(result.contents[0].text).toContain('open_sim');
      expect(result.contents[0].text).toContain('build_ios_sim_id_proj');
      expect(result.contents[0].text).toContain('get_sim_app_path_id_proj');
    });
  });
});
