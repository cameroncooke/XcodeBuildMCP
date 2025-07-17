/**
 * Tests for tap plugin
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../../utils/command.js';
import tapPlugin from '../tap.ts';

describe('Tap Plugin', () => {
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
      const mockExecutor = createMockExecutor({ success: true, output: '' });

      const result = await tapPlugin.handler(
        {
          x: 100,
          y: 200,
        },
        mockExecutor,
      );

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

    it('should return error for missing x coordinate', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: '' });

      const result = await tapPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          y: 200,
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'x' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should return error for missing y coordinate', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: '' });

      const result = await tapPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 100,
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'y' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should return DependencyError when axe binary is not found', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Tap completed',
        error: undefined,
      });

      const result = await tapPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 100,
          y: 200,
          preDelay: 0.5,
          postDelay: 1.0,
        },
        mockExecutor,
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

    it('should handle DependencyError when axe binary not found (second test)', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'Coordinates out of bounds',
      });

      const result = await tapPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 100,
          y: 200,
        },
        mockExecutor,
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

    it('should handle DependencyError when axe binary not found (third test)', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'System error occurred',
      });

      const result = await tapPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 100,
          y: 200,
        },
        mockExecutor,
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

    it('should handle DependencyError when axe binary not found (fourth test)', async () => {
      const mockExecutor = async () => {
        throw new Error('ENOENT: no such file or directory');
      };

      const result = await tapPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 100,
          y: 200,
        },
        mockExecutor,
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

    it('should handle DependencyError when axe binary not found (fifth test)', async () => {
      const mockExecutor = async () => {
        throw new Error('Unexpected error');
      };

      const result = await tapPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 100,
          y: 200,
        },
        mockExecutor,
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

    it('should handle DependencyError when axe binary not found (sixth test)', async () => {
      const mockExecutor = async () => {
        throw 'String error';
      };

      const result = await tapPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x: 100,
          y: 200,
        },
        mockExecutor,
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
  });
});
