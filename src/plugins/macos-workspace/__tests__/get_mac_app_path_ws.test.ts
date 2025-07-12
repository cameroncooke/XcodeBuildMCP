/**
 * Tests for get_mac_app_path_ws plugin
 * Following CLAUDE.md testing standards with literal validation
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import { z } from 'zod';
import getMacAppPathWs from '../get_mac_app_path_ws.ts';

// Mock only child_process.spawn at the lowest level
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

class MockChildProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  pid = 12345;
}

describe('get_mac_app_path_ws plugin', () => {
  let mockSpawn: Record<string, unknown>;

  beforeEach(async () => {
    const { spawn } = await import('child_process');
    mockSpawn = vi.mocked(spawn);
    vi.clearAllMocks();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(getMacAppPathWs.name).toBe('get_mac_app_path_ws');
    });

    it('should have correct description', () => {
      expect(getMacAppPathWs.description).toBe(
        "Gets the app bundle path for a macOS application using a workspace. IMPORTANT: Requires workspacePath and scheme. Example: get_mac_app_path_ws({ workspacePath: '/path/to/workspace', scheme: 'MyScheme' })",
      );
    });

    it('should have handler function', () => {
      expect(typeof getMacAppPathWs.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Test required fields
      expect(
        getMacAppPathWs.schema.workspacePath.safeParse('/path/to/MyProject.xcworkspace').success,
      ).toBe(true);
      expect(getMacAppPathWs.schema.scheme.safeParse('MyScheme').success).toBe(true);

      // Test optional fields
      expect(getMacAppPathWs.schema.configuration.safeParse('Debug').success).toBe(true);
      expect(getMacAppPathWs.schema.arch.safeParse('arm64').success).toBe(true);
      expect(getMacAppPathWs.schema.arch.safeParse('x86_64').success).toBe(true);

      // Test invalid inputs
      expect(getMacAppPathWs.schema.workspacePath.safeParse(null).success).toBe(false);
      expect(getMacAppPathWs.schema.scheme.safeParse(null).success).toBe(false);
      expect(getMacAppPathWs.schema.arch.safeParse('invalidArch').success).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return exact successful app path response', async () => {
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      // Simulate successful xcodebuild output
      setTimeout(() => {
        mockProcess.stdout.emit(
          'data',
          `
BUILT_PRODUCTS_DIR = /Users/test/Library/Developer/Xcode/DerivedData/MyApp-abc123/Build/Products/Debug
FULL_PRODUCT_NAME = MyApp.app
        `,
        );
        mockProcess.emit('close', 0);
      }, 0);

      const result = await getMacAppPathWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
      });

      expect(mockSpawn).toHaveBeenCalledWith(
        'sh',
        [
          '-c',
          'xcodebuild -showBuildSettings -workspace /path/to/MyProject.xcworkspace -scheme MyScheme -configuration Debug',
        ],
        expect.any(Object),
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ App path retrieved successfully: /Users/test/Library/Developer/Xcode/DerivedData/MyApp-abc123/Build/Products/Debug/MyApp.app',
          },
          {
            type: 'text',
            text: 'Next Steps:\n1. Get bundle ID: get_app_bundle_id({ appPath: "/Users/test/Library/Developer/Xcode/DerivedData/MyApp-abc123/Build/Products/Debug/MyApp.app" })\n2. Launch app: launch_mac_app({ appPath: "/Users/test/Library/Developer/Xcode/DerivedData/MyApp-abc123/Build/Products/Debug/MyApp.app" })',
          },
        ],
      });
    });

    it('should return exact build settings failure response', async () => {
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      // Simulate xcodebuild failure
      setTimeout(() => {
        mockProcess.stderr.emit('data', 'error: No such scheme');
        mockProcess.emit('close', 1);
      }, 0);

      const result = await getMacAppPathWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error retrieving app path: error: No such scheme',
          },
        ],
        isError: true,
      });
    });

    it('should return exact missing build settings response', async () => {
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      // Simulate output without required build settings
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'OTHER_SETTING = value');
        mockProcess.emit('close', 0);
      }, 0);

      const result = await getMacAppPathWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error retrieving app path: Could not extract app path from build settings',
          },
        ],
        isError: true,
      });
    });

    it('should return exact exception handling response', async () => {
      mockSpawn.mockImplementation(() => {
        throw new Error('Network error');
      });

      const result = await getMacAppPathWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
      });

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
  });
});
