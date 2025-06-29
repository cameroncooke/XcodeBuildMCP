/**
 * Test for get_sim_app_path_name_ws plugin
 * 
 * Tests the get_sim_app_path_name_ws tool extracted from src/tools/app-path/index.ts
 * This tests only the specific tool, not the entire tool collection.
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';

// Import the plugin
import getSimAppPathNameWsTool from './get_sim_app_path_name_ws.js';

// Mock external dependencies
vi.mock('child_process', () => ({
  spawn: vi.fn(),
  execSync: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  unlink: vi.fn(),
  mkdtemp: vi.fn(() => Promise.resolve('/tmp/test-dir')),
  rm: vi.fn(() => Promise.resolve()),
}));

// Mock logger to prevent real logging during tests
vi.mock('../../src/utils/logger.js', () => ({
  log: vi.fn(),
}));

// Mock command execution utility
vi.mock('../../src/utils/command.js', () => ({
  executeCommand: vi.fn(),
}));

describe('get_sim_app_path_name_ws plugin', () => {
  let mockExecuteCommand: MockedFunction<any>;

  beforeEach(async () => {
    // Mock external dependencies
    const commandUtils = await import('../../src/utils/command.js');
    mockExecuteCommand = commandUtils.executeCommand as MockedFunction<any>;

    // Default success behavior
    mockExecuteCommand.mockResolvedValue({
      success: true,
      output: `
BUILT_PRODUCTS_DIR = /Users/test/Library/Developer/Xcode/DerivedData/MyApp-abc123/Build/Products/Debug-iphonesimulator
FULL_PRODUCT_NAME = MyApp.app
      `,
    });

    vi.clearAllMocks();
  });

  it('should have correct plugin structure', () => {
    expect(getSimAppPathNameWsTool).toBeDefined();
    expect(getSimAppPathNameWsTool.name).toBe('get_sim_app_path_name_ws');
    expect(getSimAppPathNameWsTool.description).toContain('Gets the app bundle path for a simulator by name using a workspace');
    expect(getSimAppPathNameWsTool.schema).toBeDefined();
    expect(getSimAppPathNameWsTool.handler).toBeDefined();
    expect(typeof getSimAppPathNameWsTool.handler).toBe('function');
  });

  describe('parameter validation', () => {
    it('should reject missing workspacePath', async () => {
      const result = await getSimAppPathNameWsTool.handler({
        scheme: 'MyScheme',
        platform: 'iOS Simulator',
        simulatorName: 'iPhone 16',
      });

      expect(result.content).toEqual([
        {
          type: 'text',
          text: "Required parameter 'workspacePath' is missing. Please provide a value for this parameter.",
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should reject missing scheme', async () => {
      const result = await getSimAppPathNameWsTool.handler({
        workspacePath: '/path/to/Project.xcworkspace',
        platform: 'iOS Simulator',
        simulatorName: 'iPhone 16',
      });

      expect(result.content).toEqual([
        {
          type: 'text',
          text: "Required parameter 'scheme' is missing. Please provide a value for this parameter.",
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should reject missing platform', async () => {
      const result = await getSimAppPathNameWsTool.handler({
        workspacePath: '/path/to/Project.xcworkspace',
        scheme: 'MyScheme',
        simulatorName: 'iPhone 16',
      });

      expect(result.content).toEqual([
        {
          type: 'text',
          text: "Required parameter 'platform' is missing. Please provide a value for this parameter.",
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should reject missing simulatorName', async () => {
      const result = await getSimAppPathNameWsTool.handler({
        workspacePath: '/path/to/Project.xcworkspace',
        scheme: 'MyScheme',
        platform: 'iOS Simulator',
      });

      expect(result.content).toEqual([
        {
          type: 'text',
          text: "Required parameter 'simulatorName' is missing. Please provide a value for this parameter.",
        },
      ]);
      expect(result.isError).toBe(true);
    });
  });

  describe('success scenarios', () => {
    it('should return app path successfully for iOS Simulator', async () => {
      const params = {
        workspacePath: '/path/to/Project.xcworkspace',
        scheme: 'MyScheme',
        platform: 'iOS Simulator',
        simulatorName: 'iPhone 16',
      };

      const result = await getSimAppPathNameWsTool.handler(params);

      expect(result.content).toEqual([
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
      ]);
      expect(result.isError).toBeUndefined();

      // Verify xcodebuild command was called correctly
      expect(mockExecuteCommand).toHaveBeenCalledWith(
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
          'platform=iOS Simulator,name=iPhone 16,OS=latest',
        ],
        'Get App Path',
      );
    });

    it('should handle optional configuration parameter', async () => {
      const params = {
        workspacePath: '/path/to/Project.xcworkspace',
        scheme: 'MyScheme',
        platform: 'iOS Simulator',
        simulatorName: 'iPhone 16',
        configuration: 'Release',
      };

      const result = await getSimAppPathNameWsTool.handler(params);

      expect(result.isError).toBeUndefined();

      // Verify configuration parameter was used
      expect(mockExecuteCommand).toHaveBeenCalledWith(
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
      );
    });

    it('should handle useLatestOS=false parameter', async () => {
      const params = {
        workspacePath: '/path/to/Project.xcworkspace',
        scheme: 'MyScheme',
        platform: 'iOS Simulator',
        simulatorName: 'iPhone 16',
        useLatestOS: false,
      };

      const result = await getSimAppPathNameWsTool.handler(params);

      expect(result.isError).toBeUndefined();

      // Verify OS=latest was not added
      expect(mockExecuteCommand).toHaveBeenCalledWith(
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
      );
    });
  });

  describe('error scenarios', () => {
    it('should handle xcodebuild failure', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: 'xcodebuild failed',
      });

      const params = {
        workspacePath: '/path/to/Project.xcworkspace',
        scheme: 'MyScheme',
        platform: 'iOS Simulator',
        simulatorName: 'iPhone 16',
      };

      const result = await getSimAppPathNameWsTool.handler(params);

      expect(result.content).toEqual([
        {
          type: 'text',
          text: 'Failed to get app path: xcodebuild failed',
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should handle missing build settings', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'No valid build settings found',
      });

      const params = {
        workspacePath: '/path/to/Project.xcworkspace',
        scheme: 'MyScheme',
        platform: 'iOS Simulator',
        simulatorName: 'iPhone 16',
      };

      const result = await getSimAppPathNameWsTool.handler(params);

      expect(result.content).toEqual([
        {
          type: 'text',
          text: 'Failed to extract app path from build settings. Make sure the app has been built first.',
        },
      ]);
      expect(result.isError).toBe(true);
    });
  });
});