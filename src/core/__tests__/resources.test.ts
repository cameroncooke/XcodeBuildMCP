import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// CRITICAL: Mock BEFORE imports to ensure proper mock chain
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

import {
  registerResources,
  getAvailableResources,
  supportsResources,
  RESOURCE_URIS,
} from '../resources.js';
import { createMockExecutor } from '../../utils/test-common.js';

class MockChildProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  pid = 12345;
}

describe('resources', () => {
  let mockProcess: MockChildProcess;
  let mockServer: McpServer;

  beforeEach(() => {
    vi.clearAllMocks();
    mockProcess = new MockChildProcess();
    vi.mocked(spawn).mockReturnValue(mockProcess as any);

    // Create a mock MCP server
    mockServer = {
      resource: vi.fn(),
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
      registerResources(mockServer);

      expect(mockServer.resource).toHaveBeenCalledWith(
        'mcp://xcodebuild/simulators',
        'Available iOS simulators with their UUIDs and states',
        { mimeType: 'application/json' },
        expect.any(Function),
      );
    });

    it('should call server.resource once for each resource', () => {
      registerResources(mockServer);

      expect(mockServer.resource).toHaveBeenCalledTimes(1);
    });
  });

  describe('Simulators Resource Handler', () => {
    let resourceHandler: () => Promise<{ contents: Array<{ type: 'text'; text: string }> }>;

    beforeEach(() => {
      registerResources(mockServer);
      // Extract the handler function from the mock call
      const calls = vi.mocked(mockServer.resource).mock.calls;
      resourceHandler = calls[0][3]; // Fourth parameter is the handler
    });

    it('should handle successful simulator data retrieval', async () => {
      // Mock successful command execution
      setTimeout(() => {
        mockProcess.stdout.emit(
          'data',
          JSON.stringify({
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
        );
        mockProcess.emit('close', 0);
      }, 0);

      const result = await resourceHandler();

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].type).toBe('text');
      expect(result.contents[0].text).toContain('Available iOS Simulators:');
      expect(result.contents[0].text).toContain('iPhone 15 Pro');
      expect(result.contents[0].text).toContain('ABC123-DEF456-GHI789');
    });

    it('should handle command execution failure', async () => {
      // Mock command failure
      setTimeout(() => {
        mockProcess.stderr.emit('data', 'Command failed');
        mockProcess.emit('close', 1);
      }, 0);

      const result = await resourceHandler();

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].type).toBe('text');
      expect(result.contents[0].text).toContain('Error retrieving simulator data');
    });

    it('should handle JSON parsing errors', async () => {
      // Mock invalid JSON response
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'invalid json');
        mockProcess.emit('close', 0);
      }, 0);

      const result = await resourceHandler();

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].type).toBe('text');
      expect(result.contents[0].text).toBe('invalid json');
    });

    it('should handle spawn errors', async () => {
      // Mock spawn error
      setTimeout(() => {
        mockProcess.emit('error', new Error('spawn xcrun ENOENT'));
      }, 0);

      const result = await resourceHandler();

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].type).toBe('text');
      expect(result.contents[0].text).toContain('Error retrieving simulator data');
      expect(result.contents[0].text).toContain('spawn xcrun ENOENT');
    });

    it('should handle empty simulator data', async () => {
      // Mock empty simulator response
      setTimeout(() => {
        mockProcess.stdout.emit('data', JSON.stringify({ devices: {} }));
        mockProcess.emit('close', 0);
      }, 0);

      const result = await resourceHandler();

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].type).toBe('text');
      expect(result.contents[0].text).toContain('Available iOS Simulators:');
    });

    it('should handle booted simulators correctly', async () => {
      // Mock simulator with booted state
      setTimeout(() => {
        mockProcess.stdout.emit(
          'data',
          JSON.stringify({
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
        );
        mockProcess.emit('close', 0);
      }, 0);

      const result = await resourceHandler();

      expect(result.contents[0].text).toContain('[Booted]');
    });

    it('should filter out unavailable simulators', async () => {
      // Mock mix of available and unavailable simulators
      setTimeout(() => {
        mockProcess.stdout.emit(
          'data',
          JSON.stringify({
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
        );
        mockProcess.emit('close', 0);
      }, 0);

      const result = await resourceHandler();

      expect(result.contents[0].text).toContain('iPhone 15 Pro');
      expect(result.contents[0].text).not.toContain('iPhone 14');
    });

    it('should include next steps guidance', async () => {
      // Mock successful response
      setTimeout(() => {
        mockProcess.stdout.emit(
          'data',
          JSON.stringify({
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
        );
        mockProcess.emit('close', 0);
      }, 0);

      const result = await resourceHandler();

      expect(result.contents[0].text).toContain('Next Steps:');
      expect(result.contents[0].text).toContain('boot_sim');
      expect(result.contents[0].text).toContain('open_sim');
      expect(result.contents[0].text).toContain('build_ios_sim_id_proj');
      expect(result.contents[0].text).toContain('get_sim_app_path_id_proj');
    });
  });
});
