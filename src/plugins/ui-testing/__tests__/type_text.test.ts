/**
 * Tests for type_text plugin
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../../utils/command.js';
import typeTextPlugin from '../type_text.ts';

// Mock axe helpers for dependency injection
function createMockAxeHelpers(
  overrides: {
    getAxePathReturn?: string | null;
    getBundledAxeEnvironmentReturn?: Record<string, string>;
  } = {},
) {
  return {
    getAxePath: () => {
      return Object.prototype.hasOwnProperty.call(overrides, 'getAxePathReturn')
        ? overrides.getAxePathReturn
        : '/usr/local/bin/axe';
    },
    getBundledAxeEnvironment: () => overrides.getBundledAxeEnvironmentReturn ?? {},
  };
}

// Mock executor that tracks rejections for testing
function createRejectingExecutor(error: any) {
  return async () => {
    throw error;
  };
}

describe('Type Text Plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(typeTextPlugin.name).toBe('type_text');
    });

    it('should have correct description', () => {
      expect(typeTextPlugin.description).toBe(
        'Type text (supports US keyboard characters). Use describe_ui to find text field, tap to focus, then type.',
      );
    });

    it('should have handler function', () => {
      expect(typeof typeTextPlugin.handler).toBe('function');
    });

    it('should validate schema fields with safeParse', () => {
      const schema = z.object(typeTextPlugin.schema);

      // Valid case
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          text: 'Hello World',
        }).success,
      ).toBe(true);

      // Invalid simulatorUuid
      expect(
        schema.safeParse({
          simulatorUuid: 'invalid-uuid',
          text: 'Hello World',
        }).success,
      ).toBe(false);

      // Invalid text - empty string
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          text: '',
        }).success,
      ).toBe(false);

      // Invalid text - non-string
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          text: 123,
        }).success,
      ).toBe(false);

      // Missing required fields
      expect(schema.safeParse({}).success).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return error for missing simulatorUuid', async () => {
      const result = await typeTextPlugin.handler({
        text: 'Hello World',
      });

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

    it('should return error for missing text', async () => {
      const result = await typeTextPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'text' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should return success for valid text typing', async () => {
      const mockAxeHelpers = createMockAxeHelpers({
        getAxePathReturn: '/usr/local/bin/axe',
        getBundledAxeEnvironmentReturn: {},
      });

      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Text typed successfully',
        error: undefined,
      });

      const result = await typeTextPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          text: 'Hello World',
        },
        mockExecutor,
        mockAxeHelpers,
      );

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Text typing simulated successfully.' }],
        isError: false,
      });
    });

    it('should handle DependencyError when axe binary not found', async () => {
      const mockAxeHelpers = createMockAxeHelpers({
        getAxePathReturn: null,
      });

      const result = await typeTextPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          text: 'Hello World',
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

    it('should handle AxeError from command execution', async () => {
      const mockAxeHelpers = createMockAxeHelpers({
        getAxePathReturn: '/usr/local/bin/axe',
        getBundledAxeEnvironmentReturn: {},
      });

      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'Text field not found',
      });

      const result = await typeTextPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          text: 'Hello World',
        },
        mockExecutor,
        mockAxeHelpers,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Error: Failed to simulate text typing: axe command 'type' failed.\nDetails: Text field not found",
          },
        ],
        isError: true,
      });
    });

    it('should handle SystemError from command execution', async () => {
      const mockAxeHelpers = createMockAxeHelpers({
        getAxePathReturn: '/usr/local/bin/axe',
        getBundledAxeEnvironmentReturn: {},
      });

      const mockExecutor = createRejectingExecutor(new Error('ENOENT: no such file or directory'));

      const result = await typeTextPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          text: 'Hello World',
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
      const mockAxeHelpers = createMockAxeHelpers({
        getAxePathReturn: '/usr/local/bin/axe',
        getBundledAxeEnvironmentReturn: {},
      });

      const mockExecutor = createRejectingExecutor(new Error('Unexpected error'));

      const result = await typeTextPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          text: 'Hello World',
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
      const mockAxeHelpers = createMockAxeHelpers({
        getAxePathReturn: '/usr/local/bin/axe',
        getBundledAxeEnvironmentReturn: {},
      });

      const mockExecutor = createRejectingExecutor('String error');

      const result = await typeTextPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          text: 'Hello World',
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
