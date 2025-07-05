/**
 * Tests for swipe tool plugin
 */

import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { z } from 'zod';
import swipePlugin from './swipe.ts';

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

describe('Swipe Plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return error for missing simulatorUuid', async () => {
      (validateRequiredParam as MockedFunction<typeof validateRequiredParam>).mockReturnValueOnce({
        isValid: false,
        errorResponse: {
          content: [{ type: 'text', text: 'Missing required parameter: simulatorUuid' }],
          isError: true,
        },
      });

      const result = await swipePlugin.handler({ x1: 100, y1: 200, x2: 300, y2: 400 });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Missing required parameter: simulatorUuid' }],
        isError: true,
      });
    });

    it('should return error for missing x1', async () => {
      (validateRequiredParam as MockedFunction<typeof validateRequiredParam>)
        .mockReturnValueOnce({ isValid: true })
        .mockReturnValueOnce({
          isValid: false,
          errorResponse: {
            content: [{ type: 'text', text: 'Missing required parameter: x1' }],
            isError: true,
          },
        });

      const result = await swipePlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        y1: 200,
        x2: 300,
        y2: 400,
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Missing required parameter: x1' }],
        isError: true,
      });
    });

    it('should return success for valid swipe execution', async () => {
      (validateRequiredParam as MockedFunction<typeof validateRequiredParam>).mockReturnValue({
        isValid: true,
      });
      (getAxePath as MockedFunction<typeof getAxePath>).mockReturnValue('/usr/local/bin/axe');
      (getBundledAxeEnvironment as MockedFunction<typeof getBundledAxeEnvironment>).mockReturnValue(
        {},
      );
      (executeCommand as MockedFunction<typeof executeCommand>).mockResolvedValue({
        success: true,
        output: 'swipe completed',
        error: '',
      });
      (createTextResponse as MockedFunction<typeof createTextResponse>).mockReturnValue({
        content: [
          {
            type: 'text',
            text: 'Swipe from (100, 200) to (300, 400) simulated successfully.\n\nWarning: describe_ui has not been called yet. Consider using describe_ui for precise coordinates instead of guessing from screenshots.',
          },
        ],
        isError: false,
      });

      const result = await swipePlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        x1: 100,
        y1: 200,
        x2: 300,
        y2: 400,
      });

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
      (validateRequiredParam as MockedFunction<typeof validateRequiredParam>).mockReturnValue({
        isValid: true,
      });
      (getAxePath as MockedFunction<typeof getAxePath>).mockReturnValue('/usr/local/bin/axe');
      (getBundledAxeEnvironment as MockedFunction<typeof getBundledAxeEnvironment>).mockReturnValue(
        {},
      );
      (executeCommand as MockedFunction<typeof executeCommand>).mockResolvedValue({
        success: true,
        output: 'swipe completed',
        error: '',
      });
      (createTextResponse as MockedFunction<typeof createTextResponse>).mockReturnValue({
        content: [
          {
            type: 'text',
            text: 'Swipe from (100, 200) to (300, 400) duration=1.5s simulated successfully.\n\nWarning: describe_ui has not been called yet. Consider using describe_ui for precise coordinates instead of guessing from screenshots.',
          },
        ],
        isError: false,
      });

      const result = await swipePlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        x1: 100,
        y1: 200,
        x2: 300,
        y2: 400,
        duration: 1.5,
      });

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

      const result = await swipePlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        x1: 100,
        y1: 200,
        x2: 300,
        y2: 400,
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
        content: [{ type: 'text', text: "Failed to simulate swipe: axe command 'swipe' failed." }],
        isError: true,
      });

      const result = await swipePlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        x1: 100,
        y1: 200,
        x2: 300,
        y2: 400,
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: "Failed to simulate swipe: axe command 'swipe' failed." }],
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

      const result = await swipePlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        x1: 100,
        y1: 200,
        x2: 300,
        y2: 400,
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

      const result = await swipePlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        x1: 100,
        y1: 200,
        x2: 300,
        y2: 400,
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

      const result = await swipePlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        x1: 100,
        y1: 200,
        x2: 300,
        y2: 400,
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'An unexpected error occurred: String error' }],
        isError: true,
      });
    });
  });
});
