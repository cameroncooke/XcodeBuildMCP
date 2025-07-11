import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';
import plugin from '../get_app_bundle_id.ts';
import { execSync } from 'child_process';

// Mock only the child_process execution at the lowest level
vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: vi.fn(),
}));

const mockExecSync = execSync as MockedFunction<typeof execSync>;
import fs from 'fs';
const mockExistsSync = vi.mocked(fs.existsSync);

describe('get_app_bundle_id plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
      mockExistsSync.mockReturnValueOnce(false);

      const result = await plugin.handler({ appPath: '/path/to/MyApp.app' });

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
      mockExistsSync.mockReturnValueOnce(true);
      mockExecSync.mockReturnValueOnce('com.example.MyApp\n');

      const result = await plugin.handler({ appPath: '/path/to/MyApp.app' });

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
      mockExistsSync.mockReturnValueOnce(true);
      mockExecSync
        .mockImplementationOnce(() => {
          throw new Error('defaults read failed');
        })
        .mockReturnValueOnce('com.example.MyApp\n');

      const result = await plugin.handler({ appPath: '/path/to/MyApp.app' });

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
      mockExistsSync.mockReturnValueOnce(true);
      mockExecSync.mockImplementation(() => {
        throw new Error('Command failed');
      });

      const result = await plugin.handler({ appPath: '/path/to/MyApp.app' });

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
      mockExistsSync.mockReturnValueOnce(true);
      mockExecSync.mockImplementation(() => {
        throw new Error('Custom error message');
      });

      const result = await plugin.handler({ appPath: '/path/to/MyApp.app' });

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
      mockExistsSync.mockReturnValueOnce(true);
      mockExecSync.mockImplementation(() => {
        throw 'String error';
      });

      const result = await plugin.handler({ appPath: '/path/to/MyApp.app' });

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
      await expect(plugin.handler({ appPath: null })).rejects.toThrow();
    });
  });
});
