import { vi, describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../../utils/command.js';
import getSimAppPathNameWsTool from '../get_sim_app_path_name_ws.ts';

describe('get_sim_app_path_name_ws plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name field', () => {
      expect(getSimAppPathNameWsTool.name).toBe('get_sim_app_path_name_ws');
    });

    it('should have correct description field', () => {
      expect(getSimAppPathNameWsTool.description).toBe(
        "Gets the app bundle path for a simulator by name using a workspace. IMPORTANT: Requires workspacePath, scheme, platform, and simulatorName. Example: get_sim_app_path_name_ws({ workspacePath: '/path/to/workspace', scheme: 'MyScheme', platform: 'iOS Simulator', simulatorName: 'iPhone 16' })",
      );
    });

    it('should have handler function', () => {
      expect(typeof getSimAppPathNameWsTool.handler).toBe('function');
    });

    it('should have correct schema validation', () => {
      const schema = z.object(getSimAppPathNameWsTool.schema);

      expect(
        schema.safeParse({
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorName: 'iPhone 16',
        }).success,
      ).toBe(true);

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

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return app path successfully for iOS Simulator', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: `
BUILT_PRODUCTS_DIR = /Users/test/Library/Developer/Xcode/DerivedData/MyApp-abc123/Build/Products/Debug-iphonesimulator
FULL_PRODUCT_NAME = MyApp.app
        `,
      });

      const result = await getSimAppPathNameWsTool.handler(
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
      });
    });

    it('should handle optional configuration parameter', async () => {
      const mockExecutor = vi.fn().mockResolvedValue({
        success: false,
        error: 'Command failed',
        output: '',
        process: { pid: 12345 },
      });

      await getSimAppPathNameWsTool.handler(
        {
          workspacePath: '/path/to/Project.xcworkspace',
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorName: 'iPhone 16',
          configuration: 'Release',
        },
        mockExecutor,
      );

      expect(mockExecutor).toHaveBeenCalledWith(
        [
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
        'Get App Path',
        true,
        undefined,
      );
    });

    it('should handle useLatestOS=false parameter', async () => {
      const mockExecutor = vi.fn().mockResolvedValue({
        success: false,
        error: 'Command failed',
        output: '',
        process: { pid: 12345 },
      });

      await getSimAppPathNameWsTool.handler(
        {
          workspacePath: '/path/to/Project.xcworkspace',
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorName: 'iPhone 16',
          useLatestOS: false,
        },
        mockExecutor,
      );

      expect(mockExecutor).toHaveBeenCalledWith(
        [
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
        'Get App Path',
        true,
        undefined,
      );
    });

    it('should handle missing workspacePath', async () => {
      const result = await getSimAppPathNameWsTool.handler({
        scheme: 'MyScheme',
        platform: 'iOS Simulator',
        simulatorName: 'iPhone 16',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'workspacePath' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should handle missing scheme', async () => {
      const result = await getSimAppPathNameWsTool.handler({
        workspacePath: '/path/to/Project.xcworkspace',
        platform: 'iOS Simulator',
        simulatorName: 'iPhone 16',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'scheme' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should handle missing platform', async () => {
      const result = await getSimAppPathNameWsTool.handler({
        workspacePath: '/path/to/Project.xcworkspace',
        scheme: 'MyScheme',
        simulatorName: 'iPhone 16',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'platform' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should handle missing simulatorName', async () => {
      const result = await getSimAppPathNameWsTool.handler({
        workspacePath: '/path/to/Project.xcworkspace',
        scheme: 'MyScheme',
        platform: 'iOS Simulator',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'simulatorName' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should handle command failure', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'xcodebuild failed',
      });

      const result = await getSimAppPathNameWsTool.handler(
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

      const result = await getSimAppPathNameWsTool.handler(
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

      const result = await getSimAppPathNameWsTool.handler(
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
