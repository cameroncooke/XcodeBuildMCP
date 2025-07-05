/**
 * Tests for long_press tool plugin
 */

import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { z } from 'zod';
import longPressPlugin from './long_press.ts';

// Mock all utilities from the index module
vi.mock('../../src/utils/index.js', () => ({
  log: vi.fn(),
  validateRequiredParam: vi.fn(),
  createTextResponse: vi.fn(),
  createErrorResponse: vi.fn(),
  executeCommand: vi.fn(),
  createAxeNotAvailableResponse: vi.fn(),
  getAxePath: vi.fn(),
  getBundledAxeEnvironment: vi.fn(),
  DependencyError: class DependencyError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'DependencyError';
    }
  },
  AxeError: class AxeError extends Error {
    constructor(
      message: string,
      public commandName: string,
      public axeOutput: string,
      public simulatorUuid: string,
    ) {
      super(message);
      this.name = 'AxeError';
    }
  },
  SystemError: class SystemError extends Error {
    constructor(
      message: string,
      public originalError?: Error,
    ) {
      super(message);
      this.name = 'SystemError';
    }
  },
}));

// Import mocked functions
import {
  validateRequiredParam,
  createTextResponse,
  createErrorResponse,
  executeCommand,
  createAxeNotAvailableResponse,
  getAxePath,
  getBundledAxeEnvironment,
  DependencyError,
  AxeError,
  SystemError,
} from '../../utils/index.js';

