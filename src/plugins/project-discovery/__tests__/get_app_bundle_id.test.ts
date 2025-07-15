/**
 * Test for get_app_bundle_id plugin - Dependency Injection Architecture
 *
 * Tests the plugin structure and exported components for get_app_bundle_id tool.
 * Uses pure dependency injection with createMockFileSystemExecutor.
 * NO VITEST MOCKING ALLOWED - Only createMockFileSystemExecutor
 *
 * Plugin location: plugins/project-discovery/get_app_bundle_id.ts
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import plugin, { type SyncExecutor } from '../get_app_bundle_id.ts';
import { createMockFileSystemExecutor } from '../../../utils/command.js';

describe('get_app_bundle_id plugin', () => {
  // Helper function to create mock sync executor
  const createMockSyncExecutor = (results: Record<string, string | Error>): SyncExecutor => {
    const calls: string[] = [];
    return (command: string): string => {
      calls.push(command);
      const result = results[command];
      if (result instanceof Error) {
        throw result;
      }
      if (typeof result === 'string') {
        return result;
      }
      throw new Error(`Unexpected command: ${command}`);
    };
  };

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(plugin.name).toBe('get_app_bundle_id');
    });

    it('should have correct description', () => {
      expect(plugin.description).toBe(
        "Extracts the bundle identifier from an app bundle (.app) for any Apple platform (iOS, iPadOS, watchOS, tvOS, visionOS). IMPORTANT: You MUST provide the appPath parameter. Example: get_app_bundle_id({ appPath: '/path/to/your/app.app' })",
      );
    });

    it('should have handler function', () => {
      expect(typeof plugin.handler).toBe('function');
    });

    it('should validate schema with valid inputs', () => {
      expect(plugin.schema.safeParse({ appPath: '/path/to/MyApp.app' }).success).toBe(true);
      expect(plugin.schema.safeParse({ appPath: '/Users/dev/MyApp.app' }).success).toBe(true);
    });

    it('should validate schema with invalid inputs', () => {
      expect(plugin.schema.safeParse({}).success).toBe(false);
      expect(plugin.schema.safeParse({ appPath: 123 }).success).toBe(false);
      expect(plugin.schema.safeParse({ appPath: null }).success).toBe(false);
      expect(plugin.schema.safeParse({ appPath: undefined }).success).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return error when appPath validation fails', async () => {
      const result = await plugin.handler({ appPath: null });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'appPath' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should return error when file exists validation fails', async () => {
      const mockSyncExecutor = createMockSyncExecutor({});
      const mockFileSystemExecutor = createMockFileSystemExecutor({
        existsSync: () => false,
      });

      const result = await plugin.handler(
        { appPath: '/path/to/MyApp.app' },
        mockSyncExecutor,
        mockFileSystemExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "File not found: '/path/to/MyApp.app'. Please check the path and try again.",
          },
        ],
        isError: true,
      });
    });

    it('should return success with bundle ID using defaults read', async () => {
      const mockSyncExecutor = createMockSyncExecutor({
        'defaults read "/path/to/MyApp.app/Info" CFBundleIdentifier': 'com.example.MyApp',
      });
      const mockFileSystemExecutor = createMockFileSystemExecutor({
        existsSync: () => true,
      });

      const result = await plugin.handler(
        { appPath: '/path/to/MyApp.app' },
        mockSyncExecutor,
        mockFileSystemExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ Bundle ID: com.example.MyApp',
          },
          {
            type: 'text',
            text: `Next Steps:
- Install in simulator: install_app_in_simulator({ simulatorUuid: "SIMULATOR_UUID", appPath: "/path/to/MyApp.app" })
- Launch in simulator: launch_app_in_simulator({ simulatorUuid: "SIMULATOR_UUID", bundleId: "com.example.MyApp" })
- Or install on device: install_app_device({ deviceId: "DEVICE_UDID", appPath: "/path/to/MyApp.app" })
- Or launch on device: launch_app_device({ deviceId: "DEVICE_UDID", bundleId: "com.example.MyApp" })`,
          },
        ],
        isError: false,
      });
    });

    it('should fallback to PlistBuddy when defaults read fails', async () => {
      const mockSyncExecutor = createMockSyncExecutor({
        'defaults read "/path/to/MyApp.app/Info" CFBundleIdentifier': new Error(
          'defaults read failed',
        ),
        '/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "/path/to/MyApp.app/Info.plist"':
          'com.example.MyApp',
      });
      const mockFileSystemExecutor = createMockFileSystemExecutor({
        existsSync: () => true,
      });

      const result = await plugin.handler(
        { appPath: '/path/to/MyApp.app' },
        mockSyncExecutor,
        mockFileSystemExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ Bundle ID: com.example.MyApp',
          },
          {
            type: 'text',
            text: `Next Steps:
- Install in simulator: install_app_in_simulator({ simulatorUuid: "SIMULATOR_UUID", appPath: "/path/to/MyApp.app" })
- Launch in simulator: launch_app_in_simulator({ simulatorUuid: "SIMULATOR_UUID", bundleId: "com.example.MyApp" })
- Or install on device: install_app_device({ deviceId: "DEVICE_UDID", appPath: "/path/to/MyApp.app" })
- Or launch on device: launch_app_device({ deviceId: "DEVICE_UDID", bundleId: "com.example.MyApp" })`,
          },
        ],
        isError: false,
      });
    });

    it('should return error when both extraction methods fail', async () => {
      const mockSyncExecutor = createMockSyncExecutor({
        'defaults read "/path/to/MyApp.app/Info" CFBundleIdentifier': new Error(
          'defaults read failed',
        ),
        '/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "/path/to/MyApp.app/Info.plist"':
          new Error('Command failed'),
      });
      const mockFileSystemExecutor = createMockFileSystemExecutor({
        existsSync: () => true,
      });

      const result = await plugin.handler(
        { appPath: '/path/to/MyApp.app' },
        mockSyncExecutor,
        mockFileSystemExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error extracting app bundle ID: Could not extract bundle ID from Info.plist: Command failed',
          },
          {
            type: 'text',
            text: 'Make sure the path points to a valid app bundle (.app directory).',
          },
        ],
        isError: true,
      });
    });

    it('should handle Error objects in catch blocks', async () => {
      const mockSyncExecutor = createMockSyncExecutor({
        'defaults read "/path/to/MyApp.app/Info" CFBundleIdentifier': new Error(
          'defaults read failed',
        ),
        '/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "/path/to/MyApp.app/Info.plist"':
          new Error('Custom error message'),
      });
      const mockFileSystemExecutor = createMockFileSystemExecutor({
        existsSync: () => true,
      });

      const result = await plugin.handler(
        { appPath: '/path/to/MyApp.app' },
        mockSyncExecutor,
        mockFileSystemExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error extracting app bundle ID: Could not extract bundle ID from Info.plist: Custom error message',
          },
          {
            type: 'text',
            text: 'Make sure the path points to a valid app bundle (.app directory).',
          },
        ],
        isError: true,
      });
    });

    it('should handle string errors in catch blocks', async () => {
      const mockSyncExecutor = createMockSyncExecutor({
        'defaults read "/path/to/MyApp.app/Info" CFBundleIdentifier': new Error(
          'defaults read failed',
        ),
        '/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "/path/to/MyApp.app/Info.plist"':
          new Error('String error'),
      });
      const mockFileSystemExecutor = createMockFileSystemExecutor({
        existsSync: () => true,
      });

      const result = await plugin.handler(
        { appPath: '/path/to/MyApp.app' },
        mockSyncExecutor,
        mockFileSystemExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error extracting app bundle ID: Could not extract bundle ID from Info.plist: String error',
          },
          {
            type: 'text',
            text: 'Make sure the path points to a valid app bundle (.app directory).',
          },
        ],
        isError: true,
      });
    });

    it('should handle schema validation error when appPath is null', async () => {
      // Schema validation will throw before reaching validateRequiredParam
      const result = await plugin.handler({ appPath: null });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'appPath' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should handle schema validation with missing appPath', async () => {
      const result = await plugin.handler({});

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'appPath' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should handle schema validation with undefined appPath', async () => {
      const result = await plugin.handler({ appPath: undefined });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'appPath' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should handle schema validation with number type appPath', async () => {
      const result = await plugin.handler({ appPath: 123 });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'appPath' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });
  });
});
