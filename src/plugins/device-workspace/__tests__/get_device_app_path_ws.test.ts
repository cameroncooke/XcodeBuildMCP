/**
 * Tests for get_device_app_path_ws plugin
 * Following CLAUDE.md testing standards with literal validation
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import getDeviceAppPathWs from '../get_device_app_path_ws.ts';

// Mock external dependencies
vi.mock('../../utils/index.js', () => ({
  log: vi.fn(),
  validateRequiredParam: vi.fn(),
  createTextResponse: vi.fn(),
  executeCommand: vi.fn(),
  constructDestinationString: vi.fn(),
}));

describe('get_device_app_path_ws plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(getDeviceAppPathWs.name).toBe('get_device_app_path_ws');
    });

    it('should have correct description', () => {
      expect(getDeviceAppPathWs.description).toBe(
        "Gets the app bundle path for a physical device application (iOS, watchOS, tvOS, visionOS) using a workspace. IMPORTANT: Requires workspacePath and scheme. Example: get_device_app_path_ws({ workspacePath: '/path/to/workspace', scheme: 'MyScheme' })",
      );
    });

    it('should have handler function', () => {
      expect(typeof getDeviceAppPathWs.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Test required fields
      expect(
        getDeviceAppPathWs.schema.workspacePath.safeParse('/path/to/workspace.xcworkspace').success,
      ).toBe(true);
      expect(getDeviceAppPathWs.schema.scheme.safeParse('MyScheme').success).toBe(true);

      // Test optional fields
      expect(getDeviceAppPathWs.schema.configuration.safeParse('Debug').success).toBe(true);
      expect(getDeviceAppPathWs.schema.platform.safeParse('iOS').success).toBe(true);
      expect(getDeviceAppPathWs.schema.platform.safeParse('watchOS').success).toBe(true);

      // Test invalid inputs
      expect(getDeviceAppPathWs.schema.workspacePath.safeParse(123).success).toBe(false);
      expect(getDeviceAppPathWs.schema.platform.safeParse('invalidPlatform').success).toBe(false);
    });
  });

  class MockChildProcess extends EventEmitter {
    stdout = new EventEmitter();
    stderr = new EventEmitter();
    pid = 12345;
  }

  let mockSpawn: Record<string, unknown>;
  let mockProcess: MockChildProcess;

  beforeEach(async () => {
    const { spawn } = await import('child_process');
    mockSpawn = vi.mocked(spawn);
    mockProcess = new MockChildProcess();
    mockSpawn.mockReturnValue(mockProcess);

    vi.clearAllMocks();
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return exact validation error response for workspacePath', async () => {
      const result = await getDeviceAppPathWs.handler({
        scheme: 'MyScheme',
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

    it('should return exact validation error response for scheme', async () => {
      const result = await getDeviceAppPathWs.handler({
        workspacePath: '/path/to/workspace.xcworkspace',
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

    it('should generate correct xcodebuild command for getting build settings', async () => {
      setTimeout(() => {
        mockProcess.stdout.emit(
          'data',
          'BUILT_PRODUCTS_DIR = /path/to/build/products/dir\nFULL_PRODUCT_NAME = MyApp.app',
        );
        mockProcess.emit('close', 0);
      }, 0);

      const resultPromise = getDeviceAppPathWs.handler({
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyScheme',
        configuration: 'Debug',
        platform: 'iOS',
      });

      const result = await resultPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        'sh',
        [
          '-c',
          'xcodebuild -workspace "/path/to/workspace.xcworkspace" -scheme "MyScheme" -configuration "Debug" -destination "generic/platform=iOS" -showBuildSettings',
        ],
        expect.any(Object),
      );
    });

    it('should return exact successful app path response for iOS', async () => {
      setTimeout(() => {
        mockProcess.stdout.emit(
          'data',
          'BUILT_PRODUCTS_DIR = /path/to/build/products/dir\nFULL_PRODUCT_NAME = MyApp.app',
        );
        mockProcess.emit('close', 0);
      }, 0);

      const result = await getDeviceAppPathWs.handler({
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyScheme',
        configuration: 'Debug',
        platform: 'iOS',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ App path retrieved successfully: /path/to/build/products/dir/MyApp.app',
          },
          {
            type: 'text',
            text: 'Next Steps:\n1. Get bundle ID: get_app_bundle_id({ appPath: "/path/to/build/products/dir/MyApp.app" })\n2. Install app on device: install_app_device({ deviceId: "DEVICE_UDID", appPath: "/path/to/build/products/dir/MyApp.app" })\n3. Launch app on device: launch_app_device({ deviceId: "DEVICE_UDID", bundleId: "BUNDLE_ID" })',
          },
        ],
      });
    });

    it('should return exact build failure response', async () => {
      setTimeout(() => {
        mockProcess.stderr.emit('data', 'xcodebuild: error: Scheme NonExistentScheme not found');
        mockProcess.emit('close', 65);
      }, 0);

      const result = await getDeviceAppPathWs.handler({
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'NonExistentScheme',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to get app path: xcodebuild: error: Scheme NonExistentScheme not found',
          },
        ],
        isError: true,
      });
    });

    it('should return exact missing build settings response', async () => {
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Some output without build settings');
        mockProcess.emit('close', 0);
      }, 0);

      const result = await getDeviceAppPathWs.handler({
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyScheme',
      });

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

    it('should return exact exception handling response', async () => {
      setTimeout(() => {
        mockProcess.emit('error', new Error('Network error'));
      }, 0);

      const result = await getDeviceAppPathWs.handler({
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error retrieving app path: Network error' }],
        isError: true,
      });
    });
  });
});
