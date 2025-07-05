/**
 * Tests for screenshot tool plugin
 */

import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { z } from 'zod';
import screenshotPlugin from './screenshot.ts';

// Mock all utilities from the index module
vi.mock('../../src/utils/index.js', () => ({
  log: vi.fn(),
  validateRequiredParam: vi.fn(),
  createErrorResponse: vi.fn(),
  executeCommand: vi.fn(),
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

// Mock fs/promises
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  unlink: vi.fn(),
}));

// Import mocked functions
import {
  validateRequiredParam,
  createErrorResponse,
  executeCommand,
  SystemError,
} from '../../utils/index.js';
import { readFile, unlink } from 'fs/promises';

describe('Screenshot Plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(screenshotPlugin.name).toBe('screenshot');
    });

    it('should have correct description', () => {
      expect(screenshotPlugin.description).toBe(
        "Captures screenshot for visual verification. For UI coordinates, use describe_ui instead (don't determine coordinates from screenshots).",
      );
    });

    it('should have handler function', () => {
      expect(typeof screenshotPlugin.handler).toBe('function');
    });

    it('should validate schema fields with safeParse', () => {
      const schema = z.object(screenshotPlugin.schema);

      // Valid case
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
        }).success,
      ).toBe(true);

      // Invalid simulatorUuid
      expect(
        schema.safeParse({
          simulatorUuid: 'invalid-uuid',
        }).success,
      ).toBe(false);

      // Missing simulatorUuid
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

      const result = await screenshotPlugin.handler({});

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Missing required parameter: simulatorUuid' }],
        isError: true,
      });
    });

    it('should return success for valid screenshot capture', async () => {
      const mockImageBuffer = Buffer.from('fake-image-data', 'utf8');
      const expectedBase64 = mockImageBuffer.toString('base64');

      (validateRequiredParam as MockedFunction<typeof validateRequiredParam>).mockReturnValue({
        isValid: true,
      });
      (executeCommand as MockedFunction<typeof executeCommand>).mockResolvedValue({
        success: true,
        output: 'Screenshot saved',
        error: '',
      });
      (readFile as MockedFunction<typeof readFile>).mockResolvedValue(mockImageBuffer);
      (unlink as MockedFunction<typeof unlink>).mockResolvedValue(undefined);

      const result = await screenshotPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'image',
            data: expectedBase64,
            mimeType: 'image/png',
          },
        ],
      });
    });

    it('should handle command execution failure', async () => {
      (validateRequiredParam as MockedFunction<typeof validateRequiredParam>).mockReturnValue({
        isValid: true,
      });
      (executeCommand as MockedFunction<typeof executeCommand>).mockResolvedValue({
        success: false,
        output: '',
        error: 'Simulator not found',
      });
      (createErrorResponse as MockedFunction<typeof createErrorResponse>).mockReturnValue({
        content: [
          {
            type: 'text',
            text: 'System error executing screenshot: Failed to capture screenshot: Simulator not found',
          },
        ],
        isError: true,
      });

      const result = await screenshotPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'System error executing screenshot: Failed to capture screenshot: Simulator not found',
          },
        ],
        isError: true,
      });
    });

    it('should handle file reading errors', async () => {
      (validateRequiredParam as MockedFunction<typeof validateRequiredParam>).mockReturnValue({
        isValid: true,
      });
      (executeCommand as MockedFunction<typeof executeCommand>).mockResolvedValue({
        success: true,
        output: 'Screenshot saved',
        error: '',
      });
      (readFile as MockedFunction<typeof readFile>).mockRejectedValue(new Error('File not found'));
      (createErrorResponse as MockedFunction<typeof createErrorResponse>).mockReturnValue({
        content: [
          {
            type: 'text',
            text: 'Screenshot captured but failed to process image file: File not found',
          },
        ],
        isError: true,
      });

      const result = await screenshotPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Screenshot captured but failed to process image file: File not found',
          },
        ],
        isError: true,
      });
    });

    it('should handle file cleanup errors gracefully', async () => {
      const mockImageBuffer = Buffer.from('fake-image-data', 'utf8');
      const expectedBase64 = mockImageBuffer.toString('base64');

      (validateRequiredParam as MockedFunction<typeof validateRequiredParam>).mockReturnValue({
        isValid: true,
      });
      (executeCommand as MockedFunction<typeof executeCommand>).mockResolvedValue({
        success: true,
        output: 'Screenshot saved',
        error: '',
      });
      (readFile as MockedFunction<typeof readFile>).mockResolvedValue(mockImageBuffer);
      (unlink as MockedFunction<typeof unlink>).mockRejectedValue(new Error('Permission denied'));

      const result = await screenshotPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
      });

      // Should still return successful result despite cleanup failure
      expect(result).toEqual({
        content: [
          {
            type: 'image',
            data: expectedBase64,
            mimeType: 'image/png',
          },
        ],
      });
    });

    it('should handle SystemError from command execution', async () => {
      (validateRequiredParam as MockedFunction<typeof validateRequiredParam>).mockReturnValue({
        isValid: true,
      });
      (executeCommand as MockedFunction<typeof executeCommand>).mockRejectedValue(
        new SystemError('System error occurred'),
      );
      (createErrorResponse as MockedFunction<typeof createErrorResponse>).mockReturnValue({
        content: [
          { type: 'text', text: 'System error executing screenshot: System error occurred' },
        ],
        isError: true,
      });

      const result = await screenshotPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
      });

      expect(result).toEqual({
        content: [
          { type: 'text', text: 'System error executing screenshot: System error occurred' },
        ],
        isError: true,
      });
    });

    it('should handle unexpected Error objects', async () => {
      (validateRequiredParam as MockedFunction<typeof validateRequiredParam>).mockReturnValue({
        isValid: true,
      });
      (executeCommand as MockedFunction<typeof executeCommand>).mockRejectedValue(
        new Error('Unexpected error'),
      );
      (createErrorResponse as MockedFunction<typeof createErrorResponse>).mockReturnValue({
        content: [{ type: 'text', text: 'An unexpected error occurred: Unexpected error' }],
        isError: true,
      });

      const result = await screenshotPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
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
      (executeCommand as MockedFunction<typeof executeCommand>).mockRejectedValue('String error');
      (createErrorResponse as MockedFunction<typeof createErrorResponse>).mockReturnValue({
        content: [{ type: 'text', text: 'An unexpected error occurred: String error' }],
        isError: true,
      });

      const result = await screenshotPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'An unexpected error occurred: String error' }],
        isError: true,
      });
    });
  });
});
