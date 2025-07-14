/**
 * Tests for describe_ui tool plugin
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../../utils/command.js';
import describeUIPlugin from '../describe_ui.ts';

// Mock only the path resolution utilities, not validation/response utilities
vi.mock('../../../utils/index.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getAxePath: vi.fn(),
    getBundledAxeEnvironment: vi.fn(),
  };
});

import { getAxePath, getBundledAxeEnvironment } from '../../../utils/index.js';

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
      const result = await describeUIPlugin.handler({});

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

    it('should return success for valid describe_ui execution', async () => {
      vi.mocked(getAxePath).mockReturnValue('/usr/local/bin/axe');
      vi.mocked(getBundledAxeEnvironment).mockReturnValue({});

      const uiHierarchy =
        '{"elements": [{"type": "Button", "frame": {"x": 100, "y": 200, "width": 50, "height": 30}}]}';

      const mockExecutor = vi.fn().mockResolvedValue({
        success: true,
        output: uiHierarchy,
        error: undefined,
        process: { pid: 12345 },
      });

      const result = await describeUIPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
        },
        mockExecutor,
      );

      expect(mockExecutor).toHaveBeenCalledWith(
        ['/usr/local/bin/axe', 'describe-ui', '--udid', '12345678-1234-1234-1234-123456789012'],
        '[AXe]: describe-ui',
        false,
        expect.any(Object),
      );

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
      vi.mocked(getAxePath).mockReturnValue(null);

      const result = await describeUIPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
      });

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
      vi.mocked(getAxePath).mockReturnValue('/usr/local/bin/axe');
      vi.mocked(getBundledAxeEnvironment).mockReturnValue({});

      const mockExecutor = vi.fn().mockResolvedValue({
        success: false,
        output: '',
        error: 'axe command failed',
        process: { pid: 12345 },
      });

      const result = await describeUIPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
        },
        mockExecutor,
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
      vi.mocked(getAxePath).mockReturnValue('/usr/local/bin/axe');
      vi.mocked(getBundledAxeEnvironment).mockReturnValue({});

      const mockExecutor = vi
        .fn()
        .mockRejectedValue(new Error('ENOENT: no such file or directory'));

      const result = await describeUIPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
        },
        mockExecutor,
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
      vi.mocked(getAxePath).mockReturnValue('/usr/local/bin/axe');
      vi.mocked(getBundledAxeEnvironment).mockReturnValue({});

      const mockExecutor = vi.fn().mockRejectedValue(new Error('Unexpected error'));

      const result = await describeUIPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
        },
        mockExecutor,
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
      vi.mocked(getAxePath).mockReturnValue('/usr/local/bin/axe');
      vi.mocked(getBundledAxeEnvironment).mockReturnValue({});

      const mockExecutor = vi.fn().mockRejectedValue('String error');

      const result = await describeUIPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
        },
        mockExecutor,
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
