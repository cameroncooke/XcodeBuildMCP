/**
 * Tests for swipe tool plugin
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as z from 'zod';
import {
  createMockExecutor,
  createNoopExecutor,
  mockProcess,
} from '../../../../test-utils/mock-executors.ts';
import { SystemError, DependencyError } from '../../../../utils/responses/index.ts';
import { sessionStore } from '../../../../utils/session-store.ts';

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
          type: 'text' as const,
          text: 'AXe tool not found. UI automation features are not available.\n\nInstall AXe (brew tap cameroncooke/axe && brew install axe) or set XCODEBUILDMCP_AXE_PATH.\nIf you installed via Smithery, ensure bundled artifacts are included or PATH is configured.',
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
          type: 'text' as const,
          text: 'AXe tool not found. UI automation features are not available.\n\nInstall AXe (brew tap cameroncooke/axe && brew install axe) or set XCODEBUILDMCP_AXE_PATH.\nIf you installed via Smithery, ensure bundled artifacts are included or PATH is configured.',
        },
      ],
      isError: true,
    }),
  };
}

describe('Swipe Plugin', () => {
  beforeEach(() => {
    sessionStore.clear();
  });
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(swipePlugin.name).toBe('swipe');
    });

    it('should have correct description', () => {
      expect(swipePlugin.description).toBe('Swipe between points.');
    });

    it('should have handler function', () => {
      expect(typeof swipePlugin.handler).toBe('function');
    });

    it('should validate schema fields with safeParse', () => {
      const schema = z.object(swipePlugin.schema);

      expect(
        schema.safeParse({
          x1: 100,
          y1: 200,
          x2: 300,
          y2: 400,
        }).success,
      ).toBe(true);

      expect(
        schema.safeParse({
          x1: 100.5,
          y1: 200,
          x2: 300,
          y2: 400,
        }).success,
      ).toBe(false);

      expect(
        schema.safeParse({
          x1: 100,
          y1: 200,
          x2: 300,
          y2: 400,
          duration: -1,
        }).success,
      ).toBe(false);

      expect(
        schema.safeParse({
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

      const withSimId = schema.safeParse({
        simulatorId: '12345678-1234-4234-8234-123456789012',
        x1: 100,
        y1: 200,
        x2: 300,
        y2: 400,
      });
      expect(withSimId.success).toBe(true);
      expect('simulatorId' in (withSimId.data as Record<string, unknown>)).toBe(false);
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
          process: mockProcess,
        };
      };

      const mockAxeHelpers = createMockAxeHelpers();

      await swipeLogic(
        {
          simulatorId: '12345678-1234-4234-8234-123456789012',
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
        '12345678-1234-4234-8234-123456789012',
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
          process: mockProcess,
        };
      };

      const mockAxeHelpers = createMockAxeHelpers();

      await swipeLogic(
        {
          simulatorId: '12345678-1234-4234-8234-123456789012',
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
        '12345678-1234-4234-8234-123456789012',
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
          process: mockProcess,
        };
      };

      const mockAxeHelpers = createMockAxeHelpers();

      await swipeLogic(
        {
          simulatorId: '12345678-1234-4234-8234-123456789012',
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
        '12345678-1234-4234-8234-123456789012',
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
          process: mockProcess,
        };
      };

      const mockAxeHelpers = {
        getAxePath: () => '/path/to/bundled/axe',
        getBundledAxeEnvironment: () => ({ AXE_PATH: '/some/path' }),
        createAxeNotAvailableResponse: () => ({
          content: [{ type: 'text' as const, text: 'AXe tools not available' }],
          isError: true,
        }),
      };

      await swipeLogic(
        {
          simulatorId: 'ABCDEF12-3456-7890-ABCD-ABCDEFABCDEF',
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
    it('should return error for missing simulatorId via handler', async () => {
      const result = await swipePlugin.handler({ x1: 100, y1: 200, x2: 300, y2: 400 });

      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Missing required session defaults');
      expect(result.content[0].text).toContain('simulatorId is required');
      expect(result.content[0].text).toContain('session-set-defaults');
    });

    it('should return validation error for missing x1 once simulator default exists', async () => {
      sessionStore.setDefaults({ simulatorId: '12345678-1234-4234-8234-123456789012' });

      const result = await swipePlugin.handler({
        y1: 200,
        x2: 300,
        y2: 400,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Parameter validation failed');
      expect(result.content[0].text).toContain(
        'x1: Invalid input: expected number, received undefined',
      );
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
          simulatorId: '12345678-1234-4234-8234-123456789012',
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
            type: 'text' as const,
            text: 'Swipe from (100, 200) to (300, 400) simulated successfully.\n\nWarning: snapshot_ui has not been called yet. Consider using snapshot_ui for precise coordinates instead of guessing from screenshots.',
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
          simulatorId: '12345678-1234-4234-8234-123456789012',
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
            type: 'text' as const,
            text: 'Swipe from (100, 200) to (300, 400) duration=1.5s simulated successfully.\n\nWarning: snapshot_ui has not been called yet. Consider using snapshot_ui for precise coordinates instead of guessing from screenshots.',
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
          simulatorId: '12345678-1234-4234-8234-123456789012',
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
            type: 'text' as const,
            text: 'AXe tool not found. UI automation features are not available.\n\nInstall AXe (brew tap cameroncooke/axe && brew install axe) or set XCODEBUILDMCP_AXE_PATH.\nIf you installed via Smithery, ensure bundled artifacts are included or PATH is configured.',
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
          simulatorId: '12345678-1234-4234-8234-123456789012',
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
            type: 'text' as const,
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
          simulatorId: '12345678-1234-4234-8234-123456789012',
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
          simulatorId: '12345678-1234-4234-8234-123456789012',
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
          simulatorId: '12345678-1234-4234-8234-123456789012',
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
            type: 'text' as const,
            text: 'Error: System error executing axe: Failed to execute axe command: String error',
          },
        ],
        isError: true,
      });
    });
  });
});
