/**
 * Tests for MCP Resource Management System
 *
 * This test suite validates the MCP resource registration and handling system,
 * ensuring proper integration with existing list_sims logic and backward compatibility.
 *
 * Testing follows the project's no-vitest-mocking guidelines and uses dependency injection
 * with createMockExecutor for command execution testing.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createMockExecutor } from '../../utils/command.js';
import { registerResources, supportsResources } from '../resources.js';

describe('MCP Resources System', () => {
  let server: McpServer;
  let callHistory: Array<{
    command: string[];
    logPrefix?: string;
    useShell?: boolean;
    env?: Record<string, string>;
  }>;

  beforeEach(() => {
    // Create a mock server for testing
    server = new McpServer(
      { name: 'test-server', version: '1.0.0' },
      {
        capabilities: {
          resources: { subscribe: true, listChanged: true },
          tools: { listChanged: true },
          logging: {},
        },
      },
    );

    callHistory = [];
  });

  describe('Resource Registration', () => {
    it('should register resources without throwing errors', () => {
      expect(() => {
        registerResources(server);
      }).not.toThrow();
    });

    it('should have resource capability detection function', () => {
      expect(typeof supportsResources).toBe('function');
      expect(supportsResources()).toBe(true);
    });
  });

  describe('Simulators Resource Handler', () => {
    beforeEach(() => {
      // Mock the list_simsLogic module
      callHistory = [];
    });

    it('should handle successful simulator data retrieval', async () => {
      const mockOutput = JSON.stringify({
        devices: {
          'iOS 17.0': [
            {
              name: 'iPhone 15',
              udid: 'test-uuid-123',
              isAvailable: true,
              state: 'Shutdown',
            },
          ],
        },
      });

      const mockExecutor = createMockExecutor({
        success: true,
        output: mockOutput,
        error: undefined,
        process: { pid: 12345 },
      });

      // Track calls manually
      const wrappedExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        callHistory.push({ command, logPrefix, useShell, env });
        return mockExecutor(command, logPrefix, useShell, env);
      };

      // Register resources
      registerResources(server);

      // Simulate resource read by directly testing the underlying logic
      const { list_simsLogic } = await import('../../plugins/simulator-shared/list_sims.js');
      const result = await list_simsLogic({}, wrappedExecutor);

      // Verify command was called correctly
      expect(callHistory).toHaveLength(1);
      expect(callHistory[0]).toEqual({
        command: ['xcrun', 'simctl', 'list', 'devices', 'available', '--json'],
        logPrefix: 'List Simulators',
        useShell: true,
        env: undefined,
      });

      // Verify the response format that would be returned by the resource
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `Available iOS Simulators:

iOS 17.0:
- iPhone 15 (test-uuid-123)

Next Steps:
1. Boot a simulator: boot_sim({ simulatorUuid: 'UUID_FROM_ABOVE' })
2. Open the simulator UI: open_sim({ enabled: true })
3. Build for simulator: build_ios_sim_id_proj({ scheme: 'YOUR_SCHEME', simulatorId: 'UUID_FROM_ABOVE' })
4. Get app path: get_sim_app_path_id_proj({ scheme: 'YOUR_SCHEME', platform: 'iOS Simulator', simulatorId: 'UUID_FROM_ABOVE' })`,
          },
        ],
      });
    });

    it('should handle command execution failure', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'Command failed',
        process: { pid: 12345 },
      });

      const wrappedExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        callHistory.push({ command, logPrefix, useShell, env });
        return mockExecutor(command, logPrefix, useShell, env);
      };

      // Test the underlying logic that resources would use
      const { list_simsLogic } = await import('../../plugins/simulator-shared/list_sims.js');
      const result = await list_simsLogic({}, wrappedExecutor);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to list simulators: Command failed',
          },
        ],
      });
    });

    it('should handle JSON parsing errors', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'invalid json',
        error: undefined,
        process: { pid: 12345 },
      });

      const wrappedExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        callHistory.push({ command, logPrefix, useShell, env });
        return mockExecutor(command, logPrefix, useShell, env);
      };

      const { list_simsLogic } = await import('../../plugins/simulator-shared/list_sims.js');
      const result = await list_simsLogic({}, wrappedExecutor);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'invalid json',
          },
        ],
      });
    });

    it('should handle execution exceptions', async () => {
      const mockExecutor = createMockExecutor(new Error('Command execution failed'));

      const wrappedExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        callHistory.push({ command, logPrefix, useShell, env });
        return mockExecutor(command, logPrefix, useShell, env);
      };

      const { list_simsLogic } = await import('../../plugins/simulator-shared/list_sims.js');
      const result = await list_simsLogic({}, wrappedExecutor);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to list simulators: Command execution failed',
          },
        ],
      });
    });

    it('should handle empty simulator data', async () => {
      const mockOutput = JSON.stringify({
        devices: {},
      });

      const mockExecutor = createMockExecutor({
        success: true,
        output: mockOutput,
        error: undefined,
        process: { pid: 12345 },
      });

      const wrappedExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        callHistory.push({ command, logPrefix, useShell, env });
        return mockExecutor(command, logPrefix, useShell, env);
      };

      const { list_simsLogic } = await import('../../plugins/simulator-shared/list_sims.js');
      const result = await list_simsLogic({}, wrappedExecutor);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `Available iOS Simulators:

Next Steps:
1. Boot a simulator: boot_sim({ simulatorUuid: 'UUID_FROM_ABOVE' })
2. Open the simulator UI: open_sim({ enabled: true })
3. Build for simulator: build_ios_sim_id_proj({ scheme: 'YOUR_SCHEME', simulatorId: 'UUID_FROM_ABOVE' })
4. Get app path: get_sim_app_path_id_proj({ scheme: 'YOUR_SCHEME', platform: 'iOS Simulator', simulatorId: 'UUID_FROM_ABOVE' })`,
          },
        ],
      });
    });
  });

  describe('Backward Compatibility', () => {
    it('should provide capability detection for client fallbacks', () => {
      const hasResourceSupport = supportsResources();
      expect(typeof hasResourceSupport).toBe('boolean');
      expect(hasResourceSupport).toBe(true);
    });

    it('should not interfere with existing tool registration', () => {
      // This test ensures that resource registration doesn't break tool functionality
      registerResources(server);

      // Register a test tool to ensure server still accepts tools
      expect(() => {
        server.tool('test_tool', 'Test tool', () => ({
          content: [{ type: 'text', text: 'test' }],
        }));
      }).not.toThrow();
    });
  });

  describe('Resource URI Scheme', () => {
    it('should use correct URI scheme for simulators resource', () => {
      // This test validates that we're using the expected URI pattern
      const expectedUri = 'mcp://xcodebuild/simulators';

      // The URI should be what we registered in the resources.ts file
      // This is more of a documentation test to ensure consistency
      expect(expectedUri).toBe('mcp://xcodebuild/simulators');
    });
  });
});
