/**
 * Vitest tests for launch_mac_app Plugin
 *
 * Tests the launch_mac_app plugin which launches macOS applications.
 * This plugin handles macOS application launching using the 'open' command.
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { exec } from 'child_process';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';

// Import plugin
import launchMacApp from './launch_mac_app.js';

// Import canonical tool functions for fallback testing
import { registerLaunchMacOSAppTool } from '../../src/tools/launch/index.js';

// Mock Node.js APIs directly
vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: vi.fn(() => true),
}));

// Mock logger to prevent real logging during tests
vi.mock('../../utils/logger.js', () => ({
  log: vi.fn(),
}));

// Create mock server to capture tool registrations
const mockServer = {
  tool: vi.fn(),
} as any as Server;

// Store registered tools
let registeredTools: Map<string, any> = new Map();

describe('launch_mac_app Plugin', () => {
  let mockExec: MockedFunction<typeof exec>;

  beforeEach(() => {
    // Clear registered tools
    registeredTools.clear();

    // Mock server.tool to capture registrations
    mockServer.tool.mockImplementation((name, description, schema, handler) => {
      registeredTools.set(name, { name, description, schema, handler });
    });

    // Register production tools
    registerLaunchMacOSAppTool(mockServer);

    mockExec = vi.mocked(exec);

    // Mock exec to resolve successfully by default
    mockExec.mockImplementation(
      (
        command: string,
        callback: (error: Error | null, stdout: string, stderr: string) => void,
      ) => {
        callback(null, '', '');
      },
    );

    vi.clearAllMocks();
  });

  describe('launch_mac_app tool', () => {
    describe('parameter validation', () => {
      it('should reject missing appPath', async () => {
        const tool = registeredTools.get('launch_mac_app');
        expect(tool).toBeDefined();

        const result = await tool.handler({});

        expect(result.isError).toBe(true);
        expect(result.content).toEqual([
          {
            type: 'text',
            text: "Required parameter 'appPath' is missing. Please provide a value for this parameter.",
          },
        ]);
        expect(mockExec).not.toHaveBeenCalled();
      });

      it('should accept valid appPath', async () => {
        const tool = registeredTools.get('launch_mac_app');
        expect(tool).toBeDefined();

        const params = {
          appPath: '/Applications/Calculator.app',
        };

        const result = await tool.handler(params);

        expect(result.isError || false).toBe(false);
        expect(mockExec).toHaveBeenCalledTimes(1);
        expect(mockExec).toHaveBeenCalledWith(
          'open "/Applications/Calculator.app"',
          expect.any(Function),
        );
      });

      it('should accept optional args parameter', async () => {
        const tool = registeredTools.get('launch_mac_app');
        expect(tool).toBeDefined();

        const params = {
          appPath: '/Applications/MyApp.app',
          args: ['--verbose', '--debug'],
        };

        const result = await tool.handler(params);

        expect(result.isError || false).toBe(false);
        expect(mockExec).toHaveBeenCalledTimes(1);
        expect(mockExec).toHaveBeenCalledWith(
          'open "/Applications/MyApp.app" --args --verbose --debug',
          expect.any(Function),
        );
      });
    });

    describe('response formatting', () => {
      it('should return success response when launch succeeds', async () => {
        const tool = registeredTools.get('launch_mac_app');
        expect(tool).toBeDefined();

        const params = {
          appPath: '/Applications/Calculator.app',
        };

        const result = await tool.handler(params);

        expect(result.isError || false).toBe(false);
        expect(result.content).toEqual([
          {
            type: 'text',
            text: '✅ macOS app launched successfully: /Applications/Calculator.app',
          },
        ]);
      });

      it('should return success response when launch with args succeeds', async () => {
        const tool = registeredTools.get('launch_mac_app');
        expect(tool).toBeDefined();

        const params = {
          appPath: '/Applications/MyApp.app',
          args: ['--verbose'],
        };

        const result = await tool.handler(params);

        expect(result.isError || false).toBe(false);
        expect(result.content).toEqual([
          { type: 'text', text: '✅ macOS app launched successfully: /Applications/MyApp.app' },
        ]);
      });

      it('should return error response when launch fails', async () => {
        const tool = registeredTools.get('launch_mac_app');
        expect(tool).toBeDefined();

        // Mock failed launch
        mockExec.mockImplementation(
          (
            command: string,
            callback: (error: Error | null, stdout: string, stderr: string) => void,
          ) => {
            callback(new Error('No such file or directory'), '', 'No such file or directory');
          },
        );

        const params = {
          appPath: '/Applications/NonExistent.app',
        };

        const result = await tool.handler(params);

        expect(result.isError).toBe(true);
        expect(result.content).toEqual([
          { type: 'text', text: '❌ Launch macOS app operation failed: No such file or directory' },
        ]);
      });
    });

    describe('command generation', () => {
      it('should generate correct command without args', async () => {
        const params = {
          appPath: '/path/to/MyApp.app',
        };

        const tool = registeredTools.get('launch_mac_app');
        expect(tool).toBeDefined();

        await tool.handler(params);

        expect(mockExec).toHaveBeenCalledWith('open "/path/to/MyApp.app"', expect.any(Function));
      });

      it('should generate correct command with args', async () => {
        const params = {
          appPath: '/path/to/MyApp.app',
          args: ['--flag1', 'value1', '--flag2'],
        };

        const tool = registeredTools.get('launch_mac_app');
        expect(tool).toBeDefined();

        await tool.handler(params);

        expect(mockExec).toHaveBeenCalledWith(
          'open "/path/to/MyApp.app" --args --flag1 value1 --flag2',
          expect.any(Function),
        );
      });

      it('should handle paths with spaces correctly', async () => {
        const tool = registeredTools.get('launch_mac_app');
        expect(tool).toBeDefined();

        const params = {
          appPath: '/Applications/My App With Spaces.app',
        };

        await tool.handler(params);

        expect(mockExec).toHaveBeenCalledWith(
          'open "/Applications/My App With Spaces.app"',
          expect.any(Function),
        );
      });
    });
  });


  describe('error handling', () => {
    it('should handle launch tool errors gracefully', async () => {
      const tool = registeredTools.get('launch_mac_app');
      expect(tool).toBeDefined();

      mockExec.mockImplementation(
        (
          command: string,
          callback: (error: Error | null, stdout: string, stderr: string) => void,
        ) => {
          callback(new Error('Command not found'), '', '');
        },
      );

      const params = {
        appPath: '/Applications/NonExistent.app',
      };

      const result = await tool.handler(params);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: 'text', text: '❌ Launch macOS app operation failed: Command not found' },
      ]);
    });
  });

  describe('tool metadata validation', () => {
    it('should have correct metadata for launch_mac_app tool', () => {
      const launchTool = registeredTools.get('launch_mac_app');

      expect(launchTool).toBeDefined();
      expect(launchTool.name).toBe('launch_mac_app');
      expect(launchTool.description).toContain('Launches a macOS application');
      expect(launchTool.schema).toBeDefined();
      expect(launchTool.handler).toBeDefined();
    });
  });

  describe('plugin structure', () => {
    it('should have correct plugin structure', () => {
      expect(launchMacApp).toBeDefined();
      expect(launchMacApp.name).toBe('launch_mac_app');
      expect(launchMacApp.description).toContain('Launches a macOS application');
      expect(launchMacApp.schema).toBeDefined();
      expect(launchMacApp.handler).toBeDefined();
    });

    it('should have schema with required appPath field', () => {
      expect(launchMacApp.schema.appPath).toBeDefined();
      expect(launchMacApp.schema.appPath.describe).toBeDefined();
    });

    it('should have schema with optional args field', () => {
      expect(launchMacApp.schema.args).toBeDefined();
      expect(launchMacApp.schema.args.isOptional()).toBe(true);
    });
  });
});
