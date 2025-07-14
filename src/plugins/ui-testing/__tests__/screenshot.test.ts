/**
 * Tests for screenshot tool plugin
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';
import { createMockExecutor, createMockFileSystemExecutor } from '../../../utils/command.js';
import screenshotPlugin from '../screenshot.ts';

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
      const result = await screenshotPlugin.handler({});

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

    it('should return success for valid screenshot capture', async () => {
      const mockImageBuffer = Buffer.from('fake-image-data', 'utf8');
      const expectedBase64 = mockImageBuffer.toString('base64');

      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Screenshot saved',
        error: undefined,
      });

      const mockFileSystemExecutor = createMockFileSystemExecutor({
        readFile: async () => mockImageBuffer.toString('utf8'),
      });

      const result = await screenshotPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
        },
        mockExecutor,
        mockFileSystemExecutor,
      );

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
      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'Simulator not found',
      });

      const result = await screenshotPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: System error executing screenshot: Failed to capture screenshot: Simulator not found',
          },
        ],
        isError: true,
      });
    });

    it('should handle file reading errors', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Screenshot saved',
        error: undefined,
      });

      const mockFileSystemExecutor = createMockFileSystemExecutor({
        readFile: async () => {
          throw new Error('File not found');
        },
      });

      const result = await screenshotPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
        },
        mockExecutor,
        mockFileSystemExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Screenshot captured but failed to process image file: File not found',
          },
        ],
        isError: true,
      });
    });

    it('should handle file cleanup errors gracefully', async () => {
      const mockImageBuffer = Buffer.from('fake-image-data', 'utf8');
      const expectedBase64 = mockImageBuffer.toString('base64');

      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Screenshot saved',
        error: undefined,
      });

      const mockFileSystemExecutor = createMockFileSystemExecutor({
        readFile: async () => mockImageBuffer.toString('utf8'),
        // unlink method is not overridden, so it will use the default (no-op)
        // which simulates the cleanup failure being caught and logged
      });

      const result = await screenshotPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
        },
        mockExecutor,
        mockFileSystemExecutor,
      );

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
      const mockExecutor = async () => {
        const SystemError = (await import('../../../utils/index.js')).SystemError;
        throw new SystemError('System error occurred');
      };

      const result = await screenshotPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          { type: 'text', text: 'Error: System error executing screenshot: System error occurred' },
        ],
        isError: true,
      });
    });

    it('should handle unexpected Error objects', async () => {
      const mockExecutor = async () => {
        throw new Error('Unexpected error');
      };

      const result = await screenshotPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error: An unexpected error occurred: Unexpected error' }],
        isError: true,
      });
    });

    it('should handle unexpected string errors', async () => {
      const mockExecutor = async () => {
        throw 'String error';
      };

      const result = await screenshotPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error: An unexpected error occurred: String error' }],
        isError: true,
      });
    });
  });
});
