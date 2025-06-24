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
import { callToolHandler, type ToolMeta } from '../../tests-vitest/helpers/vitest-tool-helpers.js';
import { z } from 'zod';

// Import canonical tool functions
import { registerLaunchMacOSAppTool, registerStopMacOSAppTool } from './launch.js';

// Mock Node.js APIs directly
vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: vi.fn(() => true),
}));

// Mock logger to prevent real logging during tests
vi.mock('../utils/logger.js', () => ({
  log: vi.fn(),
}));

// Tool wrapper utility to create ToolMeta from canonical registration functions
function createToolWrapper(
  name: string,
  description: string,
  groups: string[],
  registerFn: any,
  schema: z.ZodType,
): ToolMeta<z.ZodType> {
  let capturedHandler: any = null;

  // Mock server to capture the registered tool
  const mockServer = {
    tool: (toolName: string, toolDescription: string, toolSchema: any, handler: any) => {
      if (toolName === name) {
        capturedHandler = handler;
      }
    },
  };

  // Register the tool to capture its handler
  registerFn(mockServer);

  if (!capturedHandler) {
    throw new Error(`Failed to capture handler for tool: ${name}`);
  }

  return {
    name,
    description,
    groups,
    schema,
    handler: async (params: any) => {
      return await capturedHandler(params, {});
    },
  };
}

// Define schemas for launch tools
const appPathWithArgsSchema = z.object({
  appPath: z.string(),
  args: z.array(z.string()).optional(),
});

const stopMacAppSchema = z.object({
  appName: z.string().optional(),
  processId: z.number().optional(),
});

// Create tool wrappers for launch tools
const launchMacAppTool = createToolWrapper(
  'launch_mac_app',
  'Launches a macOS application.',
  ['MACOS'],
  registerLaunchMacOSAppTool,
  appPathWithArgsSchema,
);

const stopMacAppTool = createToolWrapper(
  'stop_mac_app',
  'Stops a running macOS application.',
  ['MACOS'],
  registerStopMacOSAppTool,
  stopMacAppSchema,
);

