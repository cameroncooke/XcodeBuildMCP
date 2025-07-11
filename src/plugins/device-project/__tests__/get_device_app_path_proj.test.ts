/**
 * Tests for get_device_app_path_proj plugin
 * Following CLAUDE.md testing standards with literal validation
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import getDeviceAppPathProj from '../get_device_app_path_proj.ts';

// Mock only child_process.spawn at the lowest level
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

class MockChildProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  pid = 12345;
}

describe('get_device_app_path_proj plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(getDeviceAppPathProj.name).toBe('get_device_app_path_proj');
    });

    it('should have correct description', () => {
      expect(getDeviceAppPathProj.description).toBe(
        "Gets the app bundle path for a physical device application (iOS, watchOS, tvOS, visionOS) using a project file. IMPORTANT: Requires projectPath and scheme. Example: get_device_app_path_proj({ projectPath: '/path/to/project.xcodeproj', scheme: 'MyScheme' })",
      );
    });

    it('should have handler function', () => {
      expect(typeof getDeviceAppPathProj.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Test required fields
      expect(
        getDeviceAppPathProj.schema.projectPath.safeParse('/path/to/project.xcodeproj').success,
      ).toBe(true);
      expect(getDeviceAppPathProj.schema.scheme.safeParse('MyScheme').success).toBe(true);

      // Test optional fields
      expect(getDeviceAppPathProj.schema.configuration.safeParse('Debug').success).toBe(true);
      expect(getDeviceAppPathProj.schema.platform.safeParse('iOS').success).toBe(true);
      expect(getDeviceAppPathProj.schema.platform.safeParse('watchOS').success).toBe(true);
      expect(getDeviceAppPathProj.schema.platform.safeParse('tvOS').success).toBe(true);
      expect(getDeviceAppPathProj.schema.platform.safeParse('visionOS').success).toBe(true);

      // Test invalid inputs
      expect(getDeviceAppPathProj.schema.projectPath.safeParse(null).success).toBe(false);
      expect(getDeviceAppPathProj.schema.scheme.safeParse(null).success).toBe(false);
      expect(getDeviceAppPathProj.schema.platform.safeParse('invalidPlatform').success).toBe(false);
    });
  });

  let mockSpawn: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const childProcess = await import('child_process');
    mockSpawn = vi.mocked(childProcess.spawn);
    vi.clearAllMocks();
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return exact validation failure response for missing projectPath', async () => {
      const result = await getDeviceAppPathProj.handler({
        projectPath: null,
        scheme: 'MyScheme',
      });

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

    it('should return exact validation failure response for missing scheme', async () => {
      const result = await getDeviceAppPathProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: null,
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

    it('should generate correct xcodebuild command for iOS', async () => {
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      setTimeout(() => {
        mockProcess.stdout.emit(
          'data',
          'Build settings for scheme "MyScheme"\n\nBUILT_PRODUCTS_DIR = /path/to/build/Debug-iphoneos\nFULL_PRODUCT_NAME = MyApp.app\n',
        );
        mockProcess.emit('close', 0);
      }, 0);

      await getDeviceAppPathProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
      });

      expect(mockSpawn).toHaveBeenCalledWith(
        'sh',
        [
          '-c',
          'xcodebuild -showBuildSettings -project /path/to/project.xcodeproj -scheme MyScheme -configuration Debug -destination "generic/platform=iOS"',
        ],
        expect.any(Object),
      );
    });

    it('should generate correct xcodebuild command for watchOS', async () => {
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      setTimeout(() => {
        mockProcess.stdout.emit(
          'data',
          'Build settings for scheme "MyScheme"\n\nBUILT_PRODUCTS_DIR = /path/to/build/Debug-watchos\nFULL_PRODUCT_NAME = MyApp.app\n',
        );
        mockProcess.emit('close', 0);
      }, 0);

      await getDeviceAppPathProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        platform: 'watchOS',
      });

      expect(mockSpawn).toHaveBeenCalledWith(
        'sh',
        [
          '-c',
          'xcodebuild -showBuildSettings -project /path/to/project.xcodeproj -scheme MyScheme -configuration Debug -destination "generic/platform=watchOS"',
        ],
        expect.any(Object),
      );
    });

    it('should return exact successful app path retrieval response', async () => {
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      setTimeout(() => {
        mockProcess.stdout.emit(
          'data',
          'Build settings for scheme "MyScheme"\n\nBUILT_PRODUCTS_DIR = /path/to/build/Debug-iphoneos\nFULL_PRODUCT_NAME = MyApp.app\n',
        );
        mockProcess.emit('close', 0);
      }, 0);

      const result = await getDeviceAppPathProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
      });

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
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      setTimeout(() => {
        mockProcess.stderr.emit('data', 'xcodebuild: error: The project does not exist.');
        mockProcess.emit('close', 1);
      }, 0);

      const result = await getDeviceAppPathProj.handler({
        projectPath: '/path/to/nonexistent.xcodeproj',
        scheme: 'MyScheme',
      });

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
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Build settings without required fields');
        mockProcess.emit('close', 0);
      }, 0);

      const result = await getDeviceAppPathProj.handler({
        projectPath: '/path/to/project.xcodeproj',
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

    it('should include optional configuration parameter in command', async () => {
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      setTimeout(() => {
        mockProcess.stdout.emit(
          'data',
          'Build settings for scheme "MyScheme"\n\nBUILT_PRODUCTS_DIR = /path/to/build/Release-iphoneos\nFULL_PRODUCT_NAME = MyApp.app\n',
        );
        mockProcess.emit('close', 0);
      }, 0);

      await getDeviceAppPathProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        configuration: 'Release',
      });

      expect(mockSpawn).toHaveBeenCalledWith(
        'sh',
        [
          '-c',
          'xcodebuild -showBuildSettings -project /path/to/project.xcodeproj -scheme MyScheme -configuration Release -destination "generic/platform=iOS"',
        ],
        expect.any(Object),
      );
    });
  });
});
