import { vi, describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import screenshotPlugin from '../../ui-testing/screenshot.ts';

// Mock file system operations
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  unlink: vi.fn(),
}));

vi.mock('os', () => ({
  tmpdir: vi.fn(() => '/tmp'),
}));

vi.mock('path', () => ({
  join: vi.fn((...args: string[]) => args.join('/')),
  dirname: vi.fn((path: string) => path.split('/').slice(0, -1).join('/')),
}));

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid-123'),
}));

describe('screenshot plugin', () => {
  let mockReadFile: Record<string, unknown>;
  let mockUnlink: Record<string, unknown>;

  beforeEach(async () => {
    const fs = await import('fs/promises');

    mockReadFile = vi.mocked(fs.readFile);
    mockUnlink = vi.mocked(fs.unlink);

    vi.clearAllMocks();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name field', () => {
      expect(screenshotPlugin.name).toBe('screenshot');
    });

    it('should have correct description field', () => {
      expect(screenshotPlugin.description).toBe(
        "Captures screenshot for visual verification. For UI coordinates, use describe_ui instead (don't determine coordinates from screenshots).",
      );
    });

    it('should have handler function', () => {
      expect(typeof screenshotPlugin.handler).toBe('function');
    });

    it('should have correct schema validation', () => {
      const schema = z.object(screenshotPlugin.schema);

      expect(
        schema.safeParse({
          simulatorUuid: '550e8400-e29b-41d4-a716-446655440000',
        }).success,
      ).toBe(true);

      expect(
        schema.safeParse({
          simulatorUuid: 123,
        }).success,
      ).toBe(false);

      expect(schema.safeParse({}).success).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should capture screenshot successfully', async () => {
      const mockExecutor = vi.fn().mockResolvedValue({
        success: true,
        output: '',
        error: undefined,
        process: { pid: 12345 },
      });

      const mockImageBuffer = Buffer.from('fake-image-data');
      mockReadFile.mockResolvedValue(mockImageBuffer);
      mockUnlink.mockResolvedValue(undefined);

      const result = await screenshotPlugin.handler(
        {
          simulatorUuid: 'test-uuid',
        },
        mockExecutor,
      );

      // Verify command was called correctly (direct execution, not shell)
      expect(mockExecutor).toHaveBeenCalledWith(
        ['xcrun', 'simctl', 'io', 'test-uuid', 'screenshot', '/tmp/screenshot_mock-uuid-123.png'],
        '[Screenshot]: screenshot',
        false,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'image',
            data: mockImageBuffer.toString('base64'),
            mimeType: 'image/png',
          },
        ],
      });
    });

    it('should handle missing simulatorUuid', async () => {
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

    it('should handle command failure', async () => {
      const mockExecutor = vi.fn().mockResolvedValue({
        success: false,
        output: '',
        error: 'Command failed',
        process: { pid: 12345 },
      });

      const result = await screenshotPlugin.handler(
        {
          simulatorUuid: 'test-uuid',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: System error executing screenshot: Failed to capture screenshot: Command failed',
          },
        ],
        isError: true,
      });
    });

    it('should handle file read failure', async () => {
      const mockExecutor = vi.fn().mockResolvedValue({
        success: true,
        output: '',
        error: undefined,
        process: { pid: 12345 },
      });

      mockReadFile.mockRejectedValue(new Error('File not found'));

      const result = await screenshotPlugin.handler(
        {
          simulatorUuid: 'test-uuid',
        },
        mockExecutor,
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

    it('should call correct command', async () => {
      const mockExecutor = vi.fn().mockResolvedValue({
        success: true,
        output: '',
        error: undefined,
        process: { pid: 12345 },
      });

      const mockImageBuffer = Buffer.from('fake-image-data');
      mockReadFile.mockResolvedValue(mockImageBuffer);
      mockUnlink.mockResolvedValue(undefined);

      await screenshotPlugin.handler(
        {
          simulatorUuid: 'test-uuid',
        },
        mockExecutor,
      );

      expect(mockExecutor).toHaveBeenCalledWith(
        ['xcrun', 'simctl', 'io', 'test-uuid', 'screenshot', '/tmp/screenshot_mock-uuid-123.png'],
        '[Screenshot]: screenshot',
        false,
      );
    });
  });
});
