import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';

// Import the plugin
import describeUi from './describe_ui.ts';

// Mock external dependencies
vi.mock('../../src/utils/index.js', () => ({
  log: vi.fn(),
  createTextResponse: vi.fn(),
  validateRequiredParam: vi.fn(),
  DependencyError: class DependencyError extends Error {},
  AxeError: class AxeError extends Error {
    constructor(message: string, command: string, output: string, simulatorUuid: string) {
      super(message);
      this.axeOutput = output;
      this.name = 'AxeError';
    }
    axeOutput: string;
  },
  SystemError: class SystemError extends Error {
    constructor(message: string, originalError?: Error) {
      super(message);
      this.originalError = originalError;
      this.name = 'SystemError';
    }
    originalError?: Error;
  },
  createErrorResponse: vi.fn(),
  executeCommand: vi.fn(),
  createAxeNotAvailableResponse: vi.fn(),
  getAxePath: vi.fn(),
  getBundledAxeEnvironment: vi.fn(),
}));

describe('describe_ui tool', () => {
  let mockLog: MockedFunction<any>;
  let mockValidateRequiredParam: MockedFunction<any>;
  let mockExecuteCommand: MockedFunction<any>;
  let mockGetAxePath: MockedFunction<any>;
  let mockCreateAxeNotAvailableResponse: MockedFunction<any>;
  let mockCreateErrorResponse: MockedFunction<any>;

  beforeEach(async () => {
    const utils = await import('../../src/utils/index.js');

    mockLog = utils.log as MockedFunction<any>;
    mockValidateRequiredParam = utils.validateRequiredParam as MockedFunction<any>;
    mockExecuteCommand = utils.executeCommand as MockedFunction<any>;
    mockGetAxePath = utils.getAxePath as MockedFunction<any>;
    mockCreateAxeNotAvailableResponse = utils.createAxeNotAvailableResponse as MockedFunction<any>;
    mockCreateErrorResponse = utils.createErrorResponse as MockedFunction<any>;

    vi.clearAllMocks();
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
      mockValidateRequiredParam.mockReturnValue({
        isValid: false,
        errorResponse: {
          content: [
            {
              type: 'text',
              text: 'simulatorUuid is required',
            },
          ],
        },
      });

      const result = await describeUi.handler({ simulatorUuid: '' });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'simulatorUuid is required',
          },
        ],
      });
    });

    it('should handle successful UI description', async () => {
      mockValidateRequiredParam.mockReturnValue({
        isValid: true,
        errorResponse: null,
      });

      mockGetAxePath.mockReturnValue('/path/to/axe');

      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: '{"root": {"elements": []}}',
        error: '',
      });

      const result = await describeUi.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789abc',
      });

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
      mockValidateRequiredParam.mockReturnValue({
        isValid: true,
        errorResponse: null,
      });

      mockGetAxePath.mockReturnValue(null);

      mockCreateAxeNotAvailableResponse.mockReturnValue({
        content: [
          {
            type: 'text',
            text: 'AXe tools are not available',
          },
        ],
        isError: true,
      });

      const result = await describeUi.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789abc',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'AXe tools are not available',
          },
        ],
        isError: true,
      });
    });

    it('should handle AXe command failure', async () => {
      mockValidateRequiredParam.mockReturnValue({
        isValid: true,
        errorResponse: null,
      });

      mockGetAxePath.mockReturnValue('/path/to/axe');

      mockExecuteCommand.mockResolvedValue({
        success: false,
        output: '',
        error: 'Simulator not found',
      });

      mockCreateErrorResponse.mockReturnValue({
        content: [
          {
            type: 'text',
            text: "Failed to get accessibility hierarchy: axe command 'describe-ui' failed.",
          },
        ],
        isError: true,
      });

      const result = await describeUi.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789abc',
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

    it('should handle exception with Error object', async () => {
      mockValidateRequiredParam.mockReturnValue({
        isValid: true,
        errorResponse: null,
      });

      mockGetAxePath.mockReturnValue('/path/to/axe');

      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: 'Command execution failed',
      });

      mockCreateErrorResponse.mockReturnValue({
        content: [
          {
            type: 'text',
            text: 'An unexpected error occurred: Command execution failed',
          },
        ],
        isError: true,
      });

      const result = await describeUi.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789abc',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'An unexpected error occurred: Command execution failed',
          },
        ],
        isError: true,
      });
    });

    it('should handle exception with string error', async () => {
      mockValidateRequiredParam.mockReturnValue({
        isValid: true,
        errorResponse: null,
      });

      mockGetAxePath.mockReturnValue('/path/to/axe');

      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: 'String error',
      });

      mockCreateErrorResponse.mockReturnValue({
        content: [
          {
            type: 'text',
            text: 'An unexpected error occurred: String error',
          },
        ],
        isError: true,
      });

      const result = await describeUi.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789abc',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'An unexpected error occurred: String error',
          },
        ],
        isError: true,
      });
    });
  });
});
