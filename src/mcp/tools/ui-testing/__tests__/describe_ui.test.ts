/**
 * Tests for describe_ui tool plugin
 */

import { describe, it, expect } from 'vitest';
import * as z from 'zod';
import { createMockExecutor, createNoopExecutor } from '../../../../test-utils/mock-executors.ts';
import type { CommandExecutor } from '../../../../utils/execution/index.ts';
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

    it('should expose public schema without simulatorId field', () => {
      const schema = z.object(describeUIPlugin.schema);

      expect(schema.safeParse({}).success).toBe(true);

      const withSimId = schema.safeParse({ simulatorId: '12345678-1234-4234-8234-123456789012' });
      expect(withSimId.success).toBe(true);
      expect('simulatorId' in (withSimId.data as any)).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should surface session default requirement when simulatorId is missing', async () => {
      const result = await describeUIPlugin.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Missing required session defaults');
      expect(result.content[0].text).toContain('simulatorId is required');
    });

    it('should handle invalid simulatorId format via schema validation', async () => {
      // Test the actual handler with invalid UUID format
      const result = await describeUIPlugin.handler({
        simulatorId: 'invalid-uuid-format',
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
        createAxeNotAvailableResponse: () => ({
          content: [{ type: 'text' as const, text: 'axe not available' }],
          isError: true,
        }),
      };

      // Wrap executor to track calls
      const executorCalls: any[] = [];
      const trackingExecutor: CommandExecutor = async (...args) => {
        executorCalls.push(args);
        return mockExecutor(...args);
      };

      const result = await describe_uiLogic(
        {
          simulatorId: '12345678-1234-4234-8234-123456789012',
        },
        trackingExecutor,
        mockAxeHelpers,
      );

      expect(executorCalls[0]).toEqual([
        ['/usr/local/bin/axe', 'describe-ui', '--udid', '12345678-1234-4234-8234-123456789012'],
        '[AXe]: describe-ui',
        false,
        { env: {} },
      ]);

      expect(result).toEqual({
        content: [
          {
            type: 'text' as const,
            text: 'Accessibility hierarchy retrieved successfully:\n```json\n{"elements": [{"type": "Button", "frame": {"x": 100, "y": 200, "width": 50, "height": 30}}]}\n```',
          },
          {
            type: 'text' as const,
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
              type: 'text' as const,
              text: 'AXe tool not found. UI automation features are not available.\n\nInstall AXe (brew tap cameroncooke/axe && brew install axe) or set XCODEBUILDMCP_AXE_PATH.\nIf you installed via Smithery, ensure bundled artifacts are included or PATH is configured.',
            },
          ],
          isError: true,
        }),
      };

      const result = await describe_uiLogic(
        {
          simulatorId: '12345678-1234-4234-8234-123456789012',
        },
        createNoopExecutor(),
        mockAxeHelpers,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text' as const,
            text: 'AXe tool not found. UI automation features are not available.\n\nInstall AXe (brew tap cameroncooke/axe && brew install axe) or set XCODEBUILDMCP_AXE_PATH.\nIf you installed via Smithery, ensure bundled artifacts are included or PATH is configured.',
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
        createAxeNotAvailableResponse: () => ({
          content: [{ type: 'text' as const, text: 'axe not available' }],
          isError: true,
        }),
      };

      const result = await describe_uiLogic(
        {
          simulatorId: '12345678-1234-4234-8234-123456789012',
        },
        mockExecutor,
        mockAxeHelpers,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text' as const,
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
        createAxeNotAvailableResponse: () => ({
          content: [{ type: 'text' as const, text: 'axe not available' }],
          isError: true,
        }),
      };

      const result = await describe_uiLogic(
        {
          simulatorId: '12345678-1234-4234-8234-123456789012',
        },
        mockExecutor,
        mockAxeHelpers,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text' as const,
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
        createAxeNotAvailableResponse: () => ({
          content: [{ type: 'text' as const, text: 'axe not available' }],
          isError: true,
        }),
      };

      const result = await describe_uiLogic(
        {
          simulatorId: '12345678-1234-4234-8234-123456789012',
        },
        mockExecutor,
        mockAxeHelpers,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text' as const,
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
        createAxeNotAvailableResponse: () => ({
          content: [{ type: 'text' as const, text: 'axe not available' }],
          isError: true,
        }),
      };

      const result = await describe_uiLogic(
        {
          simulatorId: '12345678-1234-4234-8234-123456789012',
        },
        mockExecutor,
        mockAxeHelpers,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text' as const,
            text: 'Error: System error executing axe: Failed to execute axe command: String error',
          },
        ],
        isError: true,
      });
    });
  });
});
