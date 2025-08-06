/**
 * Tests for describe_ui tool plugin
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { createMockExecutor, createNoopExecutor } from '../../../../utils/command.js';
import describeUIPlugin, { describe_uiLogic } from '../describe_ui.ts';

describe('Describe UI Plugin', () => {
  let mockCalls: any[] = [];

  mockCalls = [];

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
    it('should handle missing simulatorUuid via schema validation', async () => {
      // Test the actual handler (not just the logic function)
      // This demonstrates that Zod validation catches missing parameters
      const result = await describeUIPlugin.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Parameter validation failed');
      expect(result.content[0].text).toContain('simulatorUuid: Required');
    });

    it('should handle invalid simulatorUuid format via schema validation', async () => {
      // Test the actual handler with invalid UUID format
      const result = await describeUIPlugin.handler({
        simulatorUuid: 'invalid-uuid-format',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Parameter validation failed');
      expect(result.content[0].text).toContain('Invalid Simulator UUID format');
    });

    it('should return success for valid describe_ui execution', async () => {
      const uiHierarchy =
        '{"elements": [{"type": "Button", "frame": {"x": 100, "y": 200, "width": 50, "height": 30}}]}';

      const mockExecutor = createMockExecutor({
        success: true,
        output: uiHierarchy,
        error: undefined,
        process: { pid: 12345 },
      });

      // Create mock axe helpers
      const mockAxeHelpers = {
        getAxePath: () => '/usr/local/bin/axe',
        getBundledAxeEnvironment: () => ({}),
      };

      // Wrap executor to track calls
      const executorCalls: any[] = [];
      const trackingExecutor = async (...args: any[]) => {
        executorCalls.push(args);
        return mockExecutor(...args);
      };

      const result = await describe_uiLogic(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
        },
        trackingExecutor,
        mockAxeHelpers,
      );

      expect(executorCalls[0]).toEqual([
        ['/usr/local/bin/axe', 'describe-ui', '--udid', '12345678-1234-1234-1234-123456789012'],
        '[AXe]: describe-ui',
        false,
        {},
      ]);

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
      // Create mock axe helpers that return null for axe path
      const mockAxeHelpers = {
        getAxePath: () => null,
        getBundledAxeEnvironment: () => ({}),
        createAxeNotAvailableResponse: () => ({
          content: [
            {
              type: 'text',
              text: 'Bundled axe tool not found. UI automation features are not available.\n\nThis is likely an installation issue with the npm package.\nPlease reinstall xcodebuildmcp or report this issue.',
            },
          ],
          isError: true,
        }),
      };

      const result = await describe_uiLogic(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
        },
        createNoopExecutor(),
        mockAxeHelpers,
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

    it('should handle AxeError from failed command execution', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'axe command failed',
        process: { pid: 12345 },
      });

      // Create mock axe helpers
      const mockAxeHelpers = {
        getAxePath: () => '/usr/local/bin/axe',
        getBundledAxeEnvironment: () => ({}),
      };

      const result = await describe_uiLogic(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
        },
        mockExecutor,
        mockAxeHelpers,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Error: Failed to get accessibility hierarchy: axe command 'describe-ui' failed.\nDetails: axe command failed",
          },
        ],
        isError: true,
      });
    });

    it('should handle SystemError from command execution', async () => {
      const mockExecutor = createMockExecutor(new Error('ENOENT: no such file or directory'));

      // Create mock axe helpers
      const mockAxeHelpers = {
        getAxePath: () => '/usr/local/bin/axe',
        getBundledAxeEnvironment: () => ({}),
      };

      const result = await describe_uiLogic(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
        },
        mockExecutor,
        mockAxeHelpers,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: expect.stringContaining(
              'Error: System error executing axe: Failed to execute axe command: ENOENT: no such file or directory',
            ),
          },
        ],
        isError: true,
      });
    });

    it('should handle unexpected Error objects', async () => {
      const mockExecutor = createMockExecutor(new Error('Unexpected error'));

      // Create mock axe helpers
      const mockAxeHelpers = {
        getAxePath: () => '/usr/local/bin/axe',
        getBundledAxeEnvironment: () => ({}),
      };

      const result = await describe_uiLogic(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
        },
        mockExecutor,
        mockAxeHelpers,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: expect.stringContaining(
              'Error: System error executing axe: Failed to execute axe command: Unexpected error',
            ),
          },
        ],
        isError: true,
      });
    });

    it('should handle unexpected string errors', async () => {
      const mockExecutor = createMockExecutor('String error');

      // Create mock axe helpers
      const mockAxeHelpers = {
        getAxePath: () => '/usr/local/bin/axe',
        getBundledAxeEnvironment: () => ({}),
      };

      const result = await describe_uiLogic(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
        },
        mockExecutor,
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
