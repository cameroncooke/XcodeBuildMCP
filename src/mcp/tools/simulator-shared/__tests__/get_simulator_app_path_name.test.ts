import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createMockExecutor, createMockFileSystemExecutor } from '../../../../utils/command.js';
import getSimulatorAppPathNameTool, {
  get_simulator_app_path_nameLogic,
} from '../get_simulator_app_path_name.ts';

describe('get_simulator_app_path_name plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name field', () => {
      expect(getSimulatorAppPathNameTool.name).toBe('get_simulator_app_path_name');
    });

    it('should have correct description field', () => {
      expect(getSimulatorAppPathNameTool.description).toBe(
        "Gets the app bundle path for a simulator by name using either a project or workspace file. IMPORTANT: Requires either projectPath OR workspacePath (not both), plus scheme, platform, and simulatorName. Example: get_simulator_app_path_name({ projectPath: '/path/to/project.xcodeproj', scheme: 'MyScheme', platform: 'iOS Simulator', simulatorName: 'iPhone 16' })",
      );
    });

    it('should have handler function', () => {
      expect(typeof getSimulatorAppPathNameTool.handler).toBe('function');
    });

    it('should have correct schema validation', () => {
      const schema = z.object(getSimulatorAppPathNameTool.schema);

      // Test with workspacePath only
      expect(
        schema.safeParse({
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorName: 'iPhone 16',
        }).success,
      ).toBe(true);

      // Test with projectPath only
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorName: 'iPhone 16',
        }).success,
      ).toBe(true);

      // Test with additional optional parameters (workspace)
      expect(
        schema.safeParse({
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorName: 'iPhone 16',
          configuration: 'Release',
          useLatestOS: false,
        }).success,
      ).toBe(true);

      expect(
        schema.safeParse({
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          platform: 'macOS',
          simulatorName: 'iPhone 16',
        }).success,
      ).toBe(false);

      expect(
        schema.safeParse({
          workspacePath: 123,
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorName: 'iPhone 16',
        }).success,
      ).toBe(false);
    });
  });

  describe('XOR Validation', () => {
    it('should error when neither projectPath nor workspacePath provided', async () => {
      const result = await getSimulatorAppPathNameTool.handler({
        scheme: 'MyScheme',
        platform: 'iOS Simulator',
        simulatorName: 'iPhone 16',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Either projectPath or workspacePath is required');
    });

    it('should error when both projectPath and workspacePath provided', async () => {
      const result = await getSimulatorAppPathNameTool.handler({
        projectPath: '/path/project.xcodeproj',
        workspacePath: '/path/workspace.xcworkspace',
        scheme: 'MyScheme',
        platform: 'iOS Simulator',
        simulatorName: 'iPhone 16',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('mutually exclusive');
    });

    it('should accept projectPath without workspacePath', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'BUILT_PRODUCTS_DIR = /path/build\nFULL_PRODUCT_NAME = MyApp.app',
      });

      const result = await get_simulator_app_path_nameLogic(
        {
          projectPath: '/path/project.xcodeproj',
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorName: 'iPhone 16',
        },
        mockExecutor,
      );

      expect(result.isError).toBe(false);
    });

    it('should accept workspacePath without projectPath', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'BUILT_PRODUCTS_DIR = /path/build\nFULL_PRODUCT_NAME = MyApp.app',
      });

      const result = await get_simulator_app_path_nameLogic(
        {
          workspacePath: '/path/workspace.xcworkspace',
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorName: 'iPhone 16',
        },
        mockExecutor,
      );

      expect(result.isError).toBe(false);
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

      await get_simulator_app_path_nameLogic(
        {
          workspacePath: '/path/to/Project.xcworkspace',
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorName: 'iPhone 16',
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
          'platform=iOS Simulator,name=iPhone 16,OS=latest',
        ],
        taskName: 'Get App Path',
        safeToLog: true,
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

      await get_simulator_app_path_nameLogic(
        {
          workspacePath: '/path/to/Project.xcworkspace',
          scheme: 'MyScheme',
          platform: 'tvOS Simulator',
          simulatorName: 'Apple TV 4K',
          configuration: 'Release',
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
          'platform=tvOS Simulator,name=Apple TV 4K,OS=latest',
        ],
        taskName: 'Get App Path',
        safeToLog: true,
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

      await get_simulator_app_path_nameLogic(
        {
          workspacePath: '/path/to/Watch.xcworkspace',
          scheme: 'WatchScheme',
          platform: 'watchOS Simulator',
          simulatorName: 'Apple Watch Series 10',
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
          'platform=watchOS Simulator,name=Apple Watch Series 10,OS=latest',
        ],
        taskName: 'Get App Path',
        safeToLog: true,
        logLevel: undefined,
      });
    });

    it('should generate correct command for visionOS Simulator without OS=latest', async () => {
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

      await get_simulator_app_path_nameLogic(
        {
          workspacePath: '/path/to/Vision.xcworkspace',
          scheme: 'VisionScheme',
          platform: 'visionOS Simulator',
          simulatorName: 'Apple Vision Pro',
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
          'platform=visionOS Simulator,name=Apple Vision Pro',
        ],
        taskName: 'Get App Path',
        safeToLog: true,
        logLevel: undefined,
      });
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return app path successfully for iOS Simulator', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: `
BUILT_PRODUCTS_DIR = /Users/test/Library/Developer/Xcode/DerivedData/MyApp-abc123/Build/Products/Debug-iphonesimulator
FULL_PRODUCT_NAME = MyApp.app
        `,
      });

      const result = await get_simulator_app_path_nameLogic(
        {
          workspacePath: '/path/to/Project.xcworkspace',
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorName: 'iPhone 16',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ App path retrieved successfully: /Users/test/Library/Developer/Xcode/DerivedData/MyApp-abc123/Build/Products/Debug-iphonesimulator/MyApp.app',
          },
          {
            type: 'text',
            text: `Next Steps:
1. Get bundle ID: get_app_bundle_id({ appPath: "/Users/test/Library/Developer/Xcode/DerivedData/MyApp-abc123/Build/Products/Debug-iphonesimulator/MyApp.app" })
2. Boot simulator: boot_simulator({ simulatorUuid: "SIMULATOR_UUID" })
3. Install app: install_app_in_simulator({ simulatorUuid: "SIMULATOR_UUID", appPath: "/Users/test/Library/Developer/Xcode/DerivedData/MyApp-abc123/Build/Products/Debug-iphonesimulator/MyApp.app" })
4. Launch app: launch_app_in_simulator({ simulatorUuid: "SIMULATOR_UUID", bundleId: "BUNDLE_ID" })`,
          },
        ],
        isError: false,
      });
    });

    it('should handle optional configuration parameter', async () => {
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

      await get_simulator_app_path_nameLogic(
        {
          workspacePath: '/path/to/Project.xcworkspace',
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorName: 'iPhone 16',
          configuration: 'Release',
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
          'platform=iOS Simulator,name=iPhone 16,OS=latest',
        ],
        taskName: 'Get App Path',
        safeToLog: true,
        logLevel: undefined,
      });
    });

    it('should handle useLatestOS=false parameter', async () => {
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

      await get_simulator_app_path_nameLogic(
        {
          workspacePath: '/path/to/Project.xcworkspace',
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorName: 'iPhone 16',
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
          '/path/to/Project.xcworkspace',
          '-scheme',
          'MyScheme',
          '-configuration',
          'Debug',
          '-destination',
          'platform=iOS Simulator,name=iPhone 16',
        ],
        taskName: 'Get App Path',
        safeToLog: true,
        logLevel: undefined,
      });
    });

    // Note: Parameter validation is now handled by Zod schema in createTypedTool wrapper
    // The logic function expects valid parameters that have passed Zod validation

    it('should handle command failure', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'xcodebuild failed',
      });

      const result = await get_simulator_app_path_nameLogic(
        {
          workspacePath: '/path/to/Project.xcworkspace',
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorName: 'iPhone 16',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to get app path: xcodebuild failed',
          },
        ],
        isError: true,
      });
    });

    it('should handle missing build settings', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'No valid build settings found',
      });

      const result = await get_simulator_app_path_nameLogic(
        {
          workspacePath: '/path/to/Project.xcworkspace',
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorName: 'iPhone 16',
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

    it('should handle exception during execution', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Network error',
      });

      const result = await get_simulator_app_path_nameLogic(
        {
          workspacePath: '/path/to/Project.xcworkspace',
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorName: 'iPhone 16',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to get app path: Network error',
          },
        ],
        isError: true,
      });
    });
  });
});
