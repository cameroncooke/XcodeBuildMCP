import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  createMockExecutor,
  createMockFileSystemExecutor,
  createNoopExecutor,
} from '../../../../utils/command.js';
import getSimAppPathNameProj, {
  get_sim_app_path_name_projLogic,
} from '../get_sim_app_path_name_proj.ts';

describe('get_sim_app_path_name_proj plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name field', () => {
      expect(getSimAppPathNameProj.name).toBe('get_sim_app_path_name_proj');
    });

    it('should have correct description field', () => {
      expect(getSimAppPathNameProj.description).toBe(
        "Gets the app bundle path for a simulator by name using a project file. IMPORTANT: Requires projectPath, scheme, platform, and simulatorName. Example: get_sim_app_path_name_proj({ projectPath: '/path/to/project.xcodeproj', scheme: 'MyScheme', platform: 'iOS Simulator', simulatorName: 'iPhone 16' })",
      );
    });

    it('should have handler as a function', () => {
      expect(typeof getSimAppPathNameProj.handler).toBe('function');
    });

    it('should validate schema fields with safeParse', () => {
      const schema = z.object(getSimAppPathNameProj.schema);

      // Valid input
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorName: 'iPhone 16',
        }).success,
      ).toBe(true);

      // Invalid projectPath
      expect(
        schema.safeParse({
          projectPath: 123,
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorName: 'iPhone 16',
        }).success,
      ).toBe(false);

      // Invalid scheme
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 123,
          platform: 'iOS Simulator',
          simulatorName: 'iPhone 16',
        }).success,
      ).toBe(false);

      // Invalid platform
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          platform: 'InvalidPlatform',
          simulatorName: 'iPhone 16',
        }).success,
      ).toBe(false);

      // Invalid simulatorName
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorName: 123,
        }).success,
      ).toBe(false);

      // Valid with optional fields
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorName: 'iPhone 16',
          configuration: 'Release',
          useLatestOS: true,
        }).success,
      ).toBe(true);
    });
  });

  describe('Handler Validation (via createTypedTool)', () => {
    it('should validate required parameters at handler level', async () => {
      // Missing projectPath should be caught by Zod schema
      const result = await getSimAppPathNameProj.handler({
        scheme: 'MyScheme',
        platform: 'iOS Simulator',
        simulatorName: 'iPhone 16',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Parameter validation failed');
      expect(result.content[0].text).toContain('projectPath');
      expect(result.content[0].text).toContain('Required');
    });

    it('should validate enum values at handler level', async () => {
      // Invalid platform should be caught by Zod schema
      const result = await getSimAppPathNameProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        platform: 'Invalid Platform',
        simulatorName: 'iPhone 16',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Parameter validation failed');
      expect(result.content[0].text).toContain('platform');
    });
  });

  describe('Logic Behavior (Complete Literal Returns)', () => {
    // Note: The logic function only receives validated params from createTypedTool.

    it('should return command error when command fails', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Command failed with error',
      });

      const result = await get_sim_app_path_name_projLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
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
            text: 'Failed to get app path: Command failed with error',
          },
        ],
        isError: true,
      });
    });

    it('should handle successful app path extraction', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'BUILT_PRODUCTS_DIR = /path/to/build\nFULL_PRODUCT_NAME = MyApp.app',
      });

      const result = await get_sim_app_path_name_projLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
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
        output: 'No BUILT_PRODUCTS_DIR found\n',
      });

      const result = await get_sim_app_path_name_projLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
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

    it('should handle command generation with extra args', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Command failed',
        output: '',
      });

      const result = await get_sim_app_path_name_projLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorName: 'iPhone 16',
          configuration: 'Release',
          useLatestOS: false,
        },
        mockExecutor,
      );

      // Test that the function processes parameters correctly (should fail due to mock)
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Command failed');
    });
  });
});
