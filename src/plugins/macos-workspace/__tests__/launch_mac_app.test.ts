/**
 * Tests for launch_mac_app plugin (re-exported from macos-shared)
 * Following CLAUDE.md testing standards with literal validation
 * Using dependency injection for deterministic testing
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createMockFileSystemExecutor } from '../../../utils/command.js';
import launchMacApp, { launch_mac_appLogic } from '../../macos-shared/launch_mac_app.js';

// Manual execution stub for testing
interface ExecutionStub {
  success: boolean;
  error?: string;
}

function createExecutionStub(stub: ExecutionStub) {
  const calls: string[][] = [];

  const execStub = async (command: string[], description?: string) => {
    calls.push(command);
    if (stub.success) {
      return {
        success: true,
        output: '',
        error: undefined,
        process: { pid: 12345 },
      };
    } else {
      throw new Error(stub.error || 'Command failed');
    }
  };

  return { execStub, calls };
}

describe('launch_mac_app plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(launchMacApp.name).toBe('launch_mac_app');
    });

    it('should have correct description', () => {
      expect(launchMacApp.description).toBe(
        "Launches a macOS application. IMPORTANT: You MUST provide the appPath parameter. Example: launch_mac_app({ appPath: '/path/to/your/app.app' }) Note: In some environments, this tool may be prefixed as mcp0_launch_macos_app.",
      );
    });

    it('should have handler function', () => {
      expect(typeof launchMacApp.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Test required fields
      expect(launchMacApp.schema.appPath.safeParse('/path/to/MyApp.app').success).toBe(true);

      // Test optional fields
      expect(launchMacApp.schema.args.safeParse(['--debug']).success).toBe(true);
      expect(launchMacApp.schema.args.safeParse(undefined).success).toBe(true);

      // Test invalid inputs
      expect(launchMacApp.schema.appPath.safeParse(null).success).toBe(false);
      expect(launchMacApp.schema.args.safeParse('not-array').success).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return exact successful launch response', async () => {
      const { execStub, calls } = createExecutionStub({
        success: true,
      });

      const mockFileSystem = createMockFileSystemExecutor({
        existsSync: () => true,
      });

      const result = await launch_mac_appLogic(
        {
          appPath: '/path/to/MyApp.app',
        },
        execStub,
        mockFileSystem,
      );

      expect(calls).toEqual([['open', '/path/to/MyApp.app']]);
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ macOS app launched successfully: /path/to/MyApp.app',
          },
        ],
      });
    });

    it('should return exact successful launch response with args', async () => {
      const { execStub, calls } = createExecutionStub({
        success: true,
      });

      const mockFileSystem = createMockFileSystemExecutor({
        existsSync: () => true,
      });

      const result = await launch_mac_appLogic(
        {
          appPath: '/path/to/MyApp.app',
          args: ['--debug', '--verbose'],
        },
        execStub,
        mockFileSystem,
      );

      expect(calls).toEqual([['open', '/path/to/MyApp.app', '--args', '--debug', '--verbose']]);
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ macOS app launched successfully: /path/to/MyApp.app',
          },
        ],
      });
    });

    it('should return exact launch failure response', async () => {
      const { execStub, calls } = createExecutionStub({
        success: false,
        error: 'App not found',
      });

      const mockFileSystem = createMockFileSystemExecutor({
        existsSync: () => true,
      });

      const result = await launch_mac_appLogic(
        {
          appPath: '/path/to/MyApp.app',
        },
        execStub,
        mockFileSystem,
      );

      expect(calls).toEqual([['open', '/path/to/MyApp.app']]);
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ Launch macOS app operation failed: App not found',
          },
        ],
        isError: true,
      });
    });

    it('should return exact missing appPath validation response', async () => {
      const result = await launch_mac_appLogic({});

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'appPath' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });
  });
});
