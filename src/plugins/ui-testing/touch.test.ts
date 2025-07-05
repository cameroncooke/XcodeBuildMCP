/**
 * Tests for touch tool plugin
 */

import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { z } from 'zod';
import touchPlugin from './touch.ts';

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

describe('Touch Plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(touchPlugin.name).toBe('touch');
    });

    it('should have correct description', () => {
      expect(touchPlugin.description).toBe(
        "Perform touch down/up events at specific coordinates. Use describe_ui for precise coordinates (don't guess from screenshots).",
      );
    });

    it('should have handler function', () => {
      expect(typeof touchPlugin.handler).toBe('function');
    });

    it('should validate schema fields with safeParse', () => {
      const schema = z.object(touchPlugin.schema);

      // Valid case with down
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 100,
          y: 200,
          down: true,
        }).success,
      ).toBe(true);

      // Valid case with up
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 100,
          y: 200,
          up: true,
        }).success,
      ).toBe(true);

      // Invalid simulatorUuid
      expect(
        schema.safeParse({
          simulatorUuid: 'invalid-uuid',
          x: 100,
          y: 200,
          down: true,
        }).success,
      ).toBe(false);

      // Invalid x (not integer)
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 100.5,
          y: 200,
          down: true,
        }).success,
      ).toBe(false);

      // Invalid y (not integer)
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 100,
          y: 200.5,
          down: true,
        }).success,
      ).toBe(false);

      // Valid with delay
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 100,
          y: 200,
          down: true,
          delay: 1.5,
        }).success,
      ).toBe(true);

      // Invalid delay (negative)
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 100,
          y: 200,
          down: true,
          delay: -1,
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

      const result = await touchPlugin.handler({ x: 100, y: 200, down: true });

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

      const result = await touchPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        y: 200,
        down: true,
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

      const result = await touchPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        x: 100,
        down: true,
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Missing required parameter: y' }],
        isError: true,
      });
    });

    it('should return error when neither down nor up is specified', async () => {
      (validateRequiredParam as MockedFunction<typeof validateRequiredParam>).mockReturnValue({
        isValid: true,
      });
      (createErrorResponse as MockedFunction<typeof createErrorResponse>).mockReturnValue({
        content: [{ type: 'text', text: 'At least one of "down" or "up" must be true' }],
        isError: true,
      });

      const result = await touchPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        x: 100,
        y: 200,
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'At least one of "down" or "up" must be true' }],
        isError: true,
      });
    });

    it('should return success for touch down event', async () => {
      (validateRequiredParam as MockedFunction<typeof validateRequiredParam>).mockReturnValue({
        isValid: true,
      });
      (getAxePath as MockedFunction<typeof getAxePath>).mockReturnValue('/usr/local/bin/axe');
      (getBundledAxeEnvironment as MockedFunction<typeof getBundledAxeEnvironment>).mockReturnValue(
        {},
      );
      (executeCommand as MockedFunction<typeof executeCommand>).mockResolvedValue({
        success: true,
        output: 'touch completed',
        error: '',
      });
      (createTextResponse as MockedFunction<typeof createTextResponse>).mockReturnValue({
        content: [
          {
            type: 'text',
            text: 'Touch event (touch down) at (100, 200) executed successfully.\n\nWarning: describe_ui has not been called yet. Consider using describe_ui for precise coordinates instead of guessing from screenshots.',
          },
        ],
        isError: false,
      });

      const result = await touchPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        x: 100,
        y: 200,
        down: true,
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Touch event (touch down) at (100, 200) executed successfully.\n\nWarning: describe_ui has not been called yet. Consider using describe_ui for precise coordinates instead of guessing from screenshots.',
          },
        ],
        isError: false,
      });
    });

    it('should return success for touch up event', async () => {
      (validateRequiredParam as MockedFunction<typeof validateRequiredParam>).mockReturnValue({
        isValid: true,
      });
      (getAxePath as MockedFunction<typeof getAxePath>).mockReturnValue('/usr/local/bin/axe');
      (getBundledAxeEnvironment as MockedFunction<typeof getBundledAxeEnvironment>).mockReturnValue(
        {},
      );
      (executeCommand as MockedFunction<typeof executeCommand>).mockResolvedValue({
        success: true,
        output: 'touch completed',
        error: '',
      });
      (createTextResponse as MockedFunction<typeof createTextResponse>).mockReturnValue({
        content: [
          {
            type: 'text',
            text: 'Touch event (touch up) at (100, 200) executed successfully.\n\nWarning: describe_ui has not been called yet. Consider using describe_ui for precise coordinates instead of guessing from screenshots.',
          },
        ],
        isError: false,
      });

      const result = await touchPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        x: 100,
        y: 200,
        up: true,
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Touch event (touch up) at (100, 200) executed successfully.\n\nWarning: describe_ui has not been called yet. Consider using describe_ui for precise coordinates instead of guessing from screenshots.',
          },
        ],
        isError: false,
      });
    });

    it('should return success for touch down+up event', async () => {
      (validateRequiredParam as MockedFunction<typeof validateRequiredParam>).mockReturnValue({
        isValid: true,
      });
      (getAxePath as MockedFunction<typeof getAxePath>).mockReturnValue('/usr/local/bin/axe');
      (getBundledAxeEnvironment as MockedFunction<typeof getBundledAxeEnvironment>).mockReturnValue(
        {},
      );
      (executeCommand as MockedFunction<typeof executeCommand>).mockResolvedValue({
        success: true,
        output: 'touch completed',
        error: '',
      });
      (createTextResponse as MockedFunction<typeof createTextResponse>).mockReturnValue({
        content: [
          {
            type: 'text',
            text: 'Touch event (touch down+up) at (100, 200) executed successfully.\n\nWarning: describe_ui has not been called yet. Consider using describe_ui for precise coordinates instead of guessing from screenshots.',
          },
        ],
        isError: false,
      });

      const result = await touchPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        x: 100,
        y: 200,
        down: true,
        up: true,
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Touch event (touch down+up) at (100, 200) executed successfully.\n\nWarning: describe_ui has not been called yet. Consider using describe_ui for precise coordinates instead of guessing from screenshots.',
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

      const result = await touchPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        x: 100,
        y: 200,
        down: true,
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
          { type: 'text', text: "Failed to execute touch event: axe command 'touch' failed." },
        ],
        isError: true,
      });

      const result = await touchPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        x: 100,
        y: 200,
        down: true,
      });

      expect(result).toEqual({
        content: [
          { type: 'text', text: "Failed to execute touch event: axe command 'touch' failed." },
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

      const result = await touchPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        x: 100,
        y: 200,
        down: true,
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

      const result = await touchPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        x: 100,
        y: 200,
        down: true,
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

      const result = await touchPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        x: 100,
        y: 200,
        down: true,
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'An unexpected error occurred: String error' }],
        isError: true,
      });
    });
  });
});
