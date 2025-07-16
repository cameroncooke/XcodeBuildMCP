/**
 * Tests for gesture tool plugin
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../../utils/command.js';
import gesturePlugin from '../gesture.ts';

describe('Gesture Plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(gesturePlugin.name).toBe('gesture');
    });

    it('should have correct description', () => {
      expect(gesturePlugin.description).toBe(
        'Perform gesture on iOS simulator using preset gestures: scroll-up, scroll-down, scroll-left, scroll-right, swipe-from-left-edge, swipe-from-right-edge, swipe-from-top-edge, swipe-from-bottom-edge',
      );
    });

    it('should have handler function', () => {
      expect(typeof gesturePlugin.handler).toBe('function');
    });

    it('should validate schema fields with safeParse', () => {
      const schema = z.object(gesturePlugin.schema);

      // Valid case
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          preset: 'scroll-up',
        }).success,
      ).toBe(true);

      // Invalid simulatorUuid
      expect(
        schema.safeParse({
          simulatorUuid: 'invalid-uuid',
          preset: 'scroll-up',
        }).success,
      ).toBe(false);

      // Invalid preset
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          preset: 'invalid-preset',
        }).success,
      ).toBe(false);

      // Valid optional parameters
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          preset: 'scroll-up',
          screenWidth: 375,
          screenHeight: 667,
          duration: 1.5,
          delta: 100,
          preDelay: 0.5,
          postDelay: 0.2,
        }).success,
      ).toBe(true);

      // Invalid optional parameters
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          preset: 'scroll-up',
          screenWidth: 0,
        }).success,
      ).toBe(false);

      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          preset: 'scroll-up',
          duration: -1,
        }).success,
      ).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return error for missing simulatorUuid', async () => {
      const result = await gesturePlugin.handler({ preset: 'scroll-up' });

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

    it('should return error for missing preset', async () => {
      const result = await gesturePlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'preset' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should return success for valid gesture execution', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'gesture completed',
        error: undefined,
        process: { pid: 12345 },
      });

      const mockAxeHelpers = {
        getAxePath: () => '/usr/local/bin/axe',
        getBundledAxeEnvironment: () => ({}),
      };

      const result = await gesturePlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          preset: 'scroll-up',
        },
        mockExecutor,
        mockAxeHelpers,
      );

      expect(result).toEqual({
        content: [{ type: 'text', text: "Gesture 'scroll-up' executed successfully." }],
        isError: false,
      });
    });

    it('should return success for gesture execution with all optional parameters', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'gesture completed',
        error: undefined,
        process: { pid: 12345 },
      });

      const mockAxeHelpers = {
        getAxePath: () => '/usr/local/bin/axe',
        getBundledAxeEnvironment: () => ({}),
      };

      const result = await gesturePlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          preset: 'swipe-from-left-edge',
          screenWidth: 375,
          screenHeight: 667,
          duration: 1.0,
          delta: 50,
          preDelay: 0.1,
          postDelay: 0.2,
        },
        mockExecutor,
        mockAxeHelpers,
      );

      expect(result).toEqual({
        content: [{ type: 'text', text: "Gesture 'swipe-from-left-edge' executed successfully." }],
        isError: false,
      });
    });

    it('should handle DependencyError when axe is not available', async () => {
      const mockAxeHelpers = {
        getAxePath: () => null,
        getBundledAxeEnvironment: () => ({}),
      };

      const result = await gesturePlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          preset: 'scroll-up',
        },
        undefined,
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
      };

      const result = await gesturePlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          preset: 'scroll-up',
        },
        mockExecutor,
        mockAxeHelpers,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Error: Failed to execute gesture 'scroll-up': axe command 'gesture' failed.\nDetails: axe command failed",
          },
        ],
        isError: true,
      });
    });

    it('should handle SystemError from command execution', async () => {
      const mockExecutor = createMockExecutor(new Error('ENOENT: no such file or directory'));

      const mockAxeHelpers = {
        getAxePath: () => '/usr/local/bin/axe',
        getBundledAxeEnvironment: () => ({}),
      };

      const result = await gesturePlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          preset: 'scroll-up',
        },
        mockExecutor,
        mockAxeHelpers,
      );

      expect(result.content[0].text).toMatch(
        /^Error: System error executing axe: Failed to execute axe command: ENOENT: no such file or directory/,
      );
      expect(result.isError).toBe(true);
    });

    it('should handle unexpected Error objects', async () => {
      const mockExecutor = createMockExecutor(new Error('Unexpected error'));

      const mockAxeHelpers = {
        getAxePath: () => '/usr/local/bin/axe',
        getBundledAxeEnvironment: () => ({}),
      };

      const result = await gesturePlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          preset: 'scroll-up',
        },
        mockExecutor,
        mockAxeHelpers,
      );

      expect(result.content[0].text).toMatch(
        /^Error: System error executing axe: Failed to execute axe command: Unexpected error/,
      );
      expect(result.isError).toBe(true);
    });

    it('should handle unexpected string errors', async () => {
      const mockExecutor = createMockExecutor('String error');

      const mockAxeHelpers = {
        getAxePath: () => '/usr/local/bin/axe',
        getBundledAxeEnvironment: () => ({}),
      };

      const result = await gesturePlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          preset: 'scroll-up',
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
