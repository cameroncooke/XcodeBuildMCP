import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';
import getSimAppPathIdProj from './get_sim_app_path_id_proj.ts';

// Mock external dependencies
vi.mock('../../src/utils/index.js', () => ({
  log: vi.fn(),
  validateRequiredParam: vi.fn(),
  createTextResponse: vi.fn(),
  executeCommand: vi.fn(),
}));

describe('get_sim_app_path_id_proj plugin', () => {
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
    it('should have correct name field', () => {
      expect(getSimAppPathIdProj.name).toBe('get_sim_app_path_id_proj');
    });

    it('should have correct description field', () => {
      expect(getSimAppPathIdProj.description).toBe(
        "Gets the app bundle path for a simulator by UUID using a project file. IMPORTANT: Requires projectPath, scheme, platform, and simulatorId. Example: get_sim_app_path_id_proj({ projectPath: '/path/to/project.xcodeproj', scheme: 'MyScheme', platform: 'iOS Simulator', simulatorId: 'SIMULATOR_UUID' })",
      );
    });

    it('should have handler as a function', () => {
      expect(typeof getSimAppPathIdProj.handler).toBe('function');
    });

    it('should validate schema fields with safeParse', () => {
      const schema = z.object(getSimAppPathIdProj.schema);

      // Valid input
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorId: 'test-uuid',
        }).success,
      ).toBe(true);

      // Invalid projectPath
      expect(
        schema.safeParse({
          projectPath: 123,
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorId: 'test-uuid',
        }).success,
      ).toBe(false);

      // Invalid scheme
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 123,
          platform: 'iOS Simulator',
          simulatorId: 'test-uuid',
        }).success,
      ).toBe(false);

      // Invalid platform
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          platform: 'Invalid Platform',
          simulatorId: 'test-uuid',
        }).success,
      ).toBe(false);

      // Valid platforms
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorId: 'test-uuid',
        }).success,
      ).toBe(true);

      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          platform: 'watchOS Simulator',
          simulatorId: 'test-uuid',
        }).success,
      ).toBe(true);

      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          platform: 'tvOS Simulator',
          simulatorId: 'test-uuid',
        }).success,
      ).toBe(true);

      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          platform: 'visionOS Simulator',
          simulatorId: 'test-uuid',
        }).success,
      ).toBe(true);

      // Invalid simulatorId
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorId: 123,
        }).success,
      ).toBe(false);

      // Valid with optional fields
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorId: 'test-uuid',
          configuration: 'Release',
          useLatestOS: true,
        }).success,
      ).toBe(true);

      // Invalid configuration
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorId: 'test-uuid',
          configuration: 123,
        }).success,
      ).toBe(false);

      // Invalid useLatestOS
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorId: 'test-uuid',
          useLatestOS: 'yes',
        }).success,
      ).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return validation error for missing projectPath', async () => {
      mockValidateRequiredParam.mockReturnValue({
        isValid: false,
        errorResponse: {
          content: [{ type: 'text', text: 'Error: projectPath is required' }],
          isError: true,
        },
      });

      const result = await getSimAppPathIdProj.handler({
        scheme: 'MyScheme',
        platform: 'iOS Simulator',
        simulatorId: 'test-uuid',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error: projectPath is required' }],
        isError: true,
      });
    });

    it('should return validation error for missing scheme', async () => {
      mockValidateRequiredParam.mockReturnValueOnce({ isValid: true }).mockReturnValueOnce({
        isValid: false,
        errorResponse: {
          content: [{ type: 'text', text: 'Error: scheme is required' }],
          isError: true,
        },
      });

      const result = await getSimAppPathIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        platform: 'iOS Simulator',
        simulatorId: 'test-uuid',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error: scheme is required' }],
        isError: true,
      });
    });

    it('should return validation error for missing platform', async () => {
      mockValidateRequiredParam
        .mockReturnValueOnce({ isValid: true })
        .mockReturnValueOnce({ isValid: true })
        .mockReturnValueOnce({
          isValid: false,
          errorResponse: {
            content: [{ type: 'text', text: 'Error: platform is required' }],
            isError: true,
          },
        });

      const result = await getSimAppPathIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        simulatorId: 'test-uuid',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error: platform is required' }],
        isError: true,
      });
    });

    it('should return validation error for missing simulatorId', async () => {
      mockValidateRequiredParam
        .mockReturnValueOnce({ isValid: true })
        .mockReturnValueOnce({ isValid: true })
        .mockReturnValueOnce({ isValid: true })
        .mockReturnValueOnce({
          isValid: false,
          errorResponse: {
            content: [{ type: 'text', text: 'Error: simulatorId is required' }],
            isError: true,
          },
        });

      const result = await getSimAppPathIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        platform: 'iOS Simulator',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error: simulatorId is required' }],
        isError: true,
      });
    });

    it('should return error when executeCommand fails', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });

      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: 'Command failed',
      });

      mockCreateTextResponse.mockReturnValue({
        content: [{ type: 'text', text: 'Failed to get app path: Command failed' }],
        isError: true,
      });

      const result = await getSimAppPathIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        platform: 'iOS Simulator',
        simulatorId: 'test-uuid',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Failed to get app path: Command failed' }],
        isError: true,
      });
    });

    it('should return error when build settings cannot be parsed', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });

      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'No app path found in output',
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

      const result = await getSimAppPathIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        platform: 'iOS Simulator',
        simulatorId: 'test-uuid',
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

    it('should return success when app path is found', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });

      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'BUILT_PRODUCTS_DIR = /path/to/products\nFULL_PRODUCT_NAME = MyApp.app',
      });

      const result = await getSimAppPathIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        platform: 'iOS Simulator',
        simulatorId: 'test-uuid',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ App path retrieved successfully: /path/to/products/MyApp.app',
          },
          {
            type: 'text',
            text: `Next Steps:
1. Get bundle ID: get_app_bundle_id({ appPath: "/path/to/products/MyApp.app" })
2. Boot simulator: boot_simulator({ simulatorUuid: "SIMULATOR_UUID" })
3. Install app: install_app_in_simulator({ simulatorUuid: "SIMULATOR_UUID", appPath: "/path/to/products/MyApp.app" })
4. Launch app: launch_app_in_simulator({ simulatorUuid: "SIMULATOR_UUID", bundleId: "BUNDLE_ID" })`,
          },
        ],
      });
    });

    it('should handle Exception objects correctly', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });

      mockExecuteCommand.mockImplementation(() => {
        throw new Error('Command error');
      });

      mockCreateTextResponse.mockReturnValue({
        content: [{ type: 'text', text: 'Error retrieving app path: Command error' }],
        isError: true,
      });

      const result = await getSimAppPathIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        platform: 'iOS Simulator',
        simulatorId: 'test-uuid',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error retrieving app path: Command error' }],
        isError: true,
      });
    });

    it('should handle string errors correctly', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });

      mockExecuteCommand.mockImplementation(() => {
        throw 'String error';
      });

      mockCreateTextResponse.mockReturnValue({
        content: [{ type: 'text', text: 'Error retrieving app path: String error' }],
        isError: true,
      });

      const result = await getSimAppPathIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        platform: 'iOS Simulator',
        simulatorId: 'test-uuid',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error retrieving app path: String error' }],
        isError: true,
      });
    });
  });
});
