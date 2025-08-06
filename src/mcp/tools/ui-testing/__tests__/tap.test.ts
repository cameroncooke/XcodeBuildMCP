/**
 * Tests for tap plugin
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../../../utils/command.js';

import tapPlugin, { AxeHelpers, tapLogic } from '../tap.ts';

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

describe('Tap Plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(tapPlugin.name).toBe('tap');
    });

    it('should have correct description', () => {
      expect(tapPlugin.description).toBe(
        "Tap at specific coordinates. Use describe_ui to get precise element coordinates (don't guess from screenshots). Supports optional timing delays.",
      );
    });

    it('should have handler function', () => {
      expect(typeof tapPlugin.handler).toBe('function');
    });

    it('should validate schema fields with safeParse', () => {
      const schema = z.object(tapPlugin.schema);

      // Valid case
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 100,
          y: 200,
        }).success,
      ).toBe(true);

      // Invalid simulatorUuid
      expect(
        schema.safeParse({
          simulatorUuid: 'invalid-uuid',
          x: 100,
          y: 200,
        }).success,
      ).toBe(false);

      // Invalid x coordinate - non-integer
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 3.14,
          y: 200,
        }).success,
      ).toBe(false);

      // Invalid y coordinate - non-integer
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 100,
          y: 3.14,
        }).success,
      ).toBe(false);

      // Invalid preDelay - negative
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 100,
          y: 200,
          preDelay: -1,
        }).success,
      ).toBe(false);

      // Invalid postDelay - negative
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 100,
          y: 200,
          postDelay: -1,
        }).success,
      ).toBe(false);

      // Valid with optional delays
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 100,
          y: 200,
          preDelay: 0.5,
          postDelay: 1.0,
        }).success,
      ).toBe(true);

      // Missing required fields
      expect(schema.safeParse({}).success).toBe(false);
    });
  });

  describe('Command Generation', () => {
    let callHistory: Array<{
      command: string[];
      logPrefix?: string;
      useShell?: boolean;
      env?: Record<string, string>;
    }>;

    beforeEach(() => {
      callHistory = [];
    });

    it('should generate correct axe command with minimal parameters', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Tap completed',
      });

      const wrappedExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        callHistory.push({ command, logPrefix, useShell, env });
        return mockExecutor(command, logPrefix, useShell, env);
      };

      const mockAxeHelpers = createMockAxeHelpers();

      await tapLogic(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 100,
          y: 200,
        },
        wrappedExecutor,
        mockAxeHelpers,
      );

      expect(callHistory).toHaveLength(1);
      expect(callHistory[0]).toEqual({
        command: [
          '/mocked/axe/path',
          'tap',
          '-x',
          '100',
          '-y',
          '200',
          '--udid',
          '12345678-1234-1234-1234-123456789012',
        ],
        logPrefix: '[AXe]: tap',
        useShell: false,
        env: { SOME_ENV: 'value' },
      });
    });

    it('should generate correct axe command with pre-delay', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Tap completed',
      });

      const wrappedExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        callHistory.push({ command, logPrefix, useShell, env });
        return mockExecutor(command, logPrefix, useShell, env);
      };

      const mockAxeHelpers = createMockAxeHelpers();

      await tapLogic(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 150,
          y: 300,
          preDelay: 0.5,
        },
        wrappedExecutor,
        mockAxeHelpers,
      );

      expect(callHistory).toHaveLength(1);
      expect(callHistory[0]).toEqual({
        command: [
          '/mocked/axe/path',
          'tap',
          '-x',
          '150',
          '-y',
          '300',
          '--pre-delay',
          '0.5',
          '--udid',
          '12345678-1234-1234-1234-123456789012',
        ],
        logPrefix: '[AXe]: tap',
        useShell: false,
        env: { SOME_ENV: 'value' },
      });
    });

    it('should generate correct axe command with post-delay', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Tap completed',
      });

      const wrappedExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        callHistory.push({ command, logPrefix, useShell, env });
        return mockExecutor(command, logPrefix, useShell, env);
      };

      const mockAxeHelpers = createMockAxeHelpers();

      await tapLogic(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 250,
          y: 400,
          postDelay: 1.0,
        },
        wrappedExecutor,
        mockAxeHelpers,
      );

      expect(callHistory).toHaveLength(1);
      expect(callHistory[0]).toEqual({
        command: [
          '/mocked/axe/path',
          'tap',
          '-x',
          '250',
          '-y',
          '400',
          '--post-delay',
          '1',
          '--udid',
          '12345678-1234-1234-1234-123456789012',
        ],
        logPrefix: '[AXe]: tap',
        useShell: false,
        env: { SOME_ENV: 'value' },
      });
    });

    it('should generate correct axe command with both delays', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Tap completed',
      });

      const wrappedExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        callHistory.push({ command, logPrefix, useShell, env });
        return mockExecutor(command, logPrefix, useShell, env);
      };

      const mockAxeHelpers = createMockAxeHelpers();

      await tapLogic(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 350,
          y: 500,
          preDelay: 0.3,
          postDelay: 0.7,
        },
        wrappedExecutor,
        mockAxeHelpers,
      );

      expect(callHistory).toHaveLength(1);
      expect(callHistory[0]).toEqual({
        command: [
          '/mocked/axe/path',
          'tap',
          '-x',
          '350',
          '-y',
          '500',
          '--pre-delay',
          '0.3',
          '--post-delay',
          '0.7',
          '--udid',
          '12345678-1234-1234-1234-123456789012',
        ],
        logPrefix: '[AXe]: tap',
        useShell: false,
        env: { SOME_ENV: 'value' },
      });
    });
  });

  describe('Success Response Processing', () => {
    it('should return successful response for basic tap', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Tap completed',
      });

      const mockAxeHelpers = createMockAxeHelpers();

      const result = await tapLogic(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 100,
          y: 200,
        },
        mockExecutor,
        mockAxeHelpers,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Tap at (100, 200) simulated successfully.\n\nWarning: describe_ui has not been called yet. Consider using describe_ui for precise coordinates instead of guessing from screenshots.',
          },
        ],
        isError: false,
      });
    });

    it('should return successful response with coordinate warning when describe_ui not called', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Tap completed',
      });

      const mockAxeHelpers = createMockAxeHelpers();

      const result = await tapLogic(
        {
          simulatorUuid: '87654321-4321-4321-4321-210987654321',
          x: 150,
          y: 300,
        },
        mockExecutor,
        mockAxeHelpers,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Tap at (150, 300) simulated successfully.\n\nWarning: describe_ui has not been called yet. Consider using describe_ui for precise coordinates instead of guessing from screenshots.',
          },
        ],
        isError: false,
      });
    });

    it('should return successful response with delays', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Tap completed',
      });

      const mockAxeHelpers = createMockAxeHelpers();

      const result = await tapLogic(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 250,
          y: 400,
          preDelay: 0.5,
          postDelay: 1.0,
        },
        mockExecutor,
        mockAxeHelpers,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Tap at (250, 400) simulated successfully.\n\nWarning: describe_ui has not been called yet. Consider using describe_ui for precise coordinates instead of guessing from screenshots.',
          },
        ],
        isError: false,
      });
    });

    it('should return successful response with integer coordinates', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Tap completed',
      });

      const mockAxeHelpers = createMockAxeHelpers();

      const result = await tapLogic(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 0,
          y: 0,
        },
        mockExecutor,
        mockAxeHelpers,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Tap at (0, 0) simulated successfully.\n\nWarning: describe_ui has not been called yet. Consider using describe_ui for precise coordinates instead of guessing from screenshots.',
          },
        ],
        isError: false,
      });
    });

    it('should return successful response with large coordinates', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Tap completed',
      });

      const mockAxeHelpers = createMockAxeHelpers();

      const result = await tapLogic(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 1920,
          y: 1080,
        },
        mockExecutor,
        mockAxeHelpers,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Tap at (1920, 1080) simulated successfully.\n\nWarning: describe_ui has not been called yet. Consider using describe_ui for precise coordinates instead of guessing from screenshots.',
          },
        ],
        isError: false,
      });
    });
  });

  describe('Plugin Handler Validation', () => {
    it('should return Zod validation error for missing simulatorUuid', async () => {
      const result = await tapPlugin.handler({
        x: 100,
        y: 200,
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Parameter validation failed\nDetails: Invalid parameters:\nsimulatorUuid: Required',
          },
        ],
        isError: true,
      });
    });

    it('should return Zod validation error for missing x coordinate', async () => {
      const result = await tapPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        y: 200,
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Parameter validation failed\nDetails: Invalid parameters:\nx: Required',
          },
        ],
        isError: true,
      });
    });

    it('should return Zod validation error for missing y coordinate', async () => {
      const result = await tapPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        x: 100,
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Parameter validation failed\nDetails: Invalid parameters:\ny: Required',
          },
        ],
        isError: true,
      });
    });

    it('should return Zod validation error for invalid UUID format', async () => {
      const result = await tapPlugin.handler({
        simulatorUuid: 'invalid-uuid',
        x: 100,
        y: 200,
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Parameter validation failed\nDetails: Invalid parameters:\nsimulatorUuid: Invalid Simulator UUID format',
          },
        ],
        isError: true,
      });
    });

    it('should return Zod validation error for non-integer x coordinate', async () => {
      const result = await tapPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        x: 3.14,
        y: 200,
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Parameter validation failed\nDetails: Invalid parameters:\nx: X coordinate must be an integer',
          },
        ],
        isError: true,
      });
    });

    it('should return Zod validation error for non-integer y coordinate', async () => {
      const result = await tapPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        x: 100,
        y: 3.14,
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Parameter validation failed\nDetails: Invalid parameters:\ny: Y coordinate must be an integer',
          },
        ],
        isError: true,
      });
    });

    it('should return Zod validation error for negative preDelay', async () => {
      const result = await tapPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        x: 100,
        y: 200,
        preDelay: -1,
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Parameter validation failed\nDetails: Invalid parameters:\npreDelay: Pre-delay must be non-negative',
          },
        ],
        isError: true,
      });
    });

    it('should return Zod validation error for negative postDelay', async () => {
      const result = await tapPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        x: 100,
        y: 200,
        postDelay: -1,
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Parameter validation failed\nDetails: Invalid parameters:\npostDelay: Post-delay must be non-negative',
          },
        ],
        isError: true,
      });
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return DependencyError when axe binary is not found', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Tap completed',
        error: undefined,
      });

      const mockAxeHelpers = createMockAxeHelpersWithNullPath();

      const result = await tapLogic(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 100,
          y: 200,
          preDelay: 0.5,
          postDelay: 1.0,
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

    it('should handle DependencyError when axe binary not found (second test)', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'Coordinates out of bounds',
      });

      const mockAxeHelpers = createMockAxeHelpersWithNullPath();

      const result = await tapLogic(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 100,
          y: 200,
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

    it('should handle DependencyError when axe binary not found (third test)', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'System error occurred',
      });

      const mockAxeHelpers = createMockAxeHelpersWithNullPath();

      const result = await tapLogic(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 100,
          y: 200,
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

    it('should handle DependencyError when axe binary not found (fourth test)', async () => {
      const mockExecutor = async () => {
        throw new Error('ENOENT: no such file or directory');
      };

      const mockAxeHelpers = createMockAxeHelpersWithNullPath();

      const result = await tapLogic(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 100,
          y: 200,
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

    it('should handle DependencyError when axe binary not found (fifth test)', async () => {
      const mockExecutor = async () => {
        throw new Error('Unexpected error');
      };

      const mockAxeHelpers = createMockAxeHelpersWithNullPath();

      const result = await tapLogic(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 100,
          y: 200,
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

    it('should handle DependencyError when axe binary not found (sixth test)', async () => {
      const mockExecutor = async () => {
        throw 'String error';
      };

      const mockAxeHelpers = createMockAxeHelpersWithNullPath();

      const result = await tapLogic(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 100,
          y: 200,
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
  });
});
