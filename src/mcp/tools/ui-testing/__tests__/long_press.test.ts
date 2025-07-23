/**
 * Tests for long_press tool plugin
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { createMockExecutor, createNoopExecutor } from '../../../../utils/command.js';
import longPressPlugin, { long_pressLogic } from '../long_press.ts';

describe('Long Press Plugin', () => {
  // Setup for each test - no vitest mocks to clear

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(longPressPlugin.name).toBe('long_press');
    });

    it('should have correct description', () => {
      expect(longPressPlugin.description).toBe(
        "Long press at specific coordinates for given duration (ms). Use describe_ui for precise coordinates (don't guess from screenshots).",
      );
    });

    it('should have handler function', () => {
      expect(typeof longPressPlugin.handler).toBe('function');
    });

    it('should validate schema fields with safeParse', () => {
      const schema = z.object(longPressPlugin.schema);

      // Valid case
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 100,
          y: 200,
          duration: 1500,
        }).success,
      ).toBe(true);

      // Invalid simulatorUuid
      expect(
        schema.safeParse({
          simulatorUuid: 'invalid-uuid',
          x: 100,
          y: 200,
          duration: 1500,
        }).success,
      ).toBe(false);

      // Invalid x (not integer)
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 100.5,
          y: 200,
          duration: 1500,
        }).success,
      ).toBe(false);

      // Invalid y (not integer)
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 100,
          y: 200.5,
          duration: 1500,
        }).success,
      ).toBe(false);

      // Invalid duration (not positive)
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 100,
          y: 200,
          duration: 0,
        }).success,
      ).toBe(false);

      // Invalid duration (negative)
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 100,
          y: 200,
          duration: -100,
        }).success,
      ).toBe(false);
    });
  });

  describe('Command Generation', () => {
    it('should generate correct axe command for basic long press', async () => {
      let capturedCommand: string[] = [];
      const trackingExecutor = async (command: string[]) => {
        capturedCommand = command;
        return {
          success: true,
          output: 'long press completed',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      await long_pressLogic(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 100,
          y: 200,
          duration: 1500,
        },
        trackingExecutor,
        () => '/usr/local/bin/axe',
        () => ({}),
      );

      expect(capturedCommand).toEqual([
        '/usr/local/bin/axe',
        'touch',
        '-x',
        '100',
        '-y',
        '200',
        '--down',
        '--up',
        '--delay',
        '1.5',
        '--udid',
        '12345678-1234-1234-1234-123456789012',
      ]);
    });

    it('should generate correct axe command for long press with different coordinates', async () => {
      let capturedCommand: string[] = [];
      const trackingExecutor = async (command: string[]) => {
        capturedCommand = command;
        return {
          success: true,
          output: 'long press completed',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      await long_pressLogic(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 50,
          y: 75,
          duration: 2000,
        },
        trackingExecutor,
        () => '/usr/local/bin/axe',
        () => ({}),
      );

      expect(capturedCommand).toEqual([
        '/usr/local/bin/axe',
        'touch',
        '-x',
        '50',
        '-y',
        '75',
        '--down',
        '--up',
        '--delay',
        '2',
        '--udid',
        '12345678-1234-1234-1234-123456789012',
      ]);
    });

    it('should generate correct axe command for short duration long press', async () => {
      let capturedCommand: string[] = [];
      const trackingExecutor = async (command: string[]) => {
        capturedCommand = command;
        return {
          success: true,
          output: 'long press completed',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      await long_pressLogic(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 300,
          y: 400,
          duration: 500,
        },
        trackingExecutor,
        () => '/usr/local/bin/axe',
        () => ({}),
      );

      expect(capturedCommand).toEqual([
        '/usr/local/bin/axe',
        'touch',
        '-x',
        '300',
        '-y',
        '400',
        '--down',
        '--up',
        '--delay',
        '0.5',
        '--udid',
        '12345678-1234-1234-1234-123456789012',
      ]);
    });

    it('should generate correct axe command with bundled axe path', async () => {
      let capturedCommand: string[] = [];
      const trackingExecutor = async (command: string[]) => {
        capturedCommand = command;
        return {
          success: true,
          output: 'long press completed',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      await long_pressLogic(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 150,
          y: 250,
          duration: 3000,
        },
        trackingExecutor,
        () => '/path/to/bundled/axe',
        () => ({ AXE_PATH: '/some/path' }),
      );

      expect(capturedCommand).toEqual([
        '/path/to/bundled/axe',
        'touch',
        '-x',
        '150',
        '-y',
        '250',
        '--down',
        '--up',
        '--delay',
        '3',
        '--udid',
        '12345678-1234-1234-1234-123456789012',
      ]);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return error for missing simulatorUuid', async () => {
      const result = await long_pressLogic(
        { x: 100, y: 200, duration: 1500 },
        createNoopExecutor(),
        () => '/usr/local/bin/axe',
        () => ({}),
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'simulatorUuid' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should return error for missing x', async () => {
      const result = await long_pressLogic(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          y: 200,
          duration: 1500,
        },
        createNoopExecutor(),
        () => '/usr/local/bin/axe',
        () => ({}),
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'x' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should return error for missing y', async () => {
      const result = await long_pressLogic(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 100,
          duration: 1500,
        },
        createNoopExecutor(),
        () => '/usr/local/bin/axe',
        () => ({}),
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'y' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should return error for missing duration', async () => {
      const result = await long_pressLogic(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 100,
          y: 200,
        },
        createNoopExecutor(),
        () => '/usr/local/bin/axe',
        () => ({}),
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'duration' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should return success for valid long press execution', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'long press completed',
        error: '',
      });

      const mockGetAxePath = () => '/usr/local/bin/axe';
      const mockGetBundledAxeEnvironment = () => ({});

      const result = await long_pressLogic(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 100,
          y: 200,
          duration: 1500,
        },
        mockExecutor,
        mockGetAxePath,
        mockGetBundledAxeEnvironment,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Long press at (100, 200) for 1500ms simulated successfully.\n\nWarning: describe_ui has not been called yet. Consider using describe_ui for precise coordinates instead of guessing from screenshots.',
          },
        ],
        isError: false,
      });
    });

    it('should handle DependencyError when axe is not available', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: '',
        error: undefined,
        process: { pid: 12345 },
      });

      // Mock getAxePath to return null (axe not found)
      const mockGetAxePath = () => null;
      const mockGetBundledAxeEnvironment = () => ({});

      const result = await long_pressLogic(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 100,
          y: 200,
          duration: 1500,
        },
        mockExecutor,
        mockGetAxePath,
        mockGetBundledAxeEnvironment,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Bundled axe tool not found. UI automation features are not available.\n\nThis is likely an installation issue with the npm package.\nPlease reinstall xcodebuildmcp or report this issue.',
          },
        ],
        isError: true,
      });
    });

    it('should handle AxeError from failed command execution', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'axe command failed',
        process: { pid: 12345 },
      });

      // Mock the utility functions
      const mockGetAxePath = () => '/usr/local/bin/axe';
      const mockGetBundledAxeEnvironment = () => ({});

      const result = await long_pressLogic(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 100,
          y: 200,
          duration: 1500,
        },
        mockExecutor,
        mockGetAxePath,
        mockGetBundledAxeEnvironment,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Error: Failed to simulate long press at (100, 200): axe command 'touch' failed.\nDetails: axe command failed",
          },
        ],
        isError: true,
      });
    });

    it('should handle SystemError from command execution', async () => {
      const mockExecutor = () => {
        throw new Error('ENOENT: no such file or directory');
      };

      const mockGetAxePath = () => '/usr/local/bin/axe';
      const mockGetBundledAxeEnvironment = () => ({});

      const result = await long_pressLogic(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 100,
          y: 200,
          duration: 1500,
        },
        mockExecutor,
        mockGetAxePath,
        mockGetBundledAxeEnvironment,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: expect.stringContaining(
              'Error: System error executing axe: Failed to execute axe command: ENOENT: no such file or directory',
            ),
          },
        ],
        isError: true,
      });
    });

    it('should handle unexpected Error objects', async () => {
      const mockExecutor = () => {
        throw new Error('Unexpected error');
      };

      const mockGetAxePath = () => '/usr/local/bin/axe';
      const mockGetBundledAxeEnvironment = () => ({});

      const result = await long_pressLogic(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 100,
          y: 200,
          duration: 1500,
        },
        mockExecutor,
        mockGetAxePath,
        mockGetBundledAxeEnvironment,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: expect.stringContaining(
              'Error: System error executing axe: Failed to execute axe command: Unexpected error',
            ),
          },
        ],
        isError: true,
      });
    });

    it('should handle unexpected string errors', async () => {
      const mockExecutor = () => {
        throw 'String error';
      };

      const mockGetAxePath = () => '/usr/local/bin/axe';
      const mockGetBundledAxeEnvironment = () => ({});

      const result = await long_pressLogic(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 100,
          y: 200,
          duration: 1500,
        },
        mockExecutor,
        mockGetAxePath,
        mockGetBundledAxeEnvironment,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: System error executing axe: Failed to execute axe command: String error',
          },
        ],
        isError: true,
      });
    });
  });
});
