/**
 * Screenshot Tool Tests - Comprehensive test coverage for screenshot.ts
 *
 * This test file provides complete coverage for the screenshot tool production function:
 * - registerScreenshotTool: Main function to register the screenshot tool with MCP server
 *
 * Tests follow the canonical testing patterns from CLAUDE.md with deterministic
 * response validation, proper mock setup, and comprehensive functionality testing.
 *
 * The screenshot tool captures screenshots from iOS Simulator using xcrun simctl
 * and returns them as Base64-encoded image data in the tool response.
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { readFile, unlink } from 'fs/promises';
import { registerScreenshotTool } from './index.js';

// Mock external dependencies only
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  unlink: vi.fn(),
}));

vi.mock('os', () => ({
  tmpdir: vi.fn(() => '/tmp'),
}));

// Mock logger to prevent real logging during tests
vi.mock('../../utils/logger.js', () => ({
  log: vi.fn(),
}));

// Mock validation utilities
vi.mock('../../utils/validation.js', () => ({
  validateRequiredParam: vi.fn(),
}));

// Mock error utilities
vi.mock('../../utils/errors.js', () => ({
  SystemError: class SystemError extends Error {
    constructor(
      message: string,
      public originalError?: Error,
    ) {
      super(message);
      this.name = 'SystemError';
    }
  },
  createErrorResponse: vi.fn(),
}));

// Mock command execution
vi.mock('../../utils/command.js', () => ({
  executeCommand: vi.fn(),
}));

// Mock UUID generation to be deterministic
vi.mock('uuid', () => ({
  v4: vi.fn(() => '550e8400-e29b-41d4-a716-446655440000'),
}));

// Import mocked functions
import { validateRequiredParam } from '../../utils/validation.js';
import { createErrorResponse } from '../../utils/errors.js';
import { executeCommand } from '../../utils/command.js';

const mockReadFile = readFile as MockedFunction<typeof readFile>;
const mockUnlink = unlink as MockedFunction<typeof unlink>;
const mockValidateRequiredParam = validateRequiredParam as MockedFunction<
  typeof validateRequiredParam
>;
const mockCreateErrorResponse = createErrorResponse as MockedFunction<typeof createErrorResponse>;
const mockExecuteCommand = executeCommand as MockedFunction<typeof executeCommand>;

describe('screenshot tool tests', () => {
  let screenshotToolHandler: (params: any) => Promise<any>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful validation by default
    mockValidateRequiredParam.mockReturnValue({
      isValid: true,
      errorResponse: undefined,
    });

    // Mock successful command execution by default
    mockExecuteCommand.mockResolvedValue({
      success: true,
      output: 'Screenshot captured successfully',
      error: undefined,
    });

    // Mock successful file operations
    const mockImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64',
    );
    mockReadFile.mockResolvedValue(mockImageBuffer);
    mockUnlink.mockResolvedValue(undefined);

    // Mock error response creation
    mockCreateErrorResponse.mockImplementation((message: string) => ({
      content: [{ type: 'text', text: message }],
      isError: true,
    }));

    // Register the tool and extract the handler
    const mockServer = {
      tool: vi.fn(),
    } as any;

    registerScreenshotTool(mockServer);

    // Extract the handler from the server.tool call
    expect(mockServer.tool).toHaveBeenCalledWith(
      'screenshot',
      expect.any(String),
      expect.any(Object),
      expect.any(Function),
    );

    screenshotToolHandler = mockServer.tool.mock.calls[0][3]; // Handler is the 4th argument
  });

  describe('registerScreenshotTool function', () => {
    it('should register screenshot tool with correct parameters', () => {
      const mockServer = {
        tool: vi.fn(),
      } as any;

      registerScreenshotTool(mockServer);

      expect(mockServer.tool).toHaveBeenCalledWith(
        'screenshot',
        "Captures screenshot for visual verification. For UI coordinates, use describe_ui instead (don't determine coordinates from screenshots).",
        expect.objectContaining({
          simulatorUuid: expect.any(Object),
        }),
        expect.any(Function),
      );
    });
  });

  describe('parameter validation', () => {
    it('should reject missing required simulatorUuid parameter', async () => {
      mockValidateRequiredParam.mockReturnValue({
        isValid: false,
        errorResponse: {
          content: [{ type: 'text', text: '❌ Required field: simulatorUuid' }],
          isError: true,
        },
      });

      const result = await screenshotToolHandler({});

      expect(result.content).toEqual([{ type: 'text', text: '❌ Required field: simulatorUuid' }]);
      expect(result.isError).toBe(true);
      expect(mockValidateRequiredParam).toHaveBeenCalledWith('simulatorUuid', undefined);
    });

    it('should reject invalid UUID format', async () => {
      mockValidateRequiredParam.mockReturnValue({
        isValid: false,
        errorResponse: {
          content: [
            {
              type: 'text',
              text: 'Invalid Simulator UUID format. Expected format: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX',
            },
          ],
          isError: true,
        },
      });

      const result = await screenshotToolHandler({
        simulatorUuid: 'invalid-uuid',
      });

      expect(result.content).toEqual([
        {
          type: 'text',
          text: 'Invalid Simulator UUID format. Expected format: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX',
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should accept valid UUID format', async () => {
      const params = { simulatorUuid: '12345678-1234-1234-1234-123456789012' };
      const result = await screenshotToolHandler(params);

      expect(result.content).toEqual([
        {
          type: 'image',
          data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          mimeType: 'image/png',
        },
      ]);
      expect(result.isError).toBe(undefined);
      expect(mockValidateRequiredParam).toHaveBeenCalledWith(
        'simulatorUuid',
        '12345678-1234-1234-1234-123456789012',
      );
    });
  });

  describe('success scenarios', () => {
    it('should capture screenshot successfully with valid UUID', async () => {
      const params = { simulatorUuid: '12345678-1234-1234-1234-123456789012' };
      const result = await screenshotToolHandler(params);

      expect(result.content).toEqual([
        {
          type: 'image',
          data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          mimeType: 'image/png',
        },
      ]);
      expect(result.isError).toBe(undefined);
    });

    it('should call executeCommand with correct arguments', async () => {
      const params = { simulatorUuid: '12345678-1234-1234-1234-123456789012' };
      await screenshotToolHandler(params);

      expect(mockExecuteCommand).toHaveBeenCalledWith(
        [
          'xcrun',
          'simctl',
          'io',
          '12345678-1234-1234-1234-123456789012',
          'screenshot',
          '/tmp/screenshot_550e8400-e29b-41d4-a716-446655440000.png',
        ],
        '[Screenshot]: screenshot',
        false,
      );
    });

    it('should read the screenshot file and encode as base64', async () => {
      const params = { simulatorUuid: '12345678-1234-1234-1234-123456789012' };
      await screenshotToolHandler(params);

      expect(mockReadFile).toHaveBeenCalledWith(
        '/tmp/screenshot_550e8400-e29b-41d4-a716-446655440000.png',
      );
    });

    it('should return image content with correct structure', async () => {
      const params = { simulatorUuid: '12345678-1234-1234-1234-123456789012' };
      const result = await screenshotToolHandler(params);

      // Verify the response structure matches the expected image response format
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toHaveProperty('type', 'image');
      expect(result.content[0]).toHaveProperty('data');
      expect(result.content[0]).toHaveProperty('mimeType', 'image/png');
      expect(typeof result.content[0].data).toBe('string');
      expect(result.isError).toBe(undefined);
    });

    it('should clean up temporary file after processing', async () => {
      const params = { simulatorUuid: '12345678-1234-1234-1234-123456789012' };
      await screenshotToolHandler(params);

      expect(mockUnlink).toHaveBeenCalledWith(
        '/tmp/screenshot_550e8400-e29b-41d4-a716-446655440000.png',
      );
    });
  });

  describe('error scenarios', () => {
    it('should handle command execution failure', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: false,
        output: '',
        error: 'xcrun: error: simctl command failed',
      });

      const params = { simulatorUuid: '12345678-1234-1234-1234-123456789012' };
      const result = await screenshotToolHandler(params);

      expect(result.content).toEqual([
        {
          type: 'text',
          text: 'System error executing screenshot: Failed to capture screenshot: xcrun: error: simctl command failed',
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should handle file read failure', async () => {
      mockReadFile.mockRejectedValue(new Error('ENOENT: no such file or directory'));

      const params = { simulatorUuid: '12345678-1234-1234-1234-123456789012' };
      const result = await screenshotToolHandler(params);

      expect(result.content).toEqual([
        {
          type: 'text',
          text: 'Screenshot captured but failed to process image file: ENOENT: no such file or directory',
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should handle unexpected errors gracefully', async () => {
      mockExecuteCommand.mockRejectedValue(new Error('Something went wrong'));

      const params = { simulatorUuid: '12345678-1234-1234-1234-123456789012' };
      const result = await screenshotToolHandler(params);

      expect(result.content).toEqual([
        { type: 'text', text: 'An unexpected error occurred: Something went wrong' },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should handle cleanup failure gracefully', async () => {
      mockUnlink.mockRejectedValue(new Error('Permission denied'));

      const params = { simulatorUuid: '12345678-1234-1234-1234-123456789012' };
      const result = await screenshotToolHandler(params);

      // The screenshot should still be returned successfully despite cleanup failure
      expect(result.content).toEqual([
        {
          type: 'image',
          data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          mimeType: 'image/png',
        },
      ]);
      expect(result.isError).toBe(undefined);
    });
  });

  describe('command generation validation', () => {
    it('should generate correct command arguments', async () => {
      const params = { simulatorUuid: 'ABCDEF12-3456-7890-ABCD-EF1234567890' };
      await screenshotToolHandler(params);

      expect(mockExecuteCommand).toHaveBeenCalledWith(
        [
          'xcrun',
          'simctl',
          'io',
          'ABCDEF12-3456-7890-ABCD-EF1234567890',
          'screenshot',
          '/tmp/screenshot_550e8400-e29b-41d4-a716-446655440000.png',
        ],
        '[Screenshot]: screenshot',
        false,
      );
    });

    it('should generate unique temporary file paths using UUID', async () => {
      const params = { simulatorUuid: '12345678-1234-1234-1234-123456789012' };
      await screenshotToolHandler(params);

      // Verify the path pattern includes the UUID
      expect(mockReadFile).toHaveBeenCalledWith(
        '/tmp/screenshot_550e8400-e29b-41d4-a716-446655440000.png',
      );
      expect(mockUnlink).toHaveBeenCalledWith(
        '/tmp/screenshot_550e8400-e29b-41d4-a716-446655440000.png',
      );
    });
  });

  describe('file cleanup validation', () => {
    it('should attempt to clean up temporary file after processing', async () => {
      const params = { simulatorUuid: '12345678-1234-1234-1234-123456789012' };
      await screenshotToolHandler(params);

      expect(mockUnlink).toHaveBeenCalledWith(
        '/tmp/screenshot_550e8400-e29b-41d4-a716-446655440000.png',
      );
    });

    it('should not fail if cleanup throws error', async () => {
      mockUnlink.mockRejectedValue(new Error('Permission denied'));

      const params = { simulatorUuid: '12345678-1234-1234-1234-123456789012' };
      const result = await screenshotToolHandler(params);

      // Should still return successful screenshot despite cleanup failure
      expect(result.isError).toBe(undefined);
      expect(result.content[0].type).toBe('image');
    });
  });

  describe('integration scenarios', () => {
    it('should support screenshot capture workflow for UI testing', async () => {
      const testScenarios = [
        { name: 'iPhone 15 Pro', uuid: '12345678-1234-1234-1234-123456789012' },
        { name: 'iPad Air', uuid: 'ABCDEF12-3456-7890-ABCD-EF1234567890' },
        { name: 'Apple Watch', uuid: '11111111-2222-3333-4444-555555555555' },
      ];

      for (const scenario of testScenarios) {
        const result = await screenshotToolHandler({
          simulatorUuid: scenario.uuid,
        });

        expect(result.content).toEqual([
          {
            type: 'image',
            data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
            mimeType: 'image/png',
          },
        ]);
        expect(result.isError).toBe(undefined);
      }
    });

    it('should handle rapid consecutive screenshot captures', async () => {
      const uuid = '12345678-1234-1234-1234-123456789012';
      const promises = [];

      for (let i = 0; i < 3; i++) {
        promises.push(screenshotToolHandler({ simulatorUuid: uuid }));
      }

      const results = await Promise.all(promises);

      for (const result of results) {
        expect(result.content).toEqual([
          {
            type: 'image',
            data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
            mimeType: 'image/png',
          },
        ]);
        expect(result.isError).toBe(undefined);
      }
    });
  });

  describe('tool registration validation', () => {
    it('should register with correct tool name and description', () => {
      const mockServer = {
        tool: vi.fn(),
      } as any;

      registerScreenshotTool(mockServer);

      expect(mockServer.tool).toHaveBeenCalledWith(
        'screenshot',
        "Captures screenshot for visual verification. For UI coordinates, use describe_ui instead (don't determine coordinates from screenshots).",
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('should have correct schema definition', () => {
      const mockServer = {
        tool: vi.fn(),
      } as any;

      registerScreenshotTool(mockServer);

      const schema = mockServer.tool.mock.calls[0][2];
      expect(schema).toHaveProperty('simulatorUuid');
    });
  });
});
