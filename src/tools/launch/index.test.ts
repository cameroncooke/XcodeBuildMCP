/**
 * Vitest tests for Launch Tools
 *
 * Tests all launch-related tools from launch.ts:
 * - launch_mac_app: Launches a macOS application
 * - stop_mac_app: Stops a running macOS application
 *
 * These tools handle macOS application lifecycle management using 'open', 'kill', and 'osascript' commands.
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { exec } from 'child_process';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';

// Import canonical tool functions
import { registerLaunchMacOSAppTool, registerStopMacOSAppTool } from './index.js';

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

describe('Launch Tools (Canonical)', () => {
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
    registerStopMacOSAppTool(mockServer);

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

  describe('stop_mac_app tool', () => {
    describe('parameter validation', () => {
      it('should reject when neither appName nor processId is provided', async () => {
        const tool = registeredTools.get('stop_mac_app');
        expect(tool).toBeDefined();

        const result = await tool.handler({});

        expect(result.isError).toBe(true);
        expect(result.content).toEqual([
          { type: 'text', text: 'Either appName or processId must be provided.' },
        ]);
        expect(mockExec).not.toHaveBeenCalled();
      });

      it('should accept appName only', async () => {
        const tool = registeredTools.get('stop_mac_app');
        expect(tool).toBeDefined();

        const params = {
          appName: 'Calculator',
        };

        const result = await tool.handler(params);

        expect(result.isError || false).toBe(false);
        expect(mockExec).toHaveBeenCalledTimes(1);
      });

      it('should accept processId only', async () => {
        const tool = registeredTools.get('stop_mac_app');
        expect(tool).toBeDefined();

        const params = {
          processId: 1234,
        };

        const result = await tool.handler(params);

        expect(result.isError || false).toBe(false);
        expect(mockExec).toHaveBeenCalledTimes(1);
      });

      it('should accept both appName and processId (processId takes precedence)', async () => {
        const tool = registeredTools.get('stop_mac_app');
        expect(tool).toBeDefined();

        const params = {
          appName: 'Calculator',
          processId: 1234,
        };

        const result = await tool.handler(params);

        expect(result.isError || false).toBe(false);
        expect(mockExec).toHaveBeenCalledTimes(1);
        // Should use processId command
        expect(mockExec).toHaveBeenCalledWith('kill 1234', expect.any(Function));
      });
    });

    describe('response formatting', () => {
      it('should return success response when stopping by app name succeeds', async () => {
        const tool = registeredTools.get('stop_mac_app');
        expect(tool).toBeDefined();

        const params = {
          appName: 'Calculator',
        };

        const result = await tool.handler(params);

        expect(result.isError || false).toBe(false);
        expect(result.content).toEqual([
          { type: 'text', text: '✅ macOS app stopped successfully: Calculator' },
        ]);
      });

      it('should return success response when stopping by process ID succeeds', async () => {
        const tool = registeredTools.get('stop_mac_app');
        expect(tool).toBeDefined();

        const params = {
          processId: 1234,
        };

        const result = await tool.handler(params);

        expect(result.isError || false).toBe(false);
        expect(result.content).toEqual([
          { type: 'text', text: '✅ macOS app stopped successfully: PID 1234' },
        ]);
      });

      it('should return error response when stop fails', async () => {
        const tool = registeredTools.get('stop_mac_app');
        expect(tool).toBeDefined();

        // Mock failed stop
        mockExec.mockImplementation(
          (
            command: string,
            callback: (error: Error | null, stdout: string, stderr: string) => void,
          ) => {
            callback(new Error('No such process'), '', 'No such process');
          },
        );

        const params = {
          processId: 9999,
        };

        const result = await tool.handler(params);

        expect(result.isError).toBe(true);
        expect(result.content).toEqual([
          { type: 'text', text: '❌ Stop macOS app operation failed: No such process' },
        ]);
      });
    });

    describe('command generation', () => {
      it('should generate kill command for processId', async () => {
        const tool = registeredTools.get('stop_mac_app');
        expect(tool).toBeDefined();

        const params = {
          processId: 1234,
        };

        await tool.handler(params);

        expect(mockExec).toHaveBeenCalledWith('kill 1234', expect.any(Function));
      });

      it('should generate pkill/osascript fallback command for app name', async () => {
        const tool = registeredTools.get('stop_mac_app');
        expect(tool).toBeDefined();

        const params = {
          appName: 'Calculator',
        };

        await tool.handler(params);

        expect(mockExec).toHaveBeenCalledWith(
          'pkill -f "Calculator" || osascript -e \'tell application "Calculator" to quit\'',
          expect.any(Function),
        );
      });

      it('should handle app names with spaces', async () => {
        const tool = registeredTools.get('stop_mac_app');
        expect(tool).toBeDefined();

        const params = {
          appName: 'My App With Spaces',
        };

        await tool.handler(params);

        expect(mockExec).toHaveBeenCalledWith(
          'pkill -f "My App With Spaces" || osascript -e \'tell application "My App With Spaces" to quit\'',
          expect.any(Function),
        );
      });

      it('should prioritize processId over appName when both provided', async () => {
        const tool = registeredTools.get('stop_mac_app');
        expect(tool).toBeDefined();

        const params = {
          appName: 'Calculator',
          processId: 5678,
        };

        await tool.handler(params);

        expect(mockExec).toHaveBeenCalledWith('kill 5678', expect.any(Function));
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

    it('should handle stop tool errors gracefully', async () => {
      const tool = registeredTools.get('stop_mac_app');
      expect(tool).toBeDefined();

      mockExec.mockImplementation(
        (
          command: string,
          callback: (error: Error | null, stdout: string, stderr: string) => void,
        ) => {
          callback(new Error('Operation not permitted'), '', '');
        },
      );

      const params = {
        processId: 1,
      };

      const result = await tool.handler(params);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: 'text', text: '❌ Stop macOS app operation failed: Operation not permitted' },
      ]);
    });
  });

  describe('tool metadata validation', () => {
    it('should have correct metadata for launch tools', () => {
      const launchTool = registeredTools.get('launch_mac_app');
      const stopTool = registeredTools.get('stop_mac_app');

      expect(launchTool).toBeDefined();
      expect(launchTool.name).toBe('launch_mac_app');
      expect(launchTool.description).toContain('Launches a macOS application');
      expect(launchTool.schema).toBeDefined();
      expect(launchTool.handler).toBeDefined();

      expect(stopTool).toBeDefined();
      expect(stopTool.name).toBe('stop_mac_app');
      expect(stopTool.description).toContain('Stops a running macOS application');
      expect(stopTool.schema).toBeDefined();
      expect(stopTool.handler).toBeDefined();
    });
  });
});
