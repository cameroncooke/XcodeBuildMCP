import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { createMockExecutor, createNoopExecutor } from '../../../../utils/command.js';

// Import the plugin and logic function
import getSimulatorAppPathId, {
  get_simulator_app_path_idLogic,
} from '../get_simulator_app_path_id.js';

describe('get_simulator_app_path_id tool', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(getSimulatorAppPathId.name).toBe('get_simulator_app_path_id');
    });

    it('should have correct description', () => {
      expect(getSimulatorAppPathId.description).toBe(
        "Gets the app bundle path for a simulator by UUID using either a project or workspace. Provide exactly one of projectPath or workspacePath. Example: get_simulator_app_path_id({ projectPath: '/path/to/project.xcodeproj', scheme: 'MyScheme', platform: 'iOS Simulator', simulatorId: 'SIMULATOR_UUID' })",
      );
    });

    it('should have handler function', () => {
      expect(typeof getSimulatorAppPathId.handler).toBe('function');
    });

    it('should have correct schema with required and optional fields', () => {
      const schema = z.object(getSimulatorAppPathId.schema);

      // Valid inputs with workspace
      expect(
        schema.safeParse({
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorId: 'test-uuid-123',
        }).success,
      ).toBe(true);

      // Valid inputs with project
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
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

  describe('XOR Validation', () => {
    it('should error when neither projectPath nor workspacePath provided', async () => {
      const result = await getSimulatorAppPathId.handler({
        scheme: 'MyScheme',
        platform: 'iOS Simulator',
        simulatorId: 'test-uuid-123',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Either projectPath or workspacePath is required');
    });

    it('should error when both projectPath and workspacePath provided', async () => {
      const result = await getSimulatorAppPathId.handler({
        projectPath: '/path/to/project.xcodeproj',
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyScheme',
        platform: 'iOS Simulator',
        simulatorId: 'test-uuid-123',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('mutually exclusive');
    });

    it('should work with projectPath only', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'BUILT_PRODUCTS_DIR = /path/to/build\nFULL_PRODUCT_NAME = MyApp.app\n',
      });

      const result = await get_simulator_app_path_idLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorId: 'test-uuid-123',
        },
        mockExecutor,
      );

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('✅ App path retrieved successfully');
    });

    it('should work with workspacePath only', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'BUILT_PRODUCTS_DIR = /path/to/build\nFULL_PRODUCT_NAME = MyApp.app\n',
      });

      const result = await get_simulator_app_path_idLogic(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorId: 'test-uuid-123',
        },
        mockExecutor,
      );

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('✅ App path retrieved successfully');
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should handle successful app path retrieval for iOS Simulator', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'BUILT_PRODUCTS_DIR = /path/to/build\nFULL_PRODUCT_NAME = MyApp.app\n',
      });

      const result = await get_simulator_app_path_idLogic(
        {
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorId: 'test-uuid-123',
          configuration: 'Debug',
          useLatestOS: true,
        },
        mockExecutor,
      );

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
        isError: false,
      });
    });

    it('should handle successful app path retrieval for watchOS Simulator', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'BUILT_PRODUCTS_DIR = /path/to/watch/build\nFULL_PRODUCT_NAME = WatchApp.app\n',
      });

      const result = await get_simulator_app_path_idLogic(
        {
          workspacePath: '/path/to/workspace',
          scheme: 'WatchScheme',
          platform: 'watchOS Simulator',
          simulatorId: 'watch-uuid-456',
          configuration: 'Debug',
          useLatestOS: true,
        },
        mockExecutor,
      );

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
        isError: false,
      });
    });

    it('should handle successful app path retrieval for tvOS Simulator', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'BUILT_PRODUCTS_DIR = /path/to/tv/build\nFULL_PRODUCT_NAME = TVApp.app\n',
      });

      const result = await get_simulator_app_path_idLogic(
        {
          workspacePath: '/path/to/workspace',
          scheme: 'TVScheme',
          platform: 'tvOS Simulator',
          simulatorId: 'tv-uuid-789',
          configuration: 'Release',
          useLatestOS: true,
        },
        mockExecutor,
      );

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
        isError: false,
      });
    });

    it('should handle successful app path retrieval for visionOS Simulator', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'BUILT_PRODUCTS_DIR = /path/to/vision/build\nFULL_PRODUCT_NAME = VisionApp.app\n',
      });

      const result = await get_simulator_app_path_idLogic(
        {
          workspacePath: '/path/to/workspace',
          scheme: 'VisionScheme',
          platform: 'visionOS Simulator',
          simulatorId: 'vision-uuid-101',
          configuration: 'Debug',
          useLatestOS: true,
        },
        mockExecutor,
      );

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
        isError: false,
      });
    });

    it('should handle command failure', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'Build settings command failed',
      });

      const result = await get_simulator_app_path_idLogic(
        {
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorId: 'test-uuid-123',
          configuration: 'Debug',
          useLatestOS: true,
        },
        mockExecutor,
      );

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
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Command execution failed',
      });

      const result = await get_simulator_app_path_idLogic(
        {
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorId: 'test-uuid-123',
          configuration: 'Debug',
          useLatestOS: true,
        },
        mockExecutor,
      );

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
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'String error',
      });

      const result = await get_simulator_app_path_idLogic(
        {
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorId: 'test-uuid-123',
          configuration: 'Debug',
          useLatestOS: true,
        },
        mockExecutor,
      );

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

    it('should handle missing output from executor', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: null,
      });

      const result = await get_simulator_app_path_idLogic(
        {
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorId: 'test-uuid-123',
          configuration: 'Debug',
          useLatestOS: true,
        },
        mockExecutor,
      );

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
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Some output without build settings',
      });

      const result = await get_simulator_app_path_idLogic(
        {
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorId: 'test-uuid-123',
          configuration: 'Debug',
          useLatestOS: true,
        },
        mockExecutor,
      );

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
      const mockExecutor = async () => {
        throw new Error('Test exception');
      };

      const result = await get_simulator_app_path_idLogic(
        {
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorId: 'test-uuid-123',
          configuration: 'Debug',
          useLatestOS: true,
        },
        mockExecutor,
      );

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
      const mockExecutor = async () => {
        throw 'String exception';
      };

      const result = await get_simulator_app_path_idLogic(
        {
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorId: 'test-uuid-123',
          configuration: 'Debug',
          useLatestOS: true,
        },
        mockExecutor,
      );

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
  });

  describe('Command Generation', () => {
    it('should generate correct command with default parameters', async () => {
      const calls: Array<{
        args: unknown[];
        taskName?: string;
        safeToLog?: boolean;
        logLevel?: unknown;
      }> = [];

      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Command failed',
        output: '',
        process: { pid: 12345 },
      });

      const executorWithTracking = (
        args: unknown[],
        taskName?: string,
        safeToLog?: boolean,
        logLevel?: unknown,
      ) => {
        calls.push({ args, taskName, safeToLog, logLevel });
        return mockExecutor(args, taskName, safeToLog, logLevel);
      };

      await get_simulator_app_path_idLogic(
        {
          workspacePath: '/path/to/Project.xcworkspace',
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorId: 'test-uuid-123',
          configuration: 'Debug',
          useLatestOS: true,
        },
        executorWithTracking,
      );

      expect(calls).toHaveLength(1);
      expect(calls[0]).toEqual({
        args: [
          'xcodebuild',
          '-showBuildSettings',
          '-workspace',
          '/path/to/Project.xcworkspace',
          '-scheme',
          'MyScheme',
          '-configuration',
          'Debug',
          '-destination',
          'platform=iOS Simulator,id=test-uuid-123',
        ],
        taskName: 'Get App Path',
        safeToLog: false,
        logLevel: undefined,
      });
    });

    it('should generate correct command with configuration parameter', async () => {
      const calls: Array<{
        args: unknown[];
        taskName?: string;
        safeToLog?: boolean;
        logLevel?: unknown;
      }> = [];

      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Command failed',
        output: '',
        process: { pid: 12345 },
      });

      const executorWithTracking = (
        args: unknown[],
        taskName?: string,
        safeToLog?: boolean,
        logLevel?: unknown,
      ) => {
        calls.push({ args, taskName, safeToLog, logLevel });
        return mockExecutor(args, taskName, safeToLog, logLevel);
      };

      await get_simulator_app_path_idLogic(
        {
          workspacePath: '/path/to/Project.xcworkspace',
          scheme: 'MyScheme',
          platform: 'tvOS Simulator',
          simulatorId: 'tv-uuid-456',
          configuration: 'Release',
          useLatestOS: true,
        },
        executorWithTracking,
      );

      expect(calls).toHaveLength(1);
      expect(calls[0]).toEqual({
        args: [
          'xcodebuild',
          '-showBuildSettings',
          '-workspace',
          '/path/to/Project.xcworkspace',
          '-scheme',
          'MyScheme',
          '-configuration',
          'Release',
          '-destination',
          'platform=tvOS Simulator,id=tv-uuid-456',
        ],
        taskName: 'Get App Path',
        safeToLog: false,
        logLevel: undefined,
      });
    });

    it('should generate correct command for watchOS Simulator', async () => {
      const calls: Array<{
        args: unknown[];
        taskName?: string;
        safeToLog?: boolean;
        logLevel?: unknown;
      }> = [];

      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Command failed',
        output: '',
        process: { pid: 12345 },
      });

      const executorWithTracking = (
        args: unknown[],
        taskName?: string,
        safeToLog?: boolean,
        logLevel?: unknown,
      ) => {
        calls.push({ args, taskName, safeToLog, logLevel });
        return mockExecutor(args, taskName, safeToLog, logLevel);
      };

      await get_simulator_app_path_idLogic(
        {
          workspacePath: '/path/to/Watch.xcworkspace',
          scheme: 'WatchScheme',
          platform: 'watchOS Simulator',
          simulatorId: 'watch-uuid-789',
          configuration: 'Debug',
          useLatestOS: true,
        },
        executorWithTracking,
      );

      expect(calls).toHaveLength(1);
      expect(calls[0]).toEqual({
        args: [
          'xcodebuild',
          '-showBuildSettings',
          '-workspace',
          '/path/to/Watch.xcworkspace',
          '-scheme',
          'WatchScheme',
          '-configuration',
          'Debug',
          '-destination',
          'platform=watchOS Simulator,id=watch-uuid-789',
        ],
        taskName: 'Get App Path',
        safeToLog: false,
        logLevel: undefined,
      });
    });

    it('should generate correct command for visionOS Simulator', async () => {
      const calls: Array<{
        args: unknown[];
        taskName?: string;
        safeToLog?: boolean;
        logLevel?: unknown;
      }> = [];

      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Command failed',
        output: '',
        process: { pid: 12345 },
      });

      const executorWithTracking = (
        args: unknown[],
        taskName?: string,
        safeToLog?: boolean,
        logLevel?: unknown,
      ) => {
        calls.push({ args, taskName, safeToLog, logLevel });
        return mockExecutor(args, taskName, safeToLog, logLevel);
      };

      await get_simulator_app_path_idLogic(
        {
          workspacePath: '/path/to/Vision.xcworkspace',
          scheme: 'VisionScheme',
          platform: 'visionOS Simulator',
          simulatorId: 'vision-uuid-101',
          configuration: 'Release',
          useLatestOS: false,
        },
        executorWithTracking,
      );

      expect(calls).toHaveLength(1);
      expect(calls[0]).toEqual({
        args: [
          'xcodebuild',
          '-showBuildSettings',
          '-workspace',
          '/path/to/Vision.xcworkspace',
          '-scheme',
          'VisionScheme',
          '-configuration',
          'Release',
          '-destination',
          'platform=visionOS Simulator,id=vision-uuid-101',
        ],
        taskName: 'Get App Path',
        safeToLog: false,
        logLevel: undefined,
      });
    });
  });
});
