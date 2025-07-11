import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';

// Import the plugin
import buildSimNameWs from '../build_sim_name_ws.ts';

// Mock external dependencies
vi.mock('../../utils/index.js', () => ({
  log: vi.fn(),
  validateRequiredParam: vi.fn(),
  createTextResponse: vi.fn(),
  executeXcodeBuildCommand: vi.fn(),
}));

describe('build_sim_name_ws tool', () => {
  let mockLog: MockedFunction<any>;
  let mockValidateRequiredParam: MockedFunction<any>;
  let mockCreateTextResponse: MockedFunction<any>;
  let mockExecuteXcodeBuildCommand: MockedFunction<any>;

  beforeEach(async () => {
    const utils = await import('../../../utils/index.js');

    mockLog = utils.log as MockedFunction<any>;
    mockValidateRequiredParam = utils.validateRequiredParam as MockedFunction<any>;
    mockCreateTextResponse = utils.createTextResponse as MockedFunction<any>;
    mockExecuteXcodeBuildCommand = utils.executeXcodeBuildCommand as MockedFunction<any>;

    vi.clearAllMocks();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(buildSimNameWs.name).toBe('build_sim_name_ws');
    });

    it('should have correct description', () => {
      expect(buildSimNameWs.description).toBe(
        "Builds an app from a workspace for a specific simulator by name. IMPORTANT: Requires workspacePath, scheme, and simulatorName. Example: build_sim_name_ws({ workspacePath: '/path/to/MyProject.xcworkspace', scheme: 'MyScheme', simulatorName: 'iPhone 16' })",
      );
    });

    it('should have handler function', () => {
      expect(typeof buildSimNameWs.handler).toBe('function');
    });

    it('should have correct schema with required and optional fields', () => {
      const schema = z.object(buildSimNameWs.schema);

      // Valid inputs
      expect(
        schema.safeParse({
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        }).success,
      ).toBe(true);

      expect(
        schema.safeParse({
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
          configuration: 'Release',
          derivedDataPath: '/path/to/derived',
          extraArgs: ['--verbose'],
          useLatestOS: true,
          preferXcodebuild: false,
        }).success,
      ).toBe(true);

      // Invalid inputs - missing required fields
      expect(
        schema.safeParse({
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
        }).success,
      ).toBe(false);

      expect(
        schema.safeParse({
          workspacePath: '/path/to/workspace',
          simulatorName: 'iPhone 16',
        }).success,
      ).toBe(false);

      expect(
        schema.safeParse({
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        }).success,
      ).toBe(false);

      // Invalid types
      expect(
        schema.safeParse({
          workspacePath: 123,
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        }).success,
      ).toBe(false);

      expect(
        schema.safeParse({
          workspacePath: '/path/to/workspace',
          scheme: 123,
          simulatorName: 'iPhone 16',
        }).success,
      ).toBe(false);

      expect(
        schema.safeParse({
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorName: 123,
        }).success,
      ).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should handle validation failure for workspacePath', async () => {
      mockValidateRequiredParam.mockReturnValueOnce({
        isValid: false,
        errorResponse: {
          content: [
            {
              type: 'text',
              text: 'workspacePath is required',
            },
          ],
        },
      });

      const result = await buildSimNameWs.handler({
        workspacePath: '',
        scheme: 'MyScheme',
        simulatorName: 'iPhone 16',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'workspacePath is required',
          },
        ],
      });
    });

    it('should handle validation failure for scheme', async () => {
      mockValidateRequiredParam
        .mockReturnValueOnce({
          isValid: true,
          errorResponse: null,
        })
        .mockReturnValueOnce({
          isValid: false,
          errorResponse: {
            content: [
              {
                type: 'text',
                text: 'scheme is required',
              },
            ],
          },
        });

      const result = await buildSimNameWs.handler({
        workspacePath: '/path/to/workspace',
        scheme: '',
        simulatorName: 'iPhone 16',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'scheme is required',
          },
        ],
      });
    });

    it('should handle validation failure for simulatorName', async () => {
      mockValidateRequiredParam
        .mockReturnValueOnce({
          isValid: true,
          errorResponse: null,
        })
        .mockReturnValueOnce({
          isValid: true,
          errorResponse: null,
        })
        .mockReturnValueOnce({
          isValid: false,
          errorResponse: {
            content: [
              {
                type: 'text',
                text: 'simulatorName is required',
              },
            ],
          },
        });

      const result = await buildSimNameWs.handler({
        workspacePath: '/path/to/workspace',
        scheme: 'MyScheme',
        simulatorName: '',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'simulatorName is required',
          },
        ],
      });
    });

    it('should handle successful build', async () => {
      mockValidateRequiredParam.mockReturnValue({
        isValid: true,
        errorResponse: null,
      });

      mockExecuteXcodeBuildCommand.mockResolvedValue({
        isError: false,
        content: [
          {
            type: 'text',
            text: 'Build succeeded',
          },
        ],
      });

      const result = await buildSimNameWs.handler({
        workspacePath: '/path/to/workspace',
        scheme: 'MyScheme',
        simulatorName: 'iPhone 16',
      });

      expect(result).toEqual({
        isError: false,
        content: [
          {
            type: 'text',
            text: 'Build succeeded',
          },
        ],
      });
    });

    it('should handle build failure', async () => {
      mockValidateRequiredParam.mockReturnValue({
        isValid: true,
        errorResponse: null,
      });

      mockExecuteXcodeBuildCommand.mockResolvedValue({
        isError: true,
        content: [
          {
            type: 'text',
            text: 'Build failed with error',
          },
        ],
      });

      const result = await buildSimNameWs.handler({
        workspacePath: '/path/to/workspace',
        scheme: 'MyScheme',
        simulatorName: 'iPhone 16',
      });

      expect(result).toEqual({
        isError: true,
        content: [
          {
            type: 'text',
            text: 'Build failed with error',
          },
        ],
      });
    });

    it('should handle exception with Error object', async () => {
      mockValidateRequiredParam.mockReturnValue({
        isValid: true,
        errorResponse: null,
      });

      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'Error during iOS Simulator Build build: Build system error',
          },
        ],
        isError: true,
      });

      const result = await buildSimNameWs.handler({
        workspacePath: '/path/to/workspace',
        scheme: 'MyScheme',
        simulatorName: 'iPhone 16',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error during iOS Simulator Build build: Build system error',
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

      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'Error during iOS Simulator Build build: String error',
          },
        ],
        isError: true,
      });

      const result = await buildSimNameWs.handler({
        workspacePath: '/path/to/workspace',
        scheme: 'MyScheme',
        simulatorName: 'iPhone 16',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error during iOS Simulator Build build: String error',
          },
        ],
        isError: true,
      });
    });
  });
});
