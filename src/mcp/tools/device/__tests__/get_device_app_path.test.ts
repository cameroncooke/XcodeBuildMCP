/**
 * Tests for get_device_app_path plugin (unified)
 * Following CLAUDE.md testing standards with literal validation
 * Using dependency injection for deterministic testing
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../../../test-utils/mock-executors.ts';
import getDeviceAppPath, { get_device_app_pathLogic } from '../get_device_app_path.ts';
import { sessionStore } from '../../../../utils/session-store.ts';

describe('get_device_app_path plugin', () => {
  beforeEach(() => {
    sessionStore.clear();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(getDeviceAppPath.name).toBe('get_device_app_path');
    });

    it('should have correct description', () => {
      expect(getDeviceAppPath.description).toBe(
        'Retrieves the built app path for a connected device.',
      );
    });

    it('should have handler function', () => {
      expect(typeof getDeviceAppPath.handler).toBe('function');
    });

    it('should expose only platform in public schema', () => {
      const schema = z.object(getDeviceAppPath.schema).strict();
      expect(schema.safeParse({}).success).toBe(true);
      expect(schema.safeParse({ platform: 'iOS' }).success).toBe(true);
      expect(schema.safeParse({ projectPath: '/path/to/project.xcodeproj' }).success).toBe(false);

      const schemaKeys = Object.keys(getDeviceAppPath.schema).sort();
      expect(schemaKeys).toEqual(['platform']);
    });
  });

  describe('XOR Validation', () => {
    it('should error when neither projectPath nor workspacePath provided', async () => {
      const result = await getDeviceAppPath.handler({
        scheme: 'MyScheme',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Missing required session defaults');
      expect(result.content[0].text).toContain('Provide a project or workspace');
    });

    it('should error when both projectPath and workspacePath provided', async () => {
      const result = await getDeviceAppPath.handler({
        projectPath: '/path/to/project.xcodeproj',
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyScheme',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Parameter validation failed');
      expect(result.content[0].text).toContain('Mutually exclusive parameters provided');
    });
  });

  describe('Handler Requirements', () => {
    it('should require scheme when missing', async () => {
      const result = await getDeviceAppPath.handler({
        projectPath: '/path/to/project.xcodeproj',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Missing required session defaults');
      expect(result.content[0].text).toContain('scheme is required');
    });

    it('should require project or workspace when scheme default exists', async () => {
      sessionStore.setDefaults({ scheme: 'MyScheme' });

      const result = await getDeviceAppPath.handler({});
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Provide a project or workspace');
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    // Note: Parameter validation is now handled by Zod schema validation in createTypedTool,
    // so invalid parameters never reach the logic function. Schema validation is tested above.

    it('should generate correct xcodebuild command for iOS', async () => {
      const calls: Array<{
        args: any[];
        description: string;
        suppressErrors: boolean;
        workingDirectory: string | undefined;
      }> = [];

      const mockExecutor = (
        args: any[],
        description: string,
        suppressErrors: boolean,
        workingDirectory: string | undefined,
      ) => {
        calls.push({ args, description, suppressErrors, workingDirectory });
        return Promise.resolve({
          success: true,
          output:
            'Build settings for scheme "MyScheme"\n\nBUILT_PRODUCTS_DIR = /path/to/build/Debug-iphoneos\nFULL_PRODUCT_NAME = MyApp.app\n',
          error: undefined,
          process: { pid: 12345 },
        });
      };

      await get_device_app_pathLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
        },
        mockExecutor,
      );

      expect(calls).toHaveLength(1);
      expect(calls[0]).toEqual({
        args: [
          'xcodebuild',
          '-showBuildSettings',
          '-project',
          '/path/to/project.xcodeproj',
          '-scheme',
          'MyScheme',
          '-configuration',
          'Debug',
          '-destination',
          'generic/platform=iOS',
        ],
        description: 'Get App Path',
        suppressErrors: true,
        workingDirectory: undefined,
      });
    });

    it('should generate correct xcodebuild command for watchOS', async () => {
      const calls: Array<{
        args: any[];
        description: string;
        suppressErrors: boolean;
        workingDirectory: string | undefined;
      }> = [];

      const mockExecutor = (
        args: any[],
        description: string,
        suppressErrors: boolean,
        workingDirectory: string | undefined,
      ) => {
        calls.push({ args, description, suppressErrors, workingDirectory });
        return Promise.resolve({
          success: true,
          output:
            'Build settings for scheme "MyScheme"\n\nBUILT_PRODUCTS_DIR = /path/to/build/Debug-watchos\nFULL_PRODUCT_NAME = MyApp.app\n',
          error: undefined,
          process: { pid: 12345 },
        });
      };

      await get_device_app_pathLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          platform: 'watchOS',
        },
        mockExecutor,
      );

      expect(calls).toHaveLength(1);
      expect(calls[0]).toEqual({
        args: [
          'xcodebuild',
          '-showBuildSettings',
          '-project',
          '/path/to/project.xcodeproj',
          '-scheme',
          'MyScheme',
          '-configuration',
          'Debug',
          '-destination',
          'generic/platform=watchOS',
        ],
        description: 'Get App Path',
        suppressErrors: true,
        workingDirectory: undefined,
      });
    });

    it('should generate correct xcodebuild command for workspace with iOS', async () => {
      const calls: Array<{
        args: any[];
        description: string;
        suppressErrors: boolean;
        workingDirectory: string | undefined;
      }> = [];

      const mockExecutor = (
        args: any[],
        description: string,
        suppressErrors: boolean,
        workingDirectory: string | undefined,
      ) => {
        calls.push({ args, description, suppressErrors, workingDirectory });
        return Promise.resolve({
          success: true,
          output:
            'Build settings for scheme "MyScheme"\n\nBUILT_PRODUCTS_DIR = /path/to/build/Debug-iphoneos\nFULL_PRODUCT_NAME = MyApp.app\n',
          error: undefined,
          process: { pid: 12345 },
        });
      };

      await get_device_app_pathLogic(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
        },
        mockExecutor,
      );

      expect(calls).toHaveLength(1);
      expect(calls[0]).toEqual({
        args: [
          'xcodebuild',
          '-showBuildSettings',
          '-workspace',
          '/path/to/workspace.xcworkspace',
          '-scheme',
          'MyScheme',
          '-configuration',
          'Debug',
          '-destination',
          'generic/platform=iOS',
        ],
        description: 'Get App Path',
        suppressErrors: true,
        workingDirectory: undefined,
      });
    });

    it('should return exact successful app path retrieval response', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output:
          'Build settings for scheme "MyScheme"\n\nBUILT_PRODUCTS_DIR = /path/to/build/Debug-iphoneos\nFULL_PRODUCT_NAME = MyApp.app\n',
      });

      const result = await get_device_app_pathLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ App path retrieved successfully: /path/to/build/Debug-iphoneos/MyApp.app',
          },
          {
            type: 'text',
            text: 'Next Steps:\n1. Get bundle ID: get_app_bundle_id({ appPath: "/path/to/build/Debug-iphoneos/MyApp.app" })\n2. Install app on device: install_app_device({ deviceId: "DEVICE_UDID", appPath: "/path/to/build/Debug-iphoneos/MyApp.app" })\n3. Launch app on device: launch_app_device({ deviceId: "DEVICE_UDID", bundleId: "BUNDLE_ID" })',
          },
        ],
      });
    });

    it('should return exact command failure response', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'xcodebuild: error: The project does not exist.',
      });

      const result = await get_device_app_pathLogic(
        {
          projectPath: '/path/to/nonexistent.xcodeproj',
          scheme: 'MyScheme',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to get app path: xcodebuild: error: The project does not exist.',
          },
        ],
        isError: true,
      });
    });

    it('should return exact parse failure response', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Build settings without required fields',
      });

      const result = await get_device_app_pathLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
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

    it('should include optional configuration parameter in command', async () => {
      const calls: Array<{
        args: any[];
        description: string;
        suppressErrors: boolean;
        workingDirectory: string | undefined;
      }> = [];

      const mockExecutor = (
        args: any[],
        description: string,
        suppressErrors: boolean,
        workingDirectory: string | undefined,
      ) => {
        calls.push({ args, description, suppressErrors, workingDirectory });
        return Promise.resolve({
          success: true,
          output:
            'Build settings for scheme "MyScheme"\n\nBUILT_PRODUCTS_DIR = /path/to/build/Release-iphoneos\nFULL_PRODUCT_NAME = MyApp.app\n',
          error: undefined,
          process: { pid: 12345 },
        });
      };

      await get_device_app_pathLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          configuration: 'Release',
        },
        mockExecutor,
      );

      expect(calls).toHaveLength(1);
      expect(calls[0]).toEqual({
        args: [
          'xcodebuild',
          '-showBuildSettings',
          '-project',
          '/path/to/project.xcodeproj',
          '-scheme',
          'MyScheme',
          '-configuration',
          'Release',
          '-destination',
          'generic/platform=iOS',
        ],
        description: 'Get App Path',
        suppressErrors: true,
        workingDirectory: undefined,
      });
    });

    it('should return exact exception handling response', async () => {
      const mockExecutor = () => {
        return Promise.reject(new Error('Network error'));
      };

      const result = await get_device_app_pathLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error retrieving app path: Network error',
          },
        ],
        isError: true,
      });
    });

    it('should return exact string error handling response', async () => {
      const mockExecutor = () => {
        return Promise.reject('String error');
      };

      const result = await get_device_app_pathLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error retrieving app path: String error',
          },
        ],
        isError: true,
      });
    });
  });
});
