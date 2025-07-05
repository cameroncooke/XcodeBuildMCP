/**
 * Tests for tap plugin
 */

import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { z } from 'zod';
import tapPlugin from './tap.ts';

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

describe('Tap Plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return error for missing simulatorUuid', async () => {
      (validateRequiredParam as MockedFunction<typeof validateRequiredParam>).mockReturnValueOnce({
        isValid: false,
        errorResponse: {
          content: [{ type: 'text', text: 'Missing required parameter: simulatorUuid' }],
          isError: true,
        },
      });

      const result = await tapPlugin.handler({
        x: 100,
        y: 200,
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Missing required parameter: simulatorUuid' }],
        isError: true,
      });
    });

    it('should return error for missing x coordinate', async () => {
      (validateRequiredParam as MockedFunction<typeof validateRequiredParam>)
        .mockReturnValueOnce({ isValid: true })
        .mockReturnValueOnce({
          isValid: false,
          errorResponse: {
            content: [{ type: 'text', text: 'Missing required parameter: x' }],
            isError: true,
          },
        });

      const result = await tapPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        y: 200,
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Missing required parameter: x' }],
        isError: true,
      });
    });

    it('should return error for missing y coordinate', async () => {
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

      const result = await tapPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        x: 100,
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Missing required parameter: y' }],
        isError: true,
      });
    });

    it('should return success for valid tap without describe_ui warning', async () => {
      (validateRequiredParam as MockedFunction<typeof validateRequiredParam>).mockReturnValue({
        isValid: true,
      });
      (getAxePath as MockedFunction<typeof getAxePath>).mockReturnValue('/path/to/axe');
      (getBundledAxeEnvironment as MockedFunction<typeof getBundledAxeEnvironment>).mockReturnValue(
        { AXE_PATH: '/path/to/axe' },
      );
      (executeCommand as MockedFunction<typeof executeCommand>).mockResolvedValue({
        success: true,
        output: 'Tap completed',
        error: '',
      });
      (createTextResponse as MockedFunction<typeof createTextResponse>).mockReturnValue({
        content: [{ type: 'text', text: 'Tap at (100, 200) simulated successfully.' }],
      });

      const result = await tapPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        x: 100,
        y: 200,
        preDelay: 0.5,
        postDelay: 1.0,
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Tap at (100, 200) simulated successfully.' }],
      });
    });

    it('should handle DependencyError when axe binary not found', async () => {
      (validateRequiredParam as MockedFunction<typeof validateRequiredParam>).mockReturnValue({
        isValid: true,
      });
      (getAxePath as MockedFunction<typeof getAxePath>).mockReturnValue(null);
      (
        createAxeNotAvailableResponse as MockedFunction<typeof createAxeNotAvailableResponse>
      ).mockReturnValue({
        content: [
          {
            type: 'text',
            text: 'AXe binary not found. Please install AXe to use UI testing features.',
          },
        ],
        isError: true,
      });

      const result = await tapPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        x: 100,
        y: 200,
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'AXe binary not found. Please install AXe to use UI testing features.',
          },
        ],
        isError: true,
      });
    });

    it('should handle AxeError from command execution', async () => {
      (validateRequiredParam as MockedFunction<typeof validateRequiredParam>).mockReturnValue({
        isValid: true,
      });
      (getAxePath as MockedFunction<typeof getAxePath>).mockReturnValue('/path/to/axe');
      (getBundledAxeEnvironment as MockedFunction<typeof getBundledAxeEnvironment>).mockReturnValue(
        { AXE_PATH: '/path/to/axe' },
      );
      (executeCommand as MockedFunction<typeof executeCommand>).mockResolvedValue({
        success: false,
        output: '',
        error: 'Coordinates out of bounds',
      });
      (createErrorResponse as MockedFunction<typeof createErrorResponse>).mockReturnValue({
        content: [
          { type: 'text', text: "Failed to simulate tap at (100, 200): axe command 'tap' failed." },
        ],
        isError: true,
      });

      const result = await tapPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        x: 100,
        y: 200,
      });

      expect(result).toEqual({
        content: [
          { type: 'text', text: "Failed to simulate tap at (100, 200): axe command 'tap' failed." },
        ],
        isError: true,
      });
    });

    it('should handle SystemError from command execution', async () => {
      (validateRequiredParam as MockedFunction<typeof validateRequiredParam>).mockReturnValue({
        isValid: true,
      });
      (getAxePath as MockedFunction<typeof getAxePath>).mockReturnValue('/path/to/axe');
      (getBundledAxeEnvironment as MockedFunction<typeof getBundledAxeEnvironment>).mockReturnValue(
        { AXE_PATH: '/path/to/axe' },
      );
      (executeCommand as MockedFunction<typeof executeCommand>).mockRejectedValue(
        new SystemError('System error occurred'),
      );
      (createErrorResponse as MockedFunction<typeof createErrorResponse>).mockReturnValue({
        content: [{ type: 'text', text: 'System error executing axe: System error occurred' }],
        isError: true,
      });

      const result = await tapPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        x: 100,
        y: 200,
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
      (getAxePath as MockedFunction<typeof getAxePath>).mockReturnValue('/path/to/axe');
      (getBundledAxeEnvironment as MockedFunction<typeof getBundledAxeEnvironment>).mockReturnValue(
        { AXE_PATH: '/path/to/axe' },
      );
      (executeCommand as MockedFunction<typeof executeCommand>).mockRejectedValue(
        new Error('Unexpected error'),
      );
      (createErrorResponse as MockedFunction<typeof createErrorResponse>).mockReturnValue({
        content: [{ type: 'text', text: 'An unexpected error occurred: Unexpected error' }],
        isError: true,
      });

      const result = await tapPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        x: 100,
        y: 200,
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
      (getAxePath as MockedFunction<typeof getAxePath>).mockReturnValue('/path/to/axe');
      (getBundledAxeEnvironment as MockedFunction<typeof getBundledAxeEnvironment>).mockReturnValue(
        { AXE_PATH: '/path/to/axe' },
      );
      (executeCommand as MockedFunction<typeof executeCommand>).mockRejectedValue('String error');
      (createErrorResponse as MockedFunction<typeof createErrorResponse>).mockReturnValue({
        content: [{ type: 'text', text: 'An unexpected error occurred: String error' }],
        isError: true,
      });

      const result = await tapPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        x: 100,
        y: 200,
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'An unexpected error occurred: String error' }],
        isError: true,
      });
    });
  });
});