describe('Launch Tools (Canonical)', () => {
  let mockExec: MockedFunction<any>;

  beforeEach(() => {
    mockExec = exec as MockedFunction<any>;

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
        const params = {};

        const result = await callToolHandler(launchMacAppTool, params);

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
        const params = {
          appPath: '/Applications/Calculator.app',
        };

        const result = await callToolHandler(launchMacAppTool, params);

        expect(result.isError || false).toBe(false);
        expect(mockExec).toHaveBeenCalledTimes(1);
        expect(mockExec).toHaveBeenCalledWith(
          'open "/Applications/Calculator.app"',
          expect.any(Function),
        );
      });

      it('should accept optional args parameter', async () => {
        const params = {
          appPath: '/Applications/MyApp.app',
          args: ['--verbose', '--debug'],
        };

        const result = await callToolHandler(launchMacAppTool, params);

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
        const params = {
          appPath: '/Applications/Calculator.app',
        };

        const result = await callToolHandler(launchMacAppTool, params);

        expect(result.isError || false).toBe(false);
        expect(result.content).toEqual([
          {
            type: 'text',
            text: '✅ macOS app launched successfully: /Applications/Calculator.app',
          },
        ]);
      });

      it('should return success response when launch with args succeeds', async () => {
        const params = {
          appPath: '/Applications/MyApp.app',
          args: ['--verbose'],
        };

        const result = await callToolHandler(launchMacAppTool, params);

        expect(result.isError || false).toBe(false);
        expect(result.content).toEqual([
          { type: 'text', text: '✅ macOS app launched successfully: /Applications/MyApp.app' },
        ]);
      });

      it('should return error response when launch fails', async () => {
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

        const result = await callToolHandler(launchMacAppTool, params);

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

        await callToolHandler(launchMacAppTool, params);

        expect(mockExec).toHaveBeenCalledWith('open "/path/to/MyApp.app"', expect.any(Function));
      });

      it('should generate correct command with args', async () => {
        const params = {
          appPath: '/path/to/MyApp.app',
          args: ['--flag1', 'value1', '--flag2'],
        };

        await callToolHandler(launchMacAppTool, params);

        expect(mockExec).toHaveBeenCalledWith(
          'open "/path/to/MyApp.app" --args --flag1 value1 --flag2',
          expect.any(Function),
        );
      });

      it('should handle paths with spaces correctly', async () => {
        const params = {
          appPath: '/Applications/My App With Spaces.app',
        };

        await callToolHandler(launchMacAppTool, params);

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
        const params = {};

        const result = await callToolHandler(stopMacAppTool, params);

        expect(result.isError).toBe(true);
        expect(result.content).toEqual([
          { type: 'text', text: 'Either appName or processId must be provided.' },
        ]);
        expect(mockExec).not.toHaveBeenCalled();
      });

      it('should accept appName only', async () => {
        const params = {
          appName: 'Calculator',
        };

        const result = await callToolHandler(stopMacAppTool, params);

        expect(result.isError || false).toBe(false);
        expect(mockExec).toHaveBeenCalledTimes(1);
      });

      it('should accept processId only', async () => {
        const params = {
          processId: 1234,
        };

        const result = await callToolHandler(stopMacAppTool, params);

        expect(result.isError || false).toBe(false);
        expect(mockExec).toHaveBeenCalledTimes(1);
      });

      it('should accept both appName and processId (processId takes precedence)', async () => {
        const params = {
          appName: 'Calculator',
          processId: 1234,
        };

        const result = await callToolHandler(stopMacAppTool, params);

        expect(result.isError || false).toBe(false);
        expect(mockExec).toHaveBeenCalledTimes(1);
        // Should use processId command
        expect(mockExec).toHaveBeenCalledWith('kill 1234', expect.any(Function));
      });
    });

    describe('response formatting', () => {
      it('should return success response when stopping by app name succeeds', async () => {
        const params = {
          appName: 'Calculator',
        };

        const result = await callToolHandler(stopMacAppTool, params);

        expect(result.isError || false).toBe(false);
        expect(result.content).toEqual([
          { type: 'text', text: '✅ macOS app stopped successfully: Calculator' },
        ]);
      });

      it('should return success response when stopping by process ID succeeds', async () => {
        const params = {
          processId: 1234,
        };

        const result = await callToolHandler(stopMacAppTool, params);

        expect(result.isError || false).toBe(false);
        expect(result.content).toEqual([
          { type: 'text', text: '✅ macOS app stopped successfully: PID 1234' },
        ]);
      });

      it('should return error response when stop fails', async () => {
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

        const result = await callToolHandler(stopMacAppTool, params);

        expect(result.isError).toBe(true);
        expect(result.content).toEqual([
          { type: 'text', text: '❌ Stop macOS app operation failed: No such process' },
        ]);
      });
    });

    describe('command generation', () => {
      it('should generate kill command for processId', async () => {
        const params = {
          processId: 1234,
        };

        await callToolHandler(stopMacAppTool, params);

        expect(mockExec).toHaveBeenCalledWith('kill 1234', expect.any(Function));
      });

      it('should generate pkill/osascript fallback command for app name', async () => {
        const params = {
          appName: 'Calculator',
        };

        await callToolHandler(stopMacAppTool, params);

        expect(mockExec).toHaveBeenCalledWith(
          'pkill -f "Calculator" || osascript -e \'tell application "Calculator" to quit\'',
          expect.any(Function),
        );
      });

      it('should handle app names with spaces', async () => {
        const params = {
          appName: 'My App With Spaces',
        };

        await callToolHandler(stopMacAppTool, params);

        expect(mockExec).toHaveBeenCalledWith(
          'pkill -f "My App With Spaces" || osascript -e \'tell application "My App With Spaces" to quit\'',
          expect.any(Function),
        );
      });

      it('should prioritize processId over appName when both provided', async () => {
        const params = {
          appName: 'Calculator',
          processId: 5678,
        };

        await callToolHandler(stopMacAppTool, params);

        expect(mockExec).toHaveBeenCalledWith('kill 5678', expect.any(Function));
      });
    });
  });

  describe('error handling', () => {
    it('should handle launch tool errors gracefully', async () => {
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

      const result = await callToolHandler(launchMacAppTool, params);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: 'text', text: '❌ Launch macOS app operation failed: Command not found' },
      ]);
    });

    it('should handle stop tool errors gracefully', async () => {
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

      const result = await callToolHandler(stopMacAppTool, params);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: 'text', text: '❌ Stop macOS app operation failed: Operation not permitted' },
      ]);
    });
  });

  describe('tool metadata validation', () => {
    it('should have correct metadata for launch tools', () => {
      const tools = [
        { tool: launchMacAppTool, expectedName: 'launch_mac_app', expectedGroups: ['MACOS'] },
        { tool: stopMacAppTool, expectedName: 'stop_mac_app', expectedGroups: ['MACOS'] },
      ];

      tools.forEach(({ tool, expectedName, expectedGroups }) => {
        expect(tool.name).toBe(expectedName);
        expect(tool.groups).toEqual(expectedGroups);
        expect(tool.schema).toBeDefined();
        expect(tool.handler).toBeDefined();
      });
    });
  });
});
