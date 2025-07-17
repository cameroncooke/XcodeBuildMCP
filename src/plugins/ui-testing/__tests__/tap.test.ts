/**
 * Tests for tap plugin
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../../utils/command.js';

// Mock the axe helper functions before importing the plugin
vi.mock('../../../utils/axe-helpers.js', () => ({
  getAxePath: vi.fn(() => '/mocked/axe/path'),
  getBundledAxeEnvironment: vi.fn(() => ({ SOME_ENV: 'value' })),
  areAxeToolsAvailable: vi.fn(() => true),
  createAxeNotAvailableResponse: vi.fn(() => ({
    content: [
      {
        type: 'text',
        text: 'Bundled axe tool not found. UI automation features are not available.\n\nThis is likely an installation issue with the npm package.\nPlease reinstall xcodebuildmcp or report this issue.',
      },
    ],
    isError: true,
  })),
}));

import tapPlugin from '../tap.ts';
import {
  getAxePath,
  getBundledAxeEnvironment,
  areAxeToolsAvailable,
  createAxeNotAvailableResponse,
} from '../../../utils/axe-helpers.js';

describe('Tap Plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mocks to their default values
    vi.mocked(getAxePath).mockReturnValue('/mocked/axe/path');
    vi.mocked(getBundledAxeEnvironment).mockReturnValue({ SOME_ENV: 'value' });
    vi.mocked(areAxeToolsAvailable).mockReturnValue(true);
    vi.mocked(createAxeNotAvailableResponse).mockReturnValue({
      content: [
        {
          type: 'text',
          text: 'Bundled axe tool not found. UI automation features are not available.\n\nThis is likely an installation issue with the npm package.\nPlease reinstall xcodebuildmcp or report this issue.',
        },
      ],
      isError: true,
    });
  });

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

      await tapPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 100,
          y: 200,
        },
        wrappedExecutor,
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

      await tapPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 150,
          y: 300,
          preDelay: 0.5,
        },
        wrappedExecutor,
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

      await tapPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 250,
          y: 400,
          postDelay: 1.0,
        },
        wrappedExecutor,
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

      await tapPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 350,
          y: 500,
          preDelay: 0.3,
          postDelay: 0.7,
        },
        wrappedExecutor,
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

      const result = await tapPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 100,
          y: 200,
        },
        mockExecutor,
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

      const result = await tapPlugin.handler(
        {
          simulatorUuid: '87654321-4321-4321-4321-210987654321',
          x: 150,
          y: 300,
        },
        mockExecutor,
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

      const result = await tapPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 250,
          y: 400,
          preDelay: 0.5,
          postDelay: 1.0,
        },
        mockExecutor,
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

      const result = await tapPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 0,
          y: 0,
        },
        mockExecutor,
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

      const result = await tapPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 1920,
          y: 1080,
        },
        mockExecutor,
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

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return error for missing simulatorUuid', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: '' });

      const result = await tapPlugin.handler(
        {
          x: 100,
          y: 200,
        },
        mockExecutor,
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

    it('should return error for missing x coordinate', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: '' });

      const result = await tapPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          y: 200,
        },
        mockExecutor,
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

    it('should return error for missing y coordinate', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: '' });

      const result = await tapPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 100,
        },
        mockExecutor,
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

    it('should return DependencyError when axe binary is not found', async () => {
      // Mock getAxePath to return null for this test
      vi.mocked(getAxePath).mockReturnValueOnce(null);

      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Tap completed',
        error: undefined,
      });

      const result = await tapPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 100,
          y: 200,
          preDelay: 0.5,
          postDelay: 1.0,
        },
        mockExecutor,
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
      // Mock getAxePath to return null for this test
      vi.mocked(getAxePath).mockReturnValueOnce(null);

      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'Coordinates out of bounds',
      });

      const result = await tapPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 100,
          y: 200,
        },
        mockExecutor,
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
      // Mock getAxePath to return null for this test
      vi.mocked(getAxePath).mockReturnValueOnce(null);

      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'System error occurred',
      });

      const result = await tapPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 100,
          y: 200,
        },
        mockExecutor,
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
      // Mock getAxePath to return null for this test
      vi.mocked(getAxePath).mockReturnValueOnce(null);

      const mockExecutor = async () => {
        throw new Error('ENOENT: no such file or directory');
      };

      const result = await tapPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 100,
          y: 200,
        },
        mockExecutor,
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
      // Mock getAxePath to return null for this test
      vi.mocked(getAxePath).mockReturnValueOnce(null);

      const mockExecutor = async () => {
        throw new Error('Unexpected error');
      };

      const result = await tapPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 100,
          y: 200,
        },
        mockExecutor,
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
      // Mock getAxePath to return null for this test
      vi.mocked(getAxePath).mockReturnValueOnce(null);

      const mockExecutor = async () => {
        throw 'String error';
      };

      const result = await tapPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 100,
          y: 200,
        },
        mockExecutor,
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
