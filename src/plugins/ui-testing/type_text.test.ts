/**
 * Tests for type_text plugin
 */

import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { z } from 'zod';
import typeTextPlugin from './type_text.ts';

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

describe('Type Text Plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
      (validateRequiredParam as MockedFunction<typeof validateRequiredParam>).mockReturnValueOnce({
        isValid: false,
        errorResponse: {
          content: [{ type: 'text', text: 'Missing required parameter: simulatorUuid' }],
          isError: true,
        },
      });

      const result = await typeTextPlugin.handler({
        text: 'Hello World',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Missing required parameter: simulatorUuid' }],
        isError: true,
      });
    });

    it('should return error for missing text', async () => {
      (validateRequiredParam as MockedFunction<typeof validateRequiredParam>)
        .mockReturnValueOnce({ isValid: true })
        .mockReturnValueOnce({
          isValid: false,
          errorResponse: {
            content: [{ type: 'text', text: 'Missing required parameter: text' }],
            isError: true,
          },
        });

      const result = await typeTextPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Missing required parameter: text' }],
        isError: true,
      });
    });

    it('should return success for valid text typing', async () => {
      (validateRequiredParam as MockedFunction<typeof validateRequiredParam>).mockReturnValue({
        isValid: true,
      });
      (getAxePath as MockedFunction<typeof getAxePath>).mockReturnValue('/path/to/axe');
      (getBundledAxeEnvironment as MockedFunction<typeof getBundledAxeEnvironment>).mockReturnValue(
        { AXE_PATH: '/path/to/axe' },
      );
      (executeCommand as MockedFunction<typeof executeCommand>).mockResolvedValue({
        success: true,
        output: 'Text typed successfully',
        error: '',
      });
      (createTextResponse as MockedFunction<typeof createTextResponse>).mockReturnValue({
        content: [{ type: 'text', text: 'Text typing simulated successfully.' }],
      });

      const result = await typeTextPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        text: 'Hello World',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Text typing simulated successfully.' }],
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

      const result = await typeTextPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        text: 'Hello World',
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
        error: 'Text field not found',
      });
      (createErrorResponse as MockedFunction<typeof createErrorResponse>).mockReturnValue({
        content: [
          { type: 'text', text: "Failed to simulate text typing: axe command 'type' failed." },
        ],
        isError: true,
      });

      const result = await typeTextPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        text: 'Hello World',
      });

      expect(result).toEqual({
        content: [
          { type: 'text', text: "Failed to simulate text typing: axe command 'type' failed." },
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

      const result = await typeTextPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        text: 'Hello World',
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

      const result = await typeTextPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        text: 'Hello World',
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

      const result = await typeTextPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        text: 'Hello World',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'An unexpected error occurred: String error' }],
        isError: true,
      });
    });
  });
});
