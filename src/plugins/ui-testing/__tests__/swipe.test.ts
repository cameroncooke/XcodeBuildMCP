/**
 * Tests for swipe tool plugin
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createMockExecutor, createNoopExecutor } from '../../../utils/command.js';
import { SystemError, DependencyError } from '../../../utils/index.js';

// Import the plugin module to test
import swipePlugin, { AxeHelpers, swipeLogic, SwipeParams } from '../swipe.ts';

// Helper function to create mock axe helpers
function createMockAxeHelpers(): AxeHelpers {
  return {
    getAxePath: () => '/mocked/axe/path',
    getBundledAxeEnvironment: () => ({ SOME_ENV: 'value' }),
    createAxeNotAvailableResponse: () => ({
      content: [
        {
          type: 'text',
          text: 'Bundled axe tool not found. UI automation features are not available.\n\nThis is likely an installation issue with the npm package.\nPlease reinstall xcodebuildmcp or report this issue.',
        },
      ],
      isError: true,
    }),
  };
}

// Helper function to create mock axe helpers with null path (for dependency error tests)
function createMockAxeHelpersWithNullPath(): AxeHelpers {
  return {
    getAxePath: () => null,
    getBundledAxeEnvironment: () => ({ SOME_ENV: 'value' }),
    createAxeNotAvailableResponse: () => ({
      content: [
        {
          type: 'text',
          text: 'Bundled axe tool not found. UI automation features are not available.\n\nThis is likely an installation issue with the npm package.\nPlease reinstall xcodebuildmcp or report this issue.',
        },
      ],
      isError: true,
    }),
  };
}

describe('Swipe Plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(swipePlugin.name).toBe('swipe');
    });

    it('should have correct description', () => {
      expect(swipePlugin.description).toBe(
        "Swipe from one point to another. Use describe_ui for precise coordinates (don't guess from screenshots). Supports configurable timing.",
      );
    });

    it('should have handler function', () => {
      expect(typeof swipePlugin.handler).toBe('function');
    });

    it('should validate schema fields with safeParse', () => {
      const schema = z.object(swipePlugin.schema);

      // Valid case
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x1: 100,
          y1: 200,
          x2: 300,
          y2: 400,
        }).success,
      ).toBe(true);

      // Invalid simulatorUuid
      expect(
        schema.safeParse({
          simulatorUuid: 'invalid-uuid',
          x1: 100,
          y1: 200,
          x2: 300,
          y2: 400,
        }).success,
      ).toBe(false);

      // Invalid x1 (not integer)
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x1: 100.5,
          y1: 200,
          x2: 300,
          y2: 400,
        }).success,
      ).toBe(false);

      // Valid with optional parameters
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x1: 100,
          y1: 200,
          x2: 300,
          y2: 400,
          duration: 1.5,
          delta: 10,
          preDelay: 0.5,
          postDelay: 0.2,
        }).success,
      ).toBe(true);

      // Invalid duration (negative)
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x1: 100,
          y1: 200,
          x2: 300,
          y2: 400,
          duration: -1,
        }).success,
      ).toBe(false);
    });
  });

  describe('Command Generation', () => {
    it('should generate correct axe command for basic swipe', async () => {
      let capturedCommand: string[] = [];
      const trackingExecutor = async (command: string[]) => {
        capturedCommand = command;
        return {
          success: true,
          output: 'swipe completed',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      const mockAxeHelpers = createMockAxeHelpers();

      await swipeLogic(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x1: 100,
          y1: 200,
          x2: 300,
          y2: 400,
        },
        trackingExecutor,
        mockAxeHelpers,
      );

      expect(capturedCommand).toEqual([
        '/mocked/axe/path',
        'swipe',
        '--start-x',
        '100',
        '--start-y',
        '200',
        '--end-x',
        '300',
        '--end-y',
        '400',
        '--udid',
        '12345678-1234-1234-1234-123456789012',
      ]);
    });

    it('should generate correct axe command for swipe with duration', async () => {
      let capturedCommand: string[] = [];
      const trackingExecutor = async (command: string[]) => {
        capturedCommand = command;
        return {
          success: true,
          output: 'swipe completed',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      const mockAxeHelpers = createMockAxeHelpers();

      await swipeLogic(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x1: 50,
          y1: 75,
          x2: 250,
          y2: 350,
          duration: 1.5,
        },
        trackingExecutor,
        mockAxeHelpers,
      );

      expect(capturedCommand).toEqual([
        '/mocked/axe/path',
        'swipe',
        '--start-x',
        '50',
        '--start-y',
        '75',
        '--end-x',
        '250',
        '--end-y',
        '350',
        '--duration',
        '1.5',
        '--udid',
        '12345678-1234-1234-1234-123456789012',
      ]);
    });

    it('should generate correct axe command for swipe with all optional parameters', async () => {
      let capturedCommand: string[] = [];
      const trackingExecutor = async (command: string[]) => {
        capturedCommand = command;
        return {
          success: true,
          output: 'swipe completed',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      const mockAxeHelpers = createMockAxeHelpers();

      await swipeLogic(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x1: 0,
          y1: 0,
          x2: 500,
          y2: 800,
          duration: 2.0,
          delta: 10,
          preDelay: 0.5,
          postDelay: 0.3,
        },
        trackingExecutor,
        mockAxeHelpers,
      );

      expect(capturedCommand).toEqual([
        '/mocked/axe/path',
        'swipe',
        '--start-x',
        '0',
        '--start-y',
        '0',
        '--end-x',
        '500',
        '--end-y',
        '800',
        '--duration',
        '2',
        '--delta',
        '10',
        '--pre-delay',
        '0.5',
        '--post-delay',
        '0.3',
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
          output: 'swipe completed',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      const mockAxeHelpers = {
        getAxePath: () => '/path/to/bundled/axe',
        getBundledAxeEnvironment: () => ({ AXE_PATH: '/some/path' }),
        createAxeNotAvailableResponse: () => ({
          content: [{ type: 'text', text: 'AXe tools not available' }],
          isError: true,
        }),
      };

      await swipeLogic(
        {
          simulatorUuid: 'ABCDEF12-3456-7890-ABCD-ABCDEFABCDEF',
          x1: 150,
          y1: 250,
          x2: 400,
          y2: 600,
          delta: 5,
        },
        trackingExecutor,
        mockAxeHelpers,
      );

      expect(capturedCommand).toEqual([
        '/path/to/bundled/axe',
        'swipe',
        '--start-x',
        '150',
        '--start-y',
        '250',
        '--end-x',
        '400',
        '--end-y',
        '600',
        '--delta',
        '5',
        '--udid',
        'ABCDEF12-3456-7890-ABCD-ABCDEFABCDEF',
      ]);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return error for missing simulatorUuid', async () => {
      const result = await swipeLogic(
        { x1: 100, y1: 200, x2: 300, y2: 400 } as SwipeParams,
        createNoopExecutor(),
        createMockAxeHelpers(),
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

    it('should return error for missing x1', async () => {
      const result = await swipeLogic(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          y1: 200,
          x2: 300,
          y2: 400,
        } as SwipeParams,
        createNoopExecutor(),
        createMockAxeHelpers(),
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'x1' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should return success for valid swipe execution', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'swipe completed',
        error: '',
      });

      const mockAxeHelpers = createMockAxeHelpers();

      const result = await swipeLogic(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x1: 100,
          y1: 200,
          x2: 300,
          y2: 400,
        },
        mockExecutor,
        mockAxeHelpers,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Swipe from (100, 200) to (300, 400) simulated successfully.\n\nWarning: describe_ui has not been called yet. Consider using describe_ui for precise coordinates instead of guessing from screenshots.',
          },
        ],
        isError: false,
      });
    });

    it('should return success for swipe with duration', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'swipe completed',
        error: '',
      });

      const mockAxeHelpers = createMockAxeHelpers();

      const result = await swipeLogic(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x1: 100,
          y1: 200,
          x2: 300,
          y2: 400,
          duration: 1.5,
        },
        mockExecutor,
        mockAxeHelpers,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Swipe from (100, 200) to (300, 400) duration=1.5s simulated successfully.\n\nWarning: describe_ui has not been called yet. Consider using describe_ui for precise coordinates instead of guessing from screenshots.',
          },
        ],
        isError: false,
      });
    });

    it('should handle DependencyError when axe is not available', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'swipe completed',
        error: '',
      });

      const mockAxeHelpers = createMockAxeHelpersWithNullPath();

      const result = await swipeLogic(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x1: 100,
          y1: 200,
          x2: 300,
          y2: 400,
        },
        mockExecutor,
        mockAxeHelpers,
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
      });

      const mockAxeHelpers = createMockAxeHelpers();

      const result = await swipeLogic(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x1: 100,
          y1: 200,
          x2: 300,
          y2: 400,
        },
        mockExecutor,
        mockAxeHelpers,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Error: Failed to simulate swipe: axe command 'swipe' failed.\nDetails: axe command failed",
          },
        ],
        isError: true,
      });
    });

    it('should handle SystemError from command execution', async () => {
      // Override the executor to throw SystemError for this test
      const systemErrorExecutor = async () => {
        throw new SystemError('System error occurred');
      };

      const mockAxeHelpers = createMockAxeHelpers();

      const result = await swipeLogic(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x1: 100,
          y1: 200,
          x2: 300,
          y2: 400,
        },
        systemErrorExecutor,
        mockAxeHelpers,
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain(
        'Error: System error executing axe: Failed to execute axe command: System error occurred',
      );
      expect(result.content[0].text).toContain('Details: SystemError: System error occurred');
    });

    it('should handle unexpected Error objects', async () => {
      // Override the executor to throw an unexpected Error for this test
      const unexpectedErrorExecutor = async () => {
        throw new Error('Unexpected error');
      };

      const mockAxeHelpers = createMockAxeHelpers();

      const result = await swipeLogic(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x1: 100,
          y1: 200,
          x2: 300,
          y2: 400,
        },
        unexpectedErrorExecutor,
        mockAxeHelpers,
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain(
        'Error: System error executing axe: Failed to execute axe command: Unexpected error',
      );
      expect(result.content[0].text).toContain('Details: Error: Unexpected error');
    });

    it('should handle unexpected string errors', async () => {
      // Override the executor to throw a string error for this test
      const stringErrorExecutor = async () => {
        throw 'String error';
      };

      const mockAxeHelpers = createMockAxeHelpers();

      const result = await swipeLogic(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x1: 100,
          y1: 200,
          x2: 300,
          y2: 400,
        },
        stringErrorExecutor,
        mockAxeHelpers,
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
