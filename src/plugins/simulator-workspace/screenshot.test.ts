import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';
import screenshotPlugin from './screenshot.ts';

vi.mock('../../src/utils/command.ts', () => ({
  executeCommand: vi.fn(),
}));

vi.mock('../../src/utils/logger.ts', () => ({
  log: vi.fn(),
}));

vi.mock('../../src/utils/index.js', () => ({
  log: vi.fn(),
  validateRequiredParam: vi.fn(),
  executeCommand: vi.fn(),
  SystemError: class SystemError extends Error {
    constructor(message: string, originalError?: Error) {
      super(message);
      this.name = 'SystemError';
      this.originalError = originalError;
    }
  },
  createErrorResponse: vi.fn(),
}));

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
  let mockExecuteCommand: MockedFunction<any>;
  let mockValidateRequiredParam: MockedFunction<any>;
  let mockReadFile: MockedFunction<any>;
  let mockUnlink: MockedFunction<any>;
  let mockCreateErrorResponse: MockedFunction<any>;

  beforeEach(async () => {
    const fs = await import('fs/promises');
    mockReadFile = fs.readFile as MockedFunction<any>;
    mockUnlink = fs.unlink as MockedFunction<any>;

    const utils = await import('../../src/utils/index.js');
    mockExecuteCommand = utils.executeCommand as MockedFunction<any>;
    mockValidateRequiredParam = utils.validateRequiredParam as MockedFunction<any>;
    mockCreateErrorResponse = utils.createErrorResponse as MockedFunction<any>;

    mockValidateRequiredParam.mockReturnValue({
      isValid: true,
      errorResponse: null,
    });

    mockCreateErrorResponse.mockImplementation((text: string) => ({
      content: [{ type: 'text', text }],
      isError: true,
    }));

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
      mockExecuteCommand.mockResolvedValue({
        success: true,
        stdout: '',
        stderr: '',
      });

      const mockImageBuffer = Buffer.from('fake-image-data');
      mockReadFile.mockResolvedValue(mockImageBuffer);
      mockUnlink.mockResolvedValue(undefined);

      const result = await screenshotPlugin.handler({
        simulatorUuid: 'test-uuid',
      });

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
      mockValidateRequiredParam.mockReturnValueOnce({
        isValid: false,
        errorResponse: {
          content: [{ type: 'text', text: 'simulatorUuid is required' }],
          isError: true,
        },
      });

      const result = await screenshotPlugin.handler({});

      expect(result).toEqual({
        content: [{ type: 'text', text: 'simulatorUuid is required' }],
        isError: true,
      });
    });

    it('should handle command failure', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: 'Command failed',
        output: '',
      });

      const result = await screenshotPlugin.handler({
        simulatorUuid: 'test-uuid',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'System error executing screenshot: Failed to capture screenshot: Command failed',
          },
        ],
        isError: true,
      });
    });

    it('should handle file read failure', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        stdout: '',
        stderr: '',
      });

      mockReadFile.mockRejectedValue(new Error('File not found'));

      const result = await screenshotPlugin.handler({
        simulatorUuid: 'test-uuid',
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

    it('should call correct command', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        stdout: '',
        stderr: '',
      });

      const mockImageBuffer = Buffer.from('fake-image-data');
      mockReadFile.mockResolvedValue(mockImageBuffer);
      mockUnlink.mockResolvedValue(undefined);

      await screenshotPlugin.handler({
        simulatorUuid: 'test-uuid',
      });

      expect(mockExecuteCommand).toHaveBeenCalledWith(
        ['xcrun', 'simctl', 'io', 'test-uuid', 'screenshot', '/tmp/screenshot_mock-uuid-123.png'],
        '[Screenshot]: screenshot',
        false,
      );
    });
  });
});
