/**
 * Tests for gesture tool plugin
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';
import { EventEmitter } from 'events';
import gesturePlugin from '../gesture.ts';

// Mock child_process at the lowest system level
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

// Mock only the path resolution utilities, not validation/response utilities
vi.mock('../../utils/index.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getAxePath: vi.fn(),
    getBundledAxeEnvironment: vi.fn(),
  };
});

import { getAxePath, getBundledAxeEnvironment } from '../../../utils/index.js';
import { spawn } from 'child_process';

class MockChildProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  pid = 12345;
}

const mockSpawn = vi.mocked(spawn);

describe('Gesture Plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
      (validateRequiredParam as MockedFunction<typeof validateRequiredParam>).mockReturnValueOnce({
        isValid: false,
        errorResponse: {
          content: [{ type: 'text', text: 'Missing required parameter: simulatorUuid' }],
          isError: true,
        },
      });

      const result = await gesturePlugin.handler({ preset: 'scroll-up' });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Missing required parameter: simulatorUuid' }],
        isError: true,
      });
    });

    it('should return error for missing preset', async () => {
      (validateRequiredParam as MockedFunction<typeof validateRequiredParam>)
        .mockReturnValueOnce({ isValid: true })
        .mockReturnValueOnce({
          isValid: false,
          errorResponse: {
            content: [{ type: 'text', text: 'Missing required parameter: preset' }],
            isError: true,
          },
        });

      const result = await gesturePlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Missing required parameter: preset' }],
        isError: true,
      });
    });

    it('should return success for valid gesture execution', async () => {
      (validateRequiredParam as MockedFunction<typeof validateRequiredParam>).mockReturnValue({
        isValid: true,
      });
      (getAxePath as MockedFunction<typeof getAxePath>).mockReturnValue('/usr/local/bin/axe');
      (getBundledAxeEnvironment as MockedFunction<typeof getBundledAxeEnvironment>).mockReturnValue(
        {},
      );
      (executeCommand as MockedFunction<typeof executeCommand>).mockResolvedValue({
        success: true,
        output: 'gesture completed',
        error: '',
      });
      (createTextResponse as MockedFunction<typeof createTextResponse>).mockReturnValue({
        content: [{ type: 'text', text: "Gesture 'scroll-up' executed successfully." }],
        isError: false,
      });

      const result = await gesturePlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        preset: 'scroll-up',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: "Gesture 'scroll-up' executed successfully." }],
        isError: false,
      });
    });

    it('should return success for gesture execution with all optional parameters', async () => {
      (validateRequiredParam as MockedFunction<typeof validateRequiredParam>).mockReturnValue({
        isValid: true,
      });
      (getAxePath as MockedFunction<typeof getAxePath>).mockReturnValue('/usr/local/bin/axe');
      (getBundledAxeEnvironment as MockedFunction<typeof getBundledAxeEnvironment>).mockReturnValue(
        {},
      );
      (executeCommand as MockedFunction<typeof executeCommand>).mockResolvedValue({
        success: true,
        output: 'gesture completed',
        error: '',
      });
      (createTextResponse as MockedFunction<typeof createTextResponse>).mockReturnValue({
        content: [{ type: 'text', text: "Gesture 'swipe-from-left-edge' executed successfully." }],
        isError: false,
      });

      const result = await gesturePlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        preset: 'swipe-from-left-edge',
        screenWidth: 375,
        screenHeight: 667,
        duration: 1.0,
        delta: 50,
        preDelay: 0.1,
        postDelay: 0.2,
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: "Gesture 'swipe-from-left-edge' executed successfully." }],
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

      const result = await gesturePlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        preset: 'scroll-up',
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
            text: "Failed to execute gesture 'scroll-up': axe command 'gesture' failed.",
          },
        ],
        isError: true,
      });

      const result = await gesturePlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        preset: 'scroll-up',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Failed to execute gesture 'scroll-up': axe command 'gesture' failed.",
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

      const result = await gesturePlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        preset: 'scroll-up',
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

      const result = await gesturePlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        preset: 'scroll-up',
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

      const result = await gesturePlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        preset: 'scroll-up',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'An unexpected error occurred: String error' }],
        isError: true,
      });
    });
  });
});
