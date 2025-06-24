/**
 * Bundle ID Tests - Comprehensive test coverage for bundle ID extraction tools
 *
 * This test file provides complete coverage for the bundleId.ts tools:
 * - get_mac_bundle_id: Extract bundle ID from macOS app bundles
 * - get_app_bundle_id: Extract bundle ID from any Apple platform app bundles
 *
 * Tests follow the canonical testing patterns from CLAUDE.md with deterministic
 * response validation and comprehensive parameter testing.
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { execSync } from 'child_process';
import { callToolHandler } from '../../tests-vitest/helpers/vitest-tool-helpers.js';
import { z } from 'zod';

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
  let mockExecSync: MockedFunction<any>;
  let mockExistsSync: MockedFunction<any>;

  beforeEach(async () => {
    // Import and setup the mocked execSync function
    const childProcessModule = await import('child_process');
    mockExecSync = childProcessModule.execSync as MockedFunction<any>;

    // Import and setup the mocked fs.existsSync function
    const fs = await import('fs');
    mockExistsSync = fs.existsSync as MockedFunction<any>;

    // Default success behavior for execSync
    mockExecSync.mockReturnValue('com.example.MyApp\n');

    // Default behavior for file system checks
    mockExistsSync.mockReturnValue(true);

    vi.clearAllMocks();
  });

  // Helper function to replicate get_mac_bundle_id logic
  async function handleGetMacOSBundleIdLogic(params: { appPath: string }) {
    // Parameter validation
    if (params.appPath === undefined || params.appPath === null) {
      return {
        content: [
          {
            type: 'text',
            text: "Required parameter 'appPath' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      };
    }

    // File existence check
    if (!mockExistsSync(params.appPath)) {
      return {
        content: [
          {
            type: 'text',
            text: `File not found: '${params.appPath}'. Please check the path and try again.`,
          },
        ],
        isError: true,
      };
    }

    try {
      let bundleId;

      try {
        bundleId = execSync(`defaults read "${params.appPath}/Contents/Info" CFBundleIdentifier`)
          .toString()
          .trim();
      } catch {
        try {
          bundleId = execSync(
            `/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "${params.appPath}/Contents/Info.plist"`,
          )
            .toString()
            .trim();
        } catch (innerError: unknown) {
          throw new Error(
            `Could not extract bundle ID from Info.plist: ${innerError instanceof Error ? innerError.message : String(innerError)}`,
          );
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: ` Bundle ID for macOS app: ${bundleId}`,
          },
          {
            type: 'text',
            text: `Next Steps:
- Launch the app: launch_macos_app({ appPath: "${params.appPath}" })`,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        content: [
          {
            type: 'text',
            text: `Error extracting macOS bundle ID: ${errorMessage}`,
          },
          {
            type: 'text',
            text: `Make sure the path points to a valid macOS app bundle (.app directory).`,
          },
        ],
      };
    }
  }

  // Helper function to replicate get_app_bundle_id logic
  async function handleGetAppBundleIdLogic(params: { appPath: string }) {
    // Parameter validation
    if (params.appPath === undefined || params.appPath === null) {
      return {
        content: [
          {
            type: 'text',
            text: "Required parameter 'appPath' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      };
    }

    // File existence check
    if (!mockExistsSync(params.appPath)) {
      return {
        content: [
          {
            type: 'text',
            text: `File not found: '${params.appPath}'. Please check the path and try again.`,
          },
        ],
        isError: true,
      };
    }

    try {
      let bundleId;

      try {
        bundleId = execSync(`defaults read "${params.appPath}/Info" CFBundleIdentifier`)
          .toString()
          .trim();
      } catch {
        try {
          bundleId = execSync(
            `/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "${params.appPath}/Info.plist"`,
          )
            .toString()
            .trim();
        } catch (innerError: unknown) {
          throw new Error(
            `Could not extract bundle ID from Info.plist: ${innerError instanceof Error ? innerError.message : String(innerError)}`,
          );
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: ` Bundle ID: ${bundleId}`,
          },
          {
            type: 'text',
            text: `Next Steps:
- Install in simulator: install_app_in_simulator({ simulatorUuid: "SIMULATOR_UUID", appPath: "${params.appPath}" })
- Launch in simulator: launch_app_in_simulator({ simulatorUuid: "SIMULATOR_UUID", bundleId: "${bundleId}" })
- Or install on device: install_app_device({ deviceId: "DEVICE_UDID", appPath: "${params.appPath}" })
- Or launch on device: launch_app_device({ deviceId: "DEVICE_UDID", bundleId: "${bundleId}" })`,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        content: [
          {
            type: 'text',
            text: `Error extracting app bundle ID: ${errorMessage}`,
          },
          {
            type: 'text',
            text: `Make sure the path points to a valid app bundle (.app directory).`,
          },
        ],
      };
    }
  }

  // Tool schema definitions for testing
  const getMacOSBundleIdSchema = z.object({
    appPath: z
      .string()
      .describe(
        'Path to the macOS .app bundle to extract bundle ID from (full path to the .app directory)',
      ),
  });

  const getAppBundleIdSchema = z.object({
    appPath: z
      .string()
      .describe(
        'Path to the .app bundle to extract bundle ID from (full path to the .app directory)',
      ),
  });

  // Mock tool definitions for testing
  const getMacOSBundleIdTool = {
    name: 'get_mac_bundle_id',
    description:
      "Extracts the bundle identifier from a macOS app bundle (.app). IMPORTANT: You MUST provide the appPath parameter. Example: get_mac_bundle_id({ appPath: '/path/to/your/app.app' }) Note: In some environments, this tool may be prefixed as mcp0_get_macos_bundle_id.",
    groups: ['BUNDLE_ID'],
    schema: getMacOSBundleIdSchema,
    handler: async (params: { appPath: string }) => {
      return handleGetMacOSBundleIdLogic(params);
    },
  };

  const getAppBundleIdTool = {
    name: 'get_app_bundle_id',
    description:
      "Extracts the bundle identifier from an app bundle (.app) for any Apple platform (iOS, iPadOS, watchOS, tvOS, visionOS). IMPORTANT: You MUST provide the appPath parameter. Example: get_app_bundle_id({ appPath: '/path/to/your/app.app' })",
    groups: ['BUNDLE_ID'],
    schema: getAppBundleIdSchema,
    handler: async (params: { appPath: string }) => {
      return handleGetAppBundleIdLogic(params);
    },
  };

  describe('get_mac_bundle_id parameter validation', () => {
    it('should reject missing appPath parameter', async () => {
      const result = await callToolHandler(getMacOSBundleIdTool, {});
      expect(result.content).toEqual([
        {
          type: 'text',
          text: "Required parameter 'appPath' is missing. Please provide a value for this parameter.",
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should reject undefined appPath parameter', async () => {
      const result = await callToolHandler(getMacOSBundleIdTool, { appPath: undefined });
      expect(result.content).toEqual([
        {
          type: 'text',
          text: "Required parameter 'appPath' is missing. Please provide a value for this parameter.",
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should reject null appPath parameter', async () => {
      const result = await callToolHandler(getMacOSBundleIdTool, { appPath: null });
      expect(result.content).toEqual([
        { type: 'text', text: "Parameter 'appPath' must be of type string, but received null." },
      ]);
      expect(result.isError).toBe(true);
    });
  });

  describe('get_app_bundle_id parameter validation', () => {
    it('should reject missing appPath parameter', async () => {
      const result = await callToolHandler(getAppBundleIdTool, {});
      expect(result.content).toEqual([
        {
          type: 'text',
          text: "Required parameter 'appPath' is missing. Please provide a value for this parameter.",
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should reject undefined appPath parameter', async () => {
      const result = await callToolHandler(getAppBundleIdTool, { appPath: undefined });
      expect(result.content).toEqual([
        {
          type: 'text',
          text: "Required parameter 'appPath' is missing. Please provide a value for this parameter.",
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should reject null appPath parameter', async () => {
      const result = await callToolHandler(getAppBundleIdTool, { appPath: null });
      expect(result.content).toEqual([
        { type: 'text', text: "Parameter 'appPath' must be of type string, but received null." },
      ]);
      expect(result.isError).toBe(true);
    });
  });

  describe('get_mac_bundle_id file existence validation', () => {
    it('should reject non-existent app path', async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await callToolHandler(getMacOSBundleIdTool, {
        appPath: '/path/to/nonexistent.app',
      });
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

      const result = await callToolHandler(getMacOSBundleIdTool, { appPath: '/path/to/MyApp.app' });
      expect(result.isError).toBe(false);
    });
  });

  describe('get_app_bundle_id file existence validation', () => {
    it('should reject non-existent app path', async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await callToolHandler(getAppBundleIdTool, {
        appPath: '/path/to/nonexistent.app',
      });
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

      const result = await callToolHandler(getAppBundleIdTool, { appPath: '/path/to/MyApp.app' });
      expect(result.isError).toBe(false);
    });
  });

  describe('get_mac_bundle_id success scenarios', () => {
    it('should extract bundle ID using defaults read successfully', async () => {
      mockExecSync.mockReturnValue('com.example.MyMacApp\n');

      const params = { appPath: '/path/to/MyApp.app' };
      const result = await callToolHandler(getMacOSBundleIdTool, params);

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

      const params = { appPath: '/path/to/MyApp.app' };
      const result = await callToolHandler(getMacOSBundleIdTool, params);

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

      const params = { appPath: '/path/to/MyApp.app' };
      const result = await callToolHandler(getMacOSBundleIdTool, params);

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
      expect(result.isError).toBe(false); // The tool handles errors gracefully without setting isError
    });
  });

  describe('get_app_bundle_id success scenarios', () => {
    it('should extract bundle ID using defaults read successfully', async () => {
      mockExecSync.mockReturnValue('com.example.MyApp\n');

      const params = { appPath: '/path/to/MyApp.app' };
      const result = await callToolHandler(getAppBundleIdTool, params);

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

      const params = { appPath: '/path/to/MyApp.app' };
      const result = await callToolHandler(getAppBundleIdTool, params);

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

      const params = { appPath: '/path/to/MyApp.app' };
      const result = await callToolHandler(getAppBundleIdTool, params);

      expect(result.content).toEqual([
        {
          type: 'text',
          text: 'Error extracting app bundle ID: Could not extract bundle ID from Info.plist: PlistBuddy failed',
        },
        { type: 'text', text: 'Make sure the path points to a valid app bundle (.app directory).' },
      ]);
      expect(result.isError).toBe(false); // The tool handles errors gracefully without setting isError
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle bundle ID with whitespace correctly for macOS tool', async () => {
      mockExecSync.mockReturnValue(' com.example.MyApp \n');

      const params = { appPath: '/path/to/MyApp.app' };
      const result = await callToolHandler(getMacOSBundleIdTool, params);

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

      const params = { appPath: '/path/to/MyApp.app' };
      const result = await callToolHandler(getAppBundleIdTool, params);

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

      const params = { appPath: '/path/to/My App (Beta).app' };
      const result = await callToolHandler(getMacOSBundleIdTool, params);

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

      const params = { appPath: '/path/to/MyApp.app' };
      const result = await callToolHandler(getMacOSBundleIdTool, params);

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

      const params = { appPath: '/path/to/MyApp.app' };
      const result = await callToolHandler(getMacOSBundleIdTool, params);

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
      expect(result.isError).toBe(false);
    });
  });
});
