/**
 * Tests for describe_ui tool plugin
 */

import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { z } from 'zod';
import describeUIPlugin from './describe_ui.ts';

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

describe('Describe UI Plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(describeUIPlugin.name).toBe('describe_ui');
    });

    it('should have correct description', () => {
      expect(describeUIPlugin.description).toBe(
        'Gets entire view hierarchy with precise frame coordinates (x, y, width, height) for all visible elements. Use this before UI interactions or after layout changes - do NOT guess coordinates from screenshots. Returns JSON tree with frame data for accurate automation.',
      );
    });

    it('should have handler function', () => {
      expect(typeof describeUIPlugin.handler).toBe('function');
    });

    it('should validate schema fields with safeParse', () => {
      const schema = z.object(describeUIPlugin.schema);

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

      const result = await describeUIPlugin.handler({});

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Missing required parameter: simulatorUuid' }],
        isError: true,
      });
    });

    it('should return success for valid describe_ui execution', async () => {
      (validateRequiredParam as MockedFunction<typeof validateRequiredParam>).mockReturnValue({
        isValid: true,
      });
      (getAxePath as MockedFunction<typeof getAxePath>).mockReturnValue('/usr/local/bin/axe');
      (getBundledAxeEnvironment as MockedFunction<typeof getBundledAxeEnvironment>).mockReturnValue(
        {},
      );
      (executeCommand as MockedFunction<typeof executeCommand>).mockResolvedValue({
        success: true,
        output:
          '{"elements": [{"type": "Button", "frame": {"x": 100, "y": 200, "width": 50, "height": 30}}]}',
        error: '',
      });

      const result = await describeUIPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Accessibility hierarchy retrieved successfully:\n```json\n{"elements": [{"type": "Button", "frame": {"x": 100, "y": 200, "width": 50, "height": 30}}]}\n```',
          },
          {
            type: 'text',
            text: `Next Steps:
- Use frame coordinates for tap/swipe (center: x+width/2, y+height/2)
- Re-run describe_ui after layout changes
- Screenshots are for visual verification only`,
          },
        ],
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

      const result = await describeUIPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
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
            text: "Failed to get accessibility hierarchy: axe command 'describe-ui' failed.",
          },
        ],
        isError: true,
      });

      const result = await describeUIPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Failed to get accessibility hierarchy: axe command 'describe-ui' failed.",
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

      const result = await describeUIPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
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

      const result = await describeUIPlugin.handler({
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
      (getAxePath as MockedFunction<typeof getAxePath>).mockReturnValue('/usr/local/bin/axe');
      (getBundledAxeEnvironment as MockedFunction<typeof getBundledAxeEnvironment>).mockReturnValue(
        {},
      );
      (executeCommand as MockedFunction<typeof executeCommand>).mockRejectedValue('String error');
      (createErrorResponse as MockedFunction<typeof createErrorResponse>).mockReturnValue({
        content: [{ type: 'text', text: 'An unexpected error occurred: String error' }],
        isError: true,
      });

      const result = await describeUIPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'An unexpected error occurred: String error' }],
        isError: true,
      });
    });
  });
});
