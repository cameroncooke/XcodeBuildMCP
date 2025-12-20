/**
 * Tests for long_press tool plugin
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../../../test-utils/mock-executors.ts';
import { sessionStore } from '../../../../utils/session-store.ts';
import longPressPlugin, { long_pressLogic } from '../long_press.ts';

describe('Long Press Plugin', () => {
  beforeEach(() => {
    sessionStore.clear();
  });

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

      expect(
        schema.safeParse({
          x: 100,
          y: 200,
          duration: 1500,
        }).success,
      ).toBe(true);

      expect(
        schema.safeParse({
          x: 100.5,
          y: 200,
          duration: 1500,
        }).success,
      ).toBe(false);

      expect(
        schema.safeParse({
          x: 100,
          y: 200.5,
          duration: 1500,
        }).success,
      ).toBe(false);

      expect(
        schema.safeParse({
          x: 100,
          y: 200,
          duration: 0,
        }).success,
      ).toBe(false);

      expect(
        schema.safeParse({
          x: 100,
          y: 200,
          duration: -100,
        }).success,
      ).toBe(false);

      const withSimId = schema.safeParse({
        simulatorId: '12345678-1234-1234-1234-123456789012',
        x: 100,
        y: 200,
        duration: 1500,
      });
      expect(withSimId.success).toBe(true);
      expect('simulatorId' in (withSimId.data as Record<string, unknown>)).toBe(false);
    });
  });

  describe('Handler Requirements', () => {
    it('should require simulatorId session default', async () => {
      const result = await longPressPlugin.handler({ x: 100, y: 200, duration: 1500 });

      expect(result.isError).toBe(true);
      const message = result.content[0].text;
      expect(message).toContain('Missing required session defaults');
      expect(message).toContain('simulatorId is required');
      expect(message).toContain('session-set-defaults');
    });

    it('should surface validation errors once simulator default exists', async () => {
      sessionStore.setDefaults({ simulatorId: '12345678-1234-1234-1234-123456789012' });

      const result = await longPressPlugin.handler({ x: 100, y: 200, duration: 0 });

      expect(result.isError).toBe(true);
      const message = result.content[0].text;
      expect(message).toContain('Parameter validation failed');
      expect(message).toContain('duration: Duration of the long press in milliseconds');
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

      const mockAxeHelpers = {
        getAxePath: () => '/usr/local/bin/axe',
        getBundledAxeEnvironment: () => ({}),
        createAxeNotAvailableResponse: () => ({
          content: [{ type: 'text', text: 'Mock axe not available' }],
          isError: true,
        }),
      };

      await long_pressLogic(
        {
          simulatorId: '12345678-1234-1234-1234-123456789012',
          x: 100,
          y: 200,
          duration: 1500,
        },
        trackingExecutor,
        mockAxeHelpers,
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

      const mockAxeHelpers = {
        getAxePath: () => '/usr/local/bin/axe',
        getBundledAxeEnvironment: () => ({}),
        createAxeNotAvailableResponse: () => ({
          content: [{ type: 'text', text: 'Mock axe not available' }],
          isError: true,
        }),
      };

      await long_pressLogic(
        {
          simulatorId: '12345678-1234-1234-1234-123456789012',
          x: 50,
          y: 75,
          duration: 2000,
        },
        trackingExecutor,
        mockAxeHelpers,
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

      const mockAxeHelpers = {
        getAxePath: () => '/usr/local/bin/axe',
        getBundledAxeEnvironment: () => ({}),
        createAxeNotAvailableResponse: () => ({
          content: [{ type: 'text', text: 'Mock axe not available' }],
          isError: true,
        }),
      };

      await long_pressLogic(
        {
          simulatorId: '12345678-1234-1234-1234-123456789012',
          x: 300,
          y: 400,
          duration: 500,
        },
        trackingExecutor,
        mockAxeHelpers,
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

      const mockAxeHelpers = {
        getAxePath: () => '/path/to/bundled/axe',
        getBundledAxeEnvironment: () => ({ AXE_PATH: '/some/path' }),
        createAxeNotAvailableResponse: () => ({
          content: [{ type: 'text', text: 'Mock axe not available' }],
          isError: true,
        }),
      };

      await long_pressLogic(
        {
          simulatorId: '12345678-1234-1234-1234-123456789012',
          x: 150,
          y: 250,
          duration: 3000,
        },
        trackingExecutor,
        mockAxeHelpers,
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
    it('should return success for valid long press execution', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'long press completed',
        error: '',
      });

      const mockAxeHelpers = {
        getAxePath: () => '/usr/local/bin/axe',
        getBundledAxeEnvironment: () => ({}),
        createAxeNotAvailableResponse: () => ({
          content: [{ type: 'text', text: 'Mock axe not available' }],
          isError: true,
        }),
      };

      const result = await long_pressLogic(
        {
          simulatorId: '12345678-1234-1234-1234-123456789012',
          x: 100,
          y: 200,
          duration: 1500,
        },
        mockExecutor,
        mockAxeHelpers,
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

      const mockAxeHelpers = {
        getAxePath: () => null, // Mock axe not found
        getBundledAxeEnvironment: () => ({}),
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

      const result = await long_pressLogic(
        {
          simulatorId: '12345678-1234-1234-1234-123456789012',
          x: 100,
          y: 200,
          duration: 1500,
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
        process: { pid: 12345 },
      });

      const mockAxeHelpers = {
        getAxePath: () => '/usr/local/bin/axe',
        getBundledAxeEnvironment: () => ({}),
        createAxeNotAvailableResponse: () => ({
          content: [{ type: 'text', text: 'Mock axe not available' }],
          isError: true,
        }),
      };

      const result = await long_pressLogic(
        {
          simulatorId: '12345678-1234-1234-1234-123456789012',
          x: 100,
          y: 200,
          duration: 1500,
        },
        mockExecutor,
        mockAxeHelpers,
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

      const mockAxeHelpers = {
        getAxePath: () => '/usr/local/bin/axe',
        getBundledAxeEnvironment: () => ({}),
        createAxeNotAvailableResponse: () => ({
          content: [{ type: 'text', text: 'Mock axe not available' }],
          isError: true,
        }),
      };

      const result = await long_pressLogic(
        {
          simulatorId: '12345678-1234-1234-1234-123456789012',
          x: 100,
          y: 200,
          duration: 1500,
        },
        mockExecutor,
        mockAxeHelpers,
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

      const mockAxeHelpers = {
        getAxePath: () => '/usr/local/bin/axe',
        getBundledAxeEnvironment: () => ({}),
        createAxeNotAvailableResponse: () => ({
          content: [{ type: 'text', text: 'Mock axe not available' }],
          isError: true,
        }),
      };

      const result = await long_pressLogic(
        {
          simulatorId: '12345678-1234-1234-1234-123456789012',
          x: 100,
          y: 200,
          duration: 1500,
        },
        mockExecutor,
        mockAxeHelpers,
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

      const mockAxeHelpers = {
        getAxePath: () => '/usr/local/bin/axe',
        getBundledAxeEnvironment: () => ({}),
        createAxeNotAvailableResponse: () => ({
          content: [{ type: 'text', text: 'Mock axe not available' }],
          isError: true,
        }),
      };

      const result = await long_pressLogic(
        {
          simulatorId: '12345678-1234-1234-1234-123456789012',
          x: 100,
          y: 200,
          duration: 1500,
        },
        mockExecutor,
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
