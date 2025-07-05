import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';

// Import the plugin
import getSimAppPathIdWs from './get_sim_app_path_id_ws.ts';

// Mock external dependencies
vi.mock('../../src/utils/index.js', () => ({
  log: vi.fn(),
  validateRequiredParam: vi.fn(),
  createTextResponse: vi.fn(),
  executeCommand: vi.fn(),
}));

describe('get_sim_app_path_id_ws tool', () => {
  let mockLog: MockedFunction<any>;
  let mockValidateRequiredParam: MockedFunction<any>;
  let mockCreateTextResponse: MockedFunction<any>;
  let mockExecuteCommand: MockedFunction<any>;

  beforeEach(async () => {
    const utils = await import('../../src/utils/index.js');

    mockLog = utils.log as MockedFunction<any>;
    mockValidateRequiredParam = utils.validateRequiredParam as MockedFunction<any>;
    mockCreateTextResponse = utils.createTextResponse as MockedFunction<any>;
    mockExecuteCommand = utils.executeCommand as MockedFunction<any>;

    vi.clearAllMocks();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(getSimAppPathIdWs.name).toBe('get_sim_app_path_id_ws');
    });

    it('should have correct description', () => {
      expect(getSimAppPathIdWs.description).toBe(
        "Gets the app bundle path for a simulator by UUID using a workspace. IMPORTANT: Requires workspacePath, scheme, platform, and simulatorId. Example: get_sim_app_path_id_ws({ workspacePath: '/path/to/workspace', scheme: 'MyScheme', platform: 'iOS Simulator', simulatorId: 'SIMULATOR_UUID' })",
      );
    });

    it('should have handler function', () => {
      expect(typeof getSimAppPathIdWs.handler).toBe('function');
    });

    it('should have correct schema with required and optional fields', () => {
      const schema = z.object(getSimAppPathIdWs.schema);

      // Valid inputs
      expect(
        schema.safeParse({
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorId: 'test-uuid-123',
        }).success,
      ).toBe(true);

      expect(
        schema.safeParse({
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          platform: 'tvOS Simulator',
          simulatorId: 'test-uuid-123',
          configuration: 'Release',
          useLatestOS: false,
        }).success,
      ).toBe(true);

      // Invalid inputs - missing required fields
      expect(
        schema.safeParse({
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
        }).success,
      ).toBe(false);

      expect(
        schema.safeParse({
          workspacePath: '/path/to/workspace',
          platform: 'iOS Simulator',
          simulatorId: 'test-uuid-123',
        }).success,
      ).toBe(false);

      // Invalid platform
      expect(
        schema.safeParse({
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          platform: 'macOS',
          simulatorId: 'test-uuid-123',
        }).success,
      ).toBe(false);

      // Invalid types
      expect(
        schema.safeParse({
          workspacePath: 123,
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorId: 'test-uuid-123',
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

      const result = await getSimAppPathIdWs.handler({
        workspacePath: '',
        scheme: 'MyScheme',
        platform: 'iOS Simulator',
        simulatorId: 'test-uuid-123',
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

    it('should handle successful app path retrieval for iOS Simulator', async () => {
      mockValidateRequiredParam.mockReturnValue({
        isValid: true,
        errorResponse: null,
      });

      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'BUILT_PRODUCTS_DIR = /path/to/build\nFULL_PRODUCT_NAME = MyApp.app\n',
      });

      const result = await getSimAppPathIdWs.handler({
        workspacePath: '/path/to/workspace',
        scheme: 'MyScheme',
        platform: 'iOS Simulator',
        simulatorId: 'test-uuid-123',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ App path retrieved successfully: /path/to/build/MyApp.app',
          },
          {
            type: 'text',
            text: `Next Steps:
1. Get bundle ID: get_app_bundle_id({ appPath: "/path/to/build/MyApp.app" })
2. Boot simulator: boot_simulator({ simulatorUuid: "SIMULATOR_UUID" })
3. Install app: install_app_in_simulator({ simulatorUuid: "SIMULATOR_UUID", appPath: "/path/to/build/MyApp.app" })
4. Launch app: launch_app_in_simulator({ simulatorUuid: "SIMULATOR_UUID", bundleId: "BUNDLE_ID" })`,
          },
        ],
      });
    });

    it('should handle successful app path retrieval for watchOS Simulator', async () => {
      mockValidateRequiredParam.mockReturnValue({
        isValid: true,
        errorResponse: null,
      });

      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'BUILT_PRODUCTS_DIR = /path/to/watch/build\nFULL_PRODUCT_NAME = WatchApp.app\n',
      });

      const result = await getSimAppPathIdWs.handler({
        workspacePath: '/path/to/workspace',
        scheme: 'WatchScheme',
        platform: 'watchOS Simulator',
        simulatorId: 'watch-uuid-456',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ App path retrieved successfully: /path/to/watch/build/WatchApp.app',
          },
          {
            type: 'text',
            text: `Next Steps:
1. Get bundle ID: get_app_bundle_id({ appPath: "/path/to/watch/build/WatchApp.app" })
2. Boot simulator: boot_simulator({ simulatorUuid: "SIMULATOR_UUID" })
3. Install app: install_app_in_simulator({ simulatorUuid: "SIMULATOR_UUID", appPath: "/path/to/watch/build/WatchApp.app" })
4. Launch app: launch_app_in_simulator({ simulatorUuid: "SIMULATOR_UUID", bundleId: "BUNDLE_ID" })`,
          },
        ],
      });
    });

    it('should handle successful app path retrieval for tvOS Simulator', async () => {
      mockValidateRequiredParam.mockReturnValue({
        isValid: true,
        errorResponse: null,
      });

      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'BUILT_PRODUCTS_DIR = /path/to/tv/build\nFULL_PRODUCT_NAME = TVApp.app\n',
      });

      const result = await getSimAppPathIdWs.handler({
        workspacePath: '/path/to/workspace',
        scheme: 'TVScheme',
        platform: 'tvOS Simulator',
        simulatorId: 'tv-uuid-789',
        configuration: 'Release',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ App path retrieved successfully: /path/to/tv/build/TVApp.app',
          },
          {
            type: 'text',
            text: `Next Steps:
1. Get bundle ID: get_app_bundle_id({ appPath: "/path/to/tv/build/TVApp.app" })
2. Boot simulator: boot_simulator({ simulatorUuid: "SIMULATOR_UUID" })
3. Install app: install_app_in_simulator({ simulatorUuid: "SIMULATOR_UUID", appPath: "/path/to/tv/build/TVApp.app" })
4. Launch app: launch_app_in_simulator({ simulatorUuid: "SIMULATOR_UUID", bundleId: "BUNDLE_ID" })`,
          },
        ],
      });
    });

    it('should handle successful app path retrieval for visionOS Simulator', async () => {
      mockValidateRequiredParam.mockReturnValue({
        isValid: true,
        errorResponse: null,
      });

      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'BUILT_PRODUCTS_DIR = /path/to/vision/build\nFULL_PRODUCT_NAME = VisionApp.app\n',
      });

      const result = await getSimAppPathIdWs.handler({
        workspacePath: '/path/to/workspace',
        scheme: 'VisionScheme',
        platform: 'visionOS Simulator',
        simulatorId: 'vision-uuid-101',
        useLatestOS: true,
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ App path retrieved successfully: /path/to/vision/build/VisionApp.app',
          },
          {
            type: 'text',
            text: `Next Steps:
1. Get bundle ID: get_app_bundle_id({ appPath: "/path/to/vision/build/VisionApp.app" })
2. Boot simulator: boot_simulator({ simulatorUuid: "SIMULATOR_UUID" })
3. Install app: install_app_in_simulator({ simulatorUuid: "SIMULATOR_UUID", appPath: "/path/to/vision/build/VisionApp.app" })
4. Launch app: launch_app_in_simulator({ simulatorUuid: "SIMULATOR_UUID", bundleId: "BUNDLE_ID" })`,
          },
        ],
      });
    });

    it('should handle command failure', async () => {
      mockValidateRequiredParam.mockReturnValue({
        isValid: true,
        errorResponse: null,
      });

      mockExecuteCommand.mockResolvedValue({
        success: false,
        output: '',
        error: 'Build settings command failed',
      });

      mockCreateTextResponse.mockReturnValue({
        content: [
          {
            type: 'text',
            text: 'Failed to get app path: Build settings command failed',
          },
        ],
        isError: true,
      });

      const result = await getSimAppPathIdWs.handler({
        workspacePath: '/path/to/workspace',
        scheme: 'MyScheme',
        platform: 'iOS Simulator',
        simulatorId: 'test-uuid-123',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to get app path: Build settings command failed',
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

      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: 'Command execution failed',
      });

      mockCreateTextResponse.mockReturnValue({
        content: [
          {
            type: 'text',
            text: 'Failed to get app path: Command execution failed',
          },
        ],
        isError: true,
      });

      const result = await getSimAppPathIdWs.handler({
        workspacePath: '/path/to/workspace',
        scheme: 'MyScheme',
        platform: 'iOS Simulator',
        simulatorId: 'test-uuid-123',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to get app path: Command execution failed',
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

      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: 'String error',
      });

      mockCreateTextResponse.mockReturnValue({
        content: [
          {
            type: 'text',
            text: 'Failed to get app path: String error',
          },
        ],
        isError: true,
      });

      const result = await getSimAppPathIdWs.handler({
        workspacePath: '/path/to/workspace',
        scheme: 'MyScheme',
        platform: 'iOS Simulator',
        simulatorId: 'test-uuid-123',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to get app path: String error',
          },
        ],
        isError: true,
      });
    });

    it('should handle missing output from executeCommand', async () => {
      mockValidateRequiredParam.mockReturnValue({
        isValid: true,
        errorResponse: null,
      });

      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: null,
      });

      mockCreateTextResponse.mockReturnValue({
        content: [
          {
            type: 'text',
            text: 'Failed to extract build settings output from the result.',
          },
        ],
        isError: true,
      });

      const result = await getSimAppPathIdWs.handler({
        workspacePath: '/path/to/workspace',
        scheme: 'MyScheme',
        platform: 'iOS Simulator',
        simulatorId: 'test-uuid-123',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to extract build settings output from the result.',
          },
        ],
        isError: true,
      });
    });

    it('should handle missing build settings in output', async () => {
      mockValidateRequiredParam.mockReturnValue({
        isValid: true,
        errorResponse: null,
      });

      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Some output without build settings',
      });

      mockCreateTextResponse.mockReturnValue({
        content: [
          {
            type: 'text',
            text: 'Failed to extract app path from build settings. Make sure the app has been built first.',
          },
        ],
        isError: true,
      });

      const result = await getSimAppPathIdWs.handler({
        workspacePath: '/path/to/workspace',
        scheme: 'MyScheme',
        platform: 'iOS Simulator',
        simulatorId: 'test-uuid-123',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to extract app path from build settings. Make sure the app has been built first.',
          },
        ],
        isError: true,
      });
    });

    it('should handle exception in catch block with Error object', async () => {
      mockValidateRequiredParam.mockReturnValue({
        isValid: true,
        errorResponse: null,
      });

      const testError = new Error('Test exception');
      mockExecuteCommand.mockRejectedValue(testError);

      mockCreateTextResponse.mockReturnValue({
        content: [
          {
            type: 'text',
            text: 'Error retrieving app path: Test exception',
          },
        ],
        isError: true,
      });

      const result = await getSimAppPathIdWs.handler({
        workspacePath: '/path/to/workspace',
        scheme: 'MyScheme',
        platform: 'iOS Simulator',
        simulatorId: 'test-uuid-123',
      });

      expect(mockLog).toHaveBeenCalledWith('error', 'Error retrieving app path: Test exception');
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error retrieving app path: Test exception',
          },
        ],
        isError: true,
      });
    });

    it('should handle exception in catch block with string error', async () => {
      mockValidateRequiredParam.mockReturnValue({
        isValid: true,
        errorResponse: null,
      });

      const stringError = 'String exception';
      mockExecuteCommand.mockRejectedValue(stringError);

      mockCreateTextResponse.mockReturnValue({
        content: [
          {
            type: 'text',
            text: 'Error retrieving app path: String exception',
          },
        ],
        isError: true,
      });

      const result = await getSimAppPathIdWs.handler({
        workspacePath: '/path/to/workspace',
        scheme: 'MyScheme',
        platform: 'iOS Simulator',
        simulatorId: 'test-uuid-123',
      });

      expect(mockLog).toHaveBeenCalledWith('error', 'Error retrieving app path: String exception');
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error retrieving app path: String exception',
          },
        ],
        isError: true,
      });
    });

    it('should handle scheme validation failure', async () => {
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

      const result = await getSimAppPathIdWs.handler({
        workspacePath: '/path/to/workspace',
        scheme: '',
        platform: 'iOS Simulator',
        simulatorId: 'test-uuid-123',
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

    it('should handle platform validation failure', async () => {
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
                text: 'platform is required',
              },
            ],
          },
        });

      const result = await getSimAppPathIdWs.handler({
        workspacePath: '/path/to/workspace',
        scheme: 'MyScheme',
        platform: '',
        simulatorId: 'test-uuid-123',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'platform is required',
          },
        ],
      });
    });

    it('should handle simulatorId validation failure', async () => {
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
          isValid: true,
          errorResponse: null,
        })
        .mockReturnValueOnce({
          isValid: false,
          errorResponse: {
            content: [
              {
                type: 'text',
                text: 'simulatorId is required',
              },
            ],
          },
        });

      const result = await getSimAppPathIdWs.handler({
        workspacePath: '/path/to/workspace',
        scheme: 'MyScheme',
        platform: 'iOS Simulator',
        simulatorId: '',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'simulatorId is required',
          },
        ],
      });
    });
  });
});