describe('Long Press Plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return error for missing simulatorUuid', async () => {
      (validateRequiredParam as MockedFunction<typeof validateRequiredParam>).mockReturnValueOnce({
        isValid: false,
        errorResponse: {
          content: [{ type: 'text', text: 'Missing required parameter: simulatorUuid' }],
          isError: true,
        },
      });

      const result = await longPressPlugin.handler({ x: 100, y: 200, duration: 1500 });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Missing required parameter: simulatorUuid' }],
        isError: true,
      });
    });

    it('should return error for missing x', async () => {
      (validateRequiredParam as MockedFunction<typeof validateRequiredParam>)
        .mockReturnValueOnce({ isValid: true })
        .mockReturnValueOnce({
          isValid: false,
          errorResponse: {
            content: [{ type: 'text', text: 'Missing required parameter: x' }],
            isError: true,
          },
        });

      const result = await longPressPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        y: 200,
        duration: 1500,
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Missing required parameter: x' }],
        isError: true,
      });
    });

    it('should return error for missing y', async () => {
      (validateRequiredParam as MockedFunction<typeof validateRequiredParam>)
        .mockReturnValueOnce({ isValid: true })
        .mockReturnValueOnce({ isValid: true })
        .mockReturnValueOnce({
          isValid: false,
          errorResponse: {
            content: [{ type: 'text', text: 'Missing required parameter: y' }],
            isError: true,
          },
        });

      const result = await longPressPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        x: 100,
        duration: 1500,
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Missing required parameter: y' }],
        isError: true,
      });
    });

    it('should return error for missing duration', async () => {
      (validateRequiredParam as MockedFunction<typeof validateRequiredParam>)
        .mockReturnValueOnce({ isValid: true })
        .mockReturnValueOnce({ isValid: true })
        .mockReturnValueOnce({ isValid: true })
        .mockReturnValueOnce({
          isValid: false,
          errorResponse: {
            content: [{ type: 'text', text: 'Missing required parameter: duration' }],
            isError: true,
          },
        });

      const result = await longPressPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        x: 100,
        y: 200,
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Missing required parameter: duration' }],
        isError: true,
      });
    });

    it('should return success for valid long press execution', async () => {
      (validateRequiredParam as MockedFunction<typeof validateRequiredParam>).mockReturnValue({
        isValid: true,
      });
      (getAxePath as MockedFunction<typeof getAxePath>).mockReturnValue('/usr/local/bin/axe');
      (getBundledAxeEnvironment as MockedFunction<typeof getBundledAxeEnvironment>).mockReturnValue(
        {},
      );
      (executeCommand as MockedFunction<typeof executeCommand>).mockResolvedValue({
        success: true,
        output: 'long press completed',
        error: '',
      });
      (createTextResponse as MockedFunction<typeof createTextResponse>).mockReturnValue({
        content: [
          {
            type: 'text',
            text: 'Long press at (100, 200) for 1500ms simulated successfully.\n\nWarning: describe_ui has not been called yet. Consider using describe_ui for precise coordinates instead of guessing from screenshots.',
          },
        ],
        isError: false,
      });

      const result = await longPressPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        x: 100,
        y: 200,
        duration: 1500,
      });

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
      (validateRequiredParam as MockedFunction<typeof validateRequiredParam>).mockReturnValue({
        isValid: true,
      });
      (getAxePath as MockedFunction<typeof getAxePath>).mockReturnValue(null);
      (
        createAxeNotAvailableResponse as MockedFunction<typeof createAxeNotAvailableResponse>
      ).mockReturnValue({
        content: [{ type: 'text', text: 'AXe tools not available' }],
        isError: true,
      });

      const result = await longPressPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        x: 100,
        y: 200,
        duration: 1500,
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'AXe tools not available' }],
        isError: true,
      });
    });

    it('should handle AxeError from failed command execution', async () => {
      (validateRequiredParam as MockedFunction<typeof validateRequiredParam>).mockReturnValue({
        isValid: true,
      });
      (getAxePath as MockedFunction<typeof getAxePath>).mockReturnValue('/usr/local/bin/axe');
      (getBundledAxeEnvironment as MockedFunction<typeof getBundledAxeEnvironment>).mockReturnValue(
        {},
      );
      (executeCommand as MockedFunction<typeof executeCommand>).mockResolvedValue({
        success: false,
        output: '',
        error: 'axe command failed',
      });
      (createErrorResponse as MockedFunction<typeof createErrorResponse>).mockReturnValue({
        content: [
          {
            type: 'text',
            text: "Failed to simulate long press at (100, 200): axe command 'touch' failed.",
          },
        ],
        isError: true,
      });

      const result = await longPressPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        x: 100,
        y: 200,
        duration: 1500,
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Failed to simulate long press at (100, 200): axe command 'touch' failed.",
          },
        ],
        isError: true,
      });
    });

    it('should handle SystemError from command execution', async () => {
      (validateRequiredParam as MockedFunction<typeof validateRequiredParam>).mockReturnValue({
        isValid: true,
      });
      (getAxePath as MockedFunction<typeof getAxePath>).mockReturnValue('/usr/local/bin/axe');
      (getBundledAxeEnvironment as MockedFunction<typeof getBundledAxeEnvironment>).mockReturnValue(
        {},
      );
      (executeCommand as MockedFunction<typeof executeCommand>).mockRejectedValue(
        new SystemError('System error occurred'),
      );
      (createErrorResponse as MockedFunction<typeof createErrorResponse>).mockReturnValue({
        content: [{ type: 'text', text: 'System error executing axe: System error occurred' }],
        isError: true,
      });

      const result = await longPressPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        x: 100,
        y: 200,
        duration: 1500,
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'System error executing axe: System error occurred' }],
        isError: true,
      });
    });

    it('should handle unexpected Error objects', async () => {
      (validateRequiredParam as MockedFunction<typeof validateRequiredParam>).mockReturnValue({
        isValid: true,
      });
      (getAxePath as MockedFunction<typeof getAxePath>).mockReturnValue('/usr/local/bin/axe');
      (getBundledAxeEnvironment as MockedFunction<typeof getBundledAxeEnvironment>).mockReturnValue(
        {},
      );
      (executeCommand as MockedFunction<typeof executeCommand>).mockRejectedValue(
        new Error('Unexpected error'),
      );
      (createErrorResponse as MockedFunction<typeof createErrorResponse>).mockReturnValue({
        content: [{ type: 'text', text: 'An unexpected error occurred: Unexpected error' }],
        isError: true,
      });

      const result = await longPressPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        x: 100,
        y: 200,
        duration: 1500,
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'An unexpected error occurred: Unexpected error' }],
        isError: true,
      });
    });

    it('should handle unexpected string errors', async () => {
      (validateRequiredParam as MockedFunction<typeof validateRequiredParam>).mockReturnValue({
        isValid: true,
      });
      (getAxePath as MockedFunction<typeof getAxePath>).mockReturnValue('/usr/local/bin/axe');
      (getBundledAxeEnvironment as MockedFunction<typeof getBundledAxeEnvironment>).mockReturnValue(
        {},
      );
      (executeCommand as MockedFunction<typeof executeCommand>).mockRejectedValue('String error');
      (createErrorResponse as MockedFunction<typeof createErrorResponse>).mockReturnValue({
        content: [{ type: 'text', text: 'An unexpected error occurred: String error' }],
        isError: true,
      });

      const result = await longPressPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        x: 100,
        y: 200,
        duration: 1500,
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'An unexpected error occurred: String error' }],
        isError: true,
      });
    });
  });
});
