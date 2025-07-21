import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createMockExecutor, createNoopExecutor } from '../../../utils/command.js';
import getSimAppPathIdProj, { get_sim_app_path_id_projLogic } from '../get_sim_app_path_id_proj.ts';

describe('get_sim_app_path_id_proj plugin', () => {
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
          platform: 'InvalidPlatform',
          simulatorId: 'test-uuid',
        }).success,
      ).toBe(false);

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
    });
  });

  describe('Logic Function Behavior (Complete Literal Returns)', () => {
    it('should return validation error for missing projectPath', async () => {
      const result = await get_sim_app_path_id_projLogic(
        {
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorId: 'test-uuid',
        },
        createNoopExecutor(),
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'projectPath' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should return validation error for missing scheme', async () => {
      const result = await get_sim_app_path_id_projLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          platform: 'iOS Simulator',
          simulatorId: 'test-uuid',
        },
        createNoopExecutor(),
      );

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

    it('should return validation error for missing platform', async () => {
      const result = await get_sim_app_path_id_projLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
        },
        createNoopExecutor(),
      );

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

    it('should return validation error for missing simulatorId', async () => {
      const result = await get_sim_app_path_id_projLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
        },
        createNoopExecutor(),
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'simulatorId' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should return command error when command fails', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Command failed with error',
      });

      const result = await get_sim_app_path_id_projLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorId: 'test-uuid',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to get app path: Command failed with error',
          },
        ],
        isError: true,
      });
    });

    it('should handle successful app path extraction', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'BUILT_PRODUCTS_DIR = /path/to/build\nFULL_PRODUCT_NAME = MyApp.app\n',
      });

      const result = await get_sim_app_path_id_projLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorId: 'test-uuid',
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
      });
    });

    it('should handle no app path found', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'No BUILT_PRODUCTS_DIR or FULL_PRODUCT_NAME found\n',
      });

      const result = await get_sim_app_path_id_projLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorId: 'test-uuid',
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

    it('should handle command generation with extra args', async () => {
      const calls: any[] = [];
      const mockExecutor = async (
        command: string[],
        context: string,
        logOutput: boolean,
        timeout: number | undefined,
      ) => {
        calls.push({ command, context, logOutput, timeout });
        return {
          success: false,
          error: 'Command failed',
          output: '',
          process: { pid: 12345 },
        };
      };

      await get_sim_app_path_id_projLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorId: 'test-uuid',
          configuration: 'Release',
          useLatestOS: false,
        },
        mockExecutor,
      );

      expect(calls).toHaveLength(1);
      expect(calls[0].command).toEqual([
        'xcodebuild',
        '-showBuildSettings',
        '-project',
        '/path/to/project.xcodeproj',
        '-scheme',
        'MyScheme',
        '-configuration',
        'Release',
        '-destination',
        'platform=iOS Simulator,id=test-uuid',
      ]);
      expect(calls[0].context).toBe('Get App Path');
      expect(calls[0].logOutput).toBe(true);
      expect(calls[0].timeout).toBe(undefined);
    });
  });
});
