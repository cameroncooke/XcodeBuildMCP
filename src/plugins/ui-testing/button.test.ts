/**
 * Tests for button tool plugin
 */

import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { z } from 'zod';
import buttonPlugin from './button.ts';

// Mock all utilities from the index module
vi.mock('../../src/utils/index.js', () => ({
  log: vi.fn(),
  validateRequiredParam: vi.fn(),
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
  createErrorResponse,
  executeCommand,
  createAxeNotAvailableResponse,
  getAxePath,
  getBundledAxeEnvironment,
  DependencyError,
  AxeError,
  SystemError,
} from '../../utils/index.js';

describe('Button Plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(buttonPlugin.name).toBe('button');
    });

    it('should have correct description', () => {
      expect(buttonPlugin.description).toBe(
        'Press hardware button on iOS simulator. Supported buttons: apple-pay, home, lock, side-button, siri',
      );
    });

    it('should have handler function', () => {
      expect(typeof buttonPlugin.handler).toBe('function');
    });

    it('should validate schema fields with safeParse', () => {
      const schema = z.object(buttonPlugin.schema);

      // Valid case
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          buttonType: 'home',
        }).success,
      ).toBe(true);

      // Invalid simulatorUuid
      expect(
        schema.safeParse({
          simulatorUuid: 'invalid-uuid',
          buttonType: 'home',
        }).success,
      ).toBe(false);

      // Invalid buttonType
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          buttonType: 'invalid-button',
        }).success,
      ).toBe(false);

      // Valid with duration
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          buttonType: 'home',
          duration: 2.5,
        }).success,
      ).toBe(true);

      // Invalid duration (negative)
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          buttonType: 'home',
          duration: -1,
        }).success,
      ).toBe(false);

      // Test all valid button types
      const validButtons = ['apple-pay', 'home', 'lock', 'side-button', 'siri'];
      validButtons.forEach((buttonType) => {
        expect(
          schema.safeParse({
            simulatorUuid: '12345678-1234-1234-1234-123456789012',
            buttonType,
          }).success,
        ).toBe(true);
      });
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

      const result = await buttonPlugin.handler({ buttonType: 'home' });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Missing required parameter: simulatorUuid' }],
        isError: true,
      });
    });

    it('should return error for missing buttonType', async () => {
      (validateRequiredParam as MockedFunction<typeof validateRequiredParam>)
        .mockReturnValueOnce({ isValid: true })
        .mockReturnValueOnce({
          isValid: false,
          errorResponse: {
            content: [{ type: 'text', text: 'Missing required parameter: buttonType' }],
            isError: true,
          },
        });

      const result = await buttonPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Missing required parameter: buttonType' }],
        isError: true,
      });
    });

    it('should return success for valid button press', async () => {
      (validateRequiredParam as MockedFunction<typeof validateRequiredParam>).mockReturnValue({
        isValid: true,
      });
      (getAxePath as MockedFunction<typeof getAxePath>).mockReturnValue('/usr/local/bin/axe');
      (getBundledAxeEnvironment as MockedFunction<typeof getBundledAxeEnvironment>).mockReturnValue(
        {},
      );
      (executeCommand as MockedFunction<typeof executeCommand>).mockResolvedValue({
        success: true,
        output: 'button press completed',
        error: '',
      });

      const result = await buttonPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        buttonType: 'home',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: "Hardware button 'home' pressed successfully." }],
      });
    });

    it('should return success for button press with duration', async () => {
      (validateRequiredParam as MockedFunction<typeof validateRequiredParam>).mockReturnValue({
        isValid: true,
      });
      (getAxePath as MockedFunction<typeof getAxePath>).mockReturnValue('/usr/local/bin/axe');
      (getBundledAxeEnvironment as MockedFunction<typeof getBundledAxeEnvironment>).mockReturnValue(
        {},
      );
      (executeCommand as MockedFunction<typeof executeCommand>).mockResolvedValue({
        success: true,
        output: 'button press completed',
        error: '',
      });

      const result = await buttonPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        buttonType: 'side-button',
        duration: 2.5,
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: "Hardware button 'side-button' pressed successfully." }],
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

      const result = await buttonPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        buttonType: 'home',
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
          { type: 'text', text: "Failed to press button 'home': axe command 'button' failed." },
        ],
        isError: true,
      });

      const result = await buttonPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        buttonType: 'home',
      });

      expect(result).toEqual({
        content: [
          { type: 'text', text: "Failed to press button 'home': axe command 'button' failed." },
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

      const result = await buttonPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        buttonType: 'home',
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

      const result = await buttonPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        buttonType: 'home',
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

      const result = await buttonPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        buttonType: 'home',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'An unexpected error occurred: String error' }],
        isError: true,
      });
    });
  });
});
