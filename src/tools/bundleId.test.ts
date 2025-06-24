/**
 * Bundle ID Tests - Comprehensive test coverage for bundle ID extraction tools
 *
 * This test file provides complete coverage for the bundleId.ts tools:
 * - getMacOSBundleId: Extract bundle ID from macOS app bundles
 * - getAppBundleId: Extract bundle ID from any Apple platform app bundles
 *
 * Tests follow the canonical testing patterns from CLAUDE.md with deterministic
 * response validation and comprehensive parameter testing.
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { getMacOSBundleId, getAppBundleId } from './bundleId.js';

// Mock child_process to prevent real command execution
vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

// Mock fs to prevent file system access during tests
vi.mock('fs', () => ({
  existsSync: vi.fn(() => true),
}));

// Mock the logger to prevent logging during tests
vi.mock('../utils/logger.js', () => ({
  log: vi.fn(),
}));

describe('bundleId tests', () => {
  let mockExecSync: MockedFunction<typeof execSync>;
  let mockExistsSync: MockedFunction<typeof existsSync>;

  beforeEach(() => {
    mockExecSync = vi.mocked(execSync);
    mockExistsSync = vi.mocked(existsSync);

    // Default success behavior for execSync
    mockExecSync.mockReturnValue('com.example.MyApp\n');

    // Default behavior for file system checks
    mockExistsSync.mockReturnValue(true);

    vi.clearAllMocks();
  });

  describe('getMacOSBundleId parameter validation', () => {
    it('should reject missing appPath parameter', async () => {
      await expect(getMacOSBundleId({})).rejects.toThrow();
    });

    it('should reject undefined appPath parameter', async () => {
      await expect(getMacOSBundleId({ appPath: undefined as any })).rejects.toThrow();
    });

    it('should reject null appPath parameter', async () => {
      await expect(getMacOSBundleId({ appPath: null as any })).rejects.toThrow();
    });

    it('should reject non-string appPath parameter', async () => {
      await expect(getMacOSBundleId({ appPath: 123 as any })).rejects.toThrow();
    });
  });

  describe('getAppBundleId parameter validation', () => {
    it('should reject missing appPath parameter', async () => {
      await expect(getAppBundleId({})).rejects.toThrow();
    });

    it('should reject undefined appPath parameter', async () => {
      await expect(getAppBundleId({ appPath: undefined as any })).rejects.toThrow();
    });

    it('should reject null appPath parameter', async () => {
      await expect(getAppBundleId({ appPath: null as any })).rejects.toThrow();
    });

    it('should reject non-string appPath parameter', async () => {
      await expect(getAppBundleId({ appPath: 123 as any })).rejects.toThrow();
    });
  });

  describe('getMacOSBundleId file existence validation', () => {
    it('should reject non-existent app path', async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await getMacOSBundleId({ appPath: '/path/to/nonexistent.app' });

      expect(result.content).toEqual([
        {
          type: 'text',
          text: "File not found: '/path/to/nonexistent.app'. Please check the path and try again.",
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should accept existing app path', async () => {
      mockExistsSync.mockReturnValue(true);

      const result = await getMacOSBundleId({ appPath: '/path/to/MyApp.app' });
      expect(result.isError).toBe(false);
    });
  });

  describe('getAppBundleId file existence validation', () => {
    it('should reject non-existent app path', async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await getAppBundleId({ appPath: '/path/to/nonexistent.app' });

      expect(result.content).toEqual([
        {
          type: 'text',
          text: "File not found: '/path/to/nonexistent.app'. Please check the path and try again.",
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should accept existing app path', async () => {
      mockExistsSync.mockReturnValue(true);

      const result = await getAppBundleId({ appPath: '/path/to/MyApp.app' });
      expect(result.isError).toBe(false);
    });
  });

  describe('getMacOSBundleId success scenarios', () => {
    it('should extract bundle ID using defaults read successfully', async () => {
      mockExecSync.mockReturnValue('com.example.MyMacApp\n');

      const result = await getMacOSBundleId({ appPath: '/path/to/MyApp.app' });

      expect(result.content).toEqual([
        { type: 'text', text: ' Bundle ID for macOS app: com.example.MyMacApp' },
        {
          type: 'text',
          text: 'Next Steps:\n- Launch the app: launch_macos_app({ appPath: "/path/to/MyApp.app" })',
        },
      ]);
      expect(result.isError).toBe(false);

      expect(mockExecSync).toHaveBeenCalledWith(
        'defaults read "/path/to/MyApp.app/Contents/Info" CFBundleIdentifier',
      );
    });

    it('should extract bundle ID using PlistBuddy as fallback when defaults read fails', async () => {
      // First call (defaults read) fails, second call (PlistBuddy) succeeds
      mockExecSync
        .mockImplementationOnce(() => {
          throw new Error('defaults read failed');
        })
        .mockReturnValueOnce('com.example.MyMacApp\n');

      const result = await getMacOSBundleId({ appPath: '/path/to/MyApp.app' });

      expect(result.content).toEqual([
        { type: 'text', text: ' Bundle ID for macOS app: com.example.MyMacApp' },
        {
          type: 'text',
          text: 'Next Steps:\n- Launch the app: launch_macos_app({ appPath: "/path/to/MyApp.app" })',
        },
      ]);
      expect(result.isError).toBe(false);

      expect(mockExecSync).toHaveBeenCalledWith(
        'defaults read "/path/to/MyApp.app/Contents/Info" CFBundleIdentifier',
      );
      expect(mockExecSync).toHaveBeenCalledWith(
        '/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "/path/to/MyApp.app/Contents/Info.plist"',
      );
    });

    it('should handle error when both defaults read and PlistBuddy fail', async () => {
      mockExecSync
        .mockImplementationOnce(() => {
          throw new Error('defaults read failed');
        })
        .mockImplementationOnce(() => {
          throw new Error('PlistBuddy failed');
        });

      const result = await getMacOSBundleId({ appPath: '/path/to/MyApp.app' });

      expect(result.content).toEqual([
        {
          type: 'text',
          text: 'Error extracting macOS bundle ID: Could not extract bundle ID from Info.plist: PlistBuddy failed',
        },
        {
          type: 'text',
          text: 'Make sure the path points to a valid macOS app bundle (.app directory).',
        },
      ]);
      expect(result.isError).toBe(true);
    });
  });

  describe('getAppBundleId success scenarios', () => {
    it('should extract bundle ID using defaults read successfully', async () => {
      mockExecSync.mockReturnValue('com.example.MyApp\n');

      const result = await getAppBundleId({ appPath: '/path/to/MyApp.app' });

      expect(result.content).toEqual([
        { type: 'text', text: ' Bundle ID: com.example.MyApp' },
        {
          type: 'text',
          text: 'Next Steps:\n- Install in simulator: install_app_in_simulator({ simulatorUuid: "SIMULATOR_UUID", appPath: "/path/to/MyApp.app" })\n- Launch in simulator: launch_app_in_simulator({ simulatorUuid: "SIMULATOR_UUID", bundleId: "com.example.MyApp" })\n- Or install on device: install_app_device({ deviceId: "DEVICE_UDID", appPath: "/path/to/MyApp.app" })\n- Or launch on device: launch_app_device({ deviceId: "DEVICE_UDID", bundleId: "com.example.MyApp" })',
        },
      ]);
      expect(result.isError).toBe(false);

      expect(mockExecSync).toHaveBeenCalledWith(
        'defaults read "/path/to/MyApp.app/Info" CFBundleIdentifier',
      );
    });

    it('should extract bundle ID using PlistBuddy as fallback when defaults read fails', async () => {
      // First call (defaults read) fails, second call (PlistBuddy) succeeds
      mockExecSync
        .mockImplementationOnce(() => {
          throw new Error('defaults read failed');
        })
        .mockReturnValueOnce('com.example.MyApp\n');

      const result = await getAppBundleId({ appPath: '/path/to/MyApp.app' });

      expect(result.content).toEqual([
        { type: 'text', text: ' Bundle ID: com.example.MyApp' },
        {
          type: 'text',
          text: 'Next Steps:\n- Install in simulator: install_app_in_simulator({ simulatorUuid: "SIMULATOR_UUID", appPath: "/path/to/MyApp.app" })\n- Launch in simulator: launch_app_in_simulator({ simulatorUuid: "SIMULATOR_UUID", bundleId: "com.example.MyApp" })\n- Or install on device: install_app_device({ deviceId: "DEVICE_UDID", appPath: "/path/to/MyApp.app" })\n- Or launch on device: launch_app_device({ deviceId: "DEVICE_UDID", bundleId: "com.example.MyApp" })',
        },
      ]);
      expect(result.isError).toBe(false);

      expect(mockExecSync).toHaveBeenCalledWith(
        'defaults read "/path/to/MyApp.app/Info" CFBundleIdentifier',
      );
      expect(mockExecSync).toHaveBeenCalledWith(
        '/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "/path/to/MyApp.app/Info.plist"',
      );
    });

    it('should handle error when both defaults read and PlistBuddy fail', async () => {
      mockExecSync
        .mockImplementationOnce(() => {
          throw new Error('defaults read failed');
        })
        .mockImplementationOnce(() => {
          throw new Error('PlistBuddy failed');
        });

      const result = await getAppBundleId({ appPath: '/path/to/MyApp.app' });

      expect(result.content).toEqual([
        {
          type: 'text',
          text: 'Error extracting app bundle ID: Could not extract bundle ID from Info.plist: PlistBuddy failed',
        },
        { type: 'text', text: 'Make sure the path points to a valid app bundle (.app directory).' },
      ]);
      expect(result.isError).toBe(true);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle bundle ID with whitespace correctly for macOS tool', async () => {
      mockExecSync.mockReturnValue(' com.example.MyApp \n');

      const result = await getMacOSBundleId({ appPath: '/path/to/MyApp.app' });

      expect(result.content).toEqual([
        { type: 'text', text: ' Bundle ID for macOS app: com.example.MyApp' },
        {
          type: 'text',
          text: 'Next Steps:\n- Launch the app: launch_macos_app({ appPath: "/path/to/MyApp.app" })',
        },
      ]);
      expect(result.isError).toBe(false);
    });

    it('should handle bundle ID with whitespace correctly for general tool', async () => {
      mockExecSync.mockReturnValue(' com.example.MyApp \n');

      const result = await getAppBundleId({ appPath: '/path/to/MyApp.app' });

      expect(result.content).toEqual([
        { type: 'text', text: ' Bundle ID: com.example.MyApp' },
        {
          type: 'text',
          text: 'Next Steps:\n- Install in simulator: install_app_in_simulator({ simulatorUuid: "SIMULATOR_UUID", appPath: "/path/to/MyApp.app" })\n- Launch in simulator: launch_app_in_simulator({ simulatorUuid: "SIMULATOR_UUID", bundleId: "com.example.MyApp" })\n- Or install on device: install_app_device({ deviceId: "DEVICE_UDID", appPath: "/path/to/MyApp.app" })\n- Or launch on device: launch_app_device({ deviceId: "DEVICE_UDID", bundleId: "com.example.MyApp" })',
        },
      ]);
      expect(result.isError).toBe(false);
    });

    it('should handle app paths with special characters correctly', async () => {
      mockExecSync.mockReturnValue('com.example.MyApp\n');

      const result = await getMacOSBundleId({ appPath: '/path/to/My App (Beta).app' });

      expect(result.content).toEqual([
        { type: 'text', text: ' Bundle ID for macOS app: com.example.MyApp' },
        {
          type: 'text',
          text: 'Next Steps:\n- Launch the app: launch_macos_app({ appPath: "/path/to/My App (Beta).app" })',
        },
      ]);
      expect(result.isError).toBe(false);

      // Verify that the path is properly quoted in the command
      expect(mockExecSync).toHaveBeenCalledWith(
        'defaults read "/path/to/My App (Beta).app/Contents/Info" CFBundleIdentifier',
      );
    });

    it('should handle empty bundle ID response', async () => {
      mockExecSync.mockReturnValue('');

      const result = await getMacOSBundleId({ appPath: '/path/to/MyApp.app' });

      expect(result.content).toEqual([
        { type: 'text', text: ' Bundle ID for macOS app: ' },
        {
          type: 'text',
          text: 'Next Steps:\n- Launch the app: launch_macos_app({ appPath: "/path/to/MyApp.app" })',
        },
      ]);
      expect(result.isError).toBe(false);
    });

    it('should handle non-Error exceptions correctly', async () => {
      mockExecSync
        .mockImplementationOnce(() => {
          throw 'String error';
        })
        .mockImplementationOnce(() => {
          throw 'PlistBuddy string error';
        });

      const result = await getMacOSBundleId({ appPath: '/path/to/MyApp.app' });

      expect(result.content).toEqual([
        {
          type: 'text',
          text: 'Error extracting macOS bundle ID: Could not extract bundle ID from Info.plist: PlistBuddy string error',
        },
        {
          type: 'text',
          text: 'Make sure the path points to a valid macOS app bundle (.app directory).',
        },
      ]);
      expect(result.isError).toBe(true);
    });
  });
});
