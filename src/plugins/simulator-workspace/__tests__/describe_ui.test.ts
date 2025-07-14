import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../../utils/command.js';

// Import the plugin
import describeUi from '../describe_ui.ts';

describe('describe_ui tool', () => {
  let mockExecutor: any;
  let mockAxeHelpers: any;

  beforeEach(() => {
    mockExecutor = createMockExecutor({
      success: true,
      output: '{"root": {"elements": []}}',
      error: undefined,
    });

    mockAxeHelpers = {
      getAxePath: () => '/usr/local/bin/axe',
      getBundledAxeEnvironment: () => ({}),
    };
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(describeUi.name).toBe('describe_ui');
    });

    it('should have correct description', () => {
      expect(describeUi.description).toBe(
        'Gets entire view hierarchy with precise frame coordinates (x, y, width, height) for all visible elements. Use this before UI interactions or after layout changes - do NOT guess coordinates from screenshots. Returns JSON tree with frame data for accurate automation.',
      );
    });

    it('should have handler function', () => {
      expect(typeof describeUi.handler).toBe('function');
    });

    it('should have correct schema with simulatorUuid UUID field', () => {
      const schema = z.object(describeUi.schema);

      // Valid inputs
      expect(
        schema.safeParse({ simulatorUuid: '12345678-1234-1234-1234-123456789abc' }).success,
      ).toBe(true);
      expect(
        schema.safeParse({ simulatorUuid: 'ABCDEF12-3456-7890-ABCD-EF1234567890' }).success,
      ).toBe(true);

      // Invalid inputs
      expect(schema.safeParse({ simulatorUuid: 'invalid-uuid' }).success).toBe(false);
      expect(schema.safeParse({ simulatorUuid: '123' }).success).toBe(false);
      expect(schema.safeParse({ simulatorUuid: 123 }).success).toBe(false);
      expect(schema.safeParse({ simulatorUuid: null }).success).toBe(false);
      expect(schema.safeParse({ simulatorUuid: undefined }).success).toBe(false);
      expect(schema.safeParse({}).success).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should handle validation failure', async () => {
      const result = await describeUi.handler({}, mockExecutor, mockAxeHelpers);

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

    it('should handle successful UI description', async () => {
      const result = await describeUi.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789abc',
        },
        mockExecutor,
        mockAxeHelpers,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Accessibility hierarchy retrieved successfully:\n```json\n{"root": {"elements": []}}\n```',
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

    it('should handle dependency error when AXe not available', async () => {
      const mockAxeHelpersNoAxe = {
        getAxePath: () => null,
        getBundledAxeEnvironment: () => ({}),
      };

      const result = await describeUi.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789abc',
        },
        mockExecutor,
        mockAxeHelpersNoAxe,
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

    it('should handle AXe command failure', async () => {
      const mockFailExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'Simulator not found',
      });

      const result = await describeUi.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789abc',
        },
        mockFailExecutor,
        mockAxeHelpers,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Error: Failed to get accessibility hierarchy: axe command 'describe-ui' failed.\nDetails: Simulator not found",
          },
        ],
        isError: true,
      });
    });

    it('should handle exception with Error object', async () => {
      const mockErrorExecutor = async () => {
        throw new Error('Command execution failed');
      };

      const result = await describeUi.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789abc',
        },
        mockErrorExecutor,
        mockAxeHelpers,
      );

      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: expect.stringContaining(
              'Error: System error executing axe: Failed to execute axe command: Command execution failed',
            ),
          },
        ],
        isError: true,
      });
    });

    it('should handle exception with string error', async () => {
      const mockStringErrorExecutor = async () => {
        throw 'String error';
      };

      const result = await describeUi.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789abc',
        },
        mockStringErrorExecutor,
        mockAxeHelpers,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: System error executing axe: Failed to execute axe command: String error',
          },
        ],
        isError: true,
      });
    });
  });
});
