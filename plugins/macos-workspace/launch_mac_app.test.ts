/**
 * Vitest tests for launch_mac_app Plugin
 *
 * Tests the launch_mac_app plugin which launches macOS applications.
 * This plugin handles macOS application launching using the 'open' command.
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { exec } from 'child_process';
import type { Server } from '@modelcontextprotocol/sdk/server/index.ts';

// Import plugin
import launchMacApp from './launch_mac_app.ts';


// Mock Node.js APIs directly
vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: vi.fn(() => true),
}));

// Mock logger to prevent real logging during tests
vi.mock('../../utils/logger.ts', () => ({
  log: vi.fn(),
}));

describe('launch_mac_app Plugin', () => {
  let mockExec: MockedFunction<typeof exec>;

  beforeEach(() => {
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
        const result = await launchMacApp.handler({});

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

        const result = await launchMacApp.handler(params);

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

        const result = await launchMacApp.handler(params);

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

        const result = await launchMacApp.handler(params);

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

        const result = await launchMacApp.handler(params);

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

        const result = await launchMacApp.handler(params);

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

        

        await launchMacApp.handler(params);

        expect(mockExec).toHaveBeenCalledWith('open "/path/to/MyApp.app"', expect.any(Function));
      });

      it('should generate correct command with args', async () => {
        const params = {
          appPath: '/path/to/MyApp.app',
          args: ['--flag1', 'value1', '--flag2'],
        };

        

        await launchMacApp.handler(params);

        expect(mockExec).toHaveBeenCalledWith(
          'open "/path/to/MyApp.app" --args --flag1 value1 --flag2',
          expect.any(Function),
        );
      });

      it('should handle paths with spaces correctly', async () => {
        

        const params = {
          appPath: '/Applications/My App With Spaces.app',
        };

        await launchMacApp.handler(params);

        expect(mockExec).toHaveBeenCalledWith(
          'open "/Applications/My App With Spaces.app"',
          expect.any(Function),
        );
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

      const result = await launchMacApp.handler(params);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: 'text', text: '❌ Launch macOS app operation failed: Command not found' },
      ]);
    });
  });

  describe('tool metadata validation', () => {
    it('should have correct metadata for launch_mac_app tool', () => {
      expect(launchMacApp).toBeDefined();
      expect(launchMacApp.name).toBe('launch_mac_app');
      expect(launchMacApp.description).toContain('Launches a macOS application');
      expect(launchMacApp.schema).toBeDefined();
      expect(launchMacApp.handler).toBeDefined();
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
