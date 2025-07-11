import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import plugin from '../show_build_set_ws.ts';

// Mock only child_process.spawn at the lowest level
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

import { spawn } from 'child_process';
const mockSpawn = vi.mocked(spawn);

class MockChildProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  pid = 12345;
}

describe('show_build_set_ws plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(plugin.name).toBe('show_build_set_ws');
    });

    it('should have correct description', () => {
      expect(plugin.description).toBe(
        "Shows build settings from a workspace using xcodebuild. IMPORTANT: Requires workspacePath and scheme. Example: show_build_set_ws({ workspacePath: '/path/to/MyProject.xcworkspace', scheme: 'MyScheme' })",
      );
    });

    it('should have handler function', () => {
      expect(typeof plugin.handler).toBe('function');
    });

    it('should validate schema with valid inputs', () => {
      expect(
        plugin.schema.safeParse({
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
        }).success,
      ).toBe(true);
      expect(
        plugin.schema.safeParse({
          workspacePath: '/Users/dev/App.xcworkspace',
          scheme: 'AppScheme',
        }).success,
      ).toBe(true);
    });

    it('should validate schema with invalid inputs', () => {
      expect(plugin.schema.safeParse({}).success).toBe(false);
      expect(
        plugin.schema.safeParse({ workspacePath: '/path/to/workspace.xcworkspace' }).success,
      ).toBe(false);
      expect(plugin.schema.safeParse({ scheme: 'MyScheme' }).success).toBe(false);
      expect(plugin.schema.safeParse({ workspacePath: 123, scheme: 'MyScheme' }).success).toBe(
        false,
      );
      expect(
        plugin.schema.safeParse({ workspacePath: '/path/to/workspace.xcworkspace', scheme: 123 })
          .success,
      ).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should handle schema validation error when workspacePath is null', async () => {
      // Schema validation will throw before reaching validateRequiredParam
      await expect(plugin.handler({ workspacePath: null, scheme: 'MyScheme' })).rejects.toThrow();
    });

    it('should handle schema validation error when scheme is null', async () => {
      // Schema validation will throw before reaching validateRequiredParam
      await expect(
        plugin.handler({ workspacePath: '/path/to/MyProject.xcworkspace', scheme: null }),
      ).rejects.toThrow();
    });

    it('should return success with build settings', async () => {
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess as any);

      setTimeout(() => {
        mockProcess.stdout.emit(
          'data',
          `Build settings from command line:
    ARCHS = arm64
    BUILD_DIR = /Users/dev/Build/Products
    CONFIGURATION = Debug
    DEVELOPMENT_TEAM = ABC123DEF4
    PRODUCT_BUNDLE_IDENTIFIER = com.example.MyApp
    PRODUCT_NAME = MyApp
    SUPPORTED_PLATFORMS = iphoneos iphonesimulator`,
        );
        mockProcess.emit('close', 0);
      }, 0);

      const result = await plugin.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
      });

      expect(mockSpawn).toHaveBeenCalledWith(
        'sh',
        [
          '-c',
          'xcodebuild -showBuildSettings -workspace /path/to/MyProject.xcworkspace -scheme MyScheme',
        ],
        expect.any(Object),
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ Build settings retrieved successfully',
          },
          {
            type: 'text',
            text: `Build settings from command line:
    ARCHS = arm64
    BUILD_DIR = /Users/dev/Build/Products
    CONFIGURATION = Debug
    DEVELOPMENT_TEAM = ABC123DEF4
    PRODUCT_BUNDLE_IDENTIFIER = com.example.MyApp
    PRODUCT_NAME = MyApp
    SUPPORTED_PLATFORMS = iphoneos iphonesimulator`,
          },
          {
            type: 'text',
            text: `Next Steps:
- Build the workspace: macos_build_workspace({ workspacePath: "/path/to/MyProject.xcworkspace", scheme: "MyScheme" })
- For iOS: ios_simulator_build_by_name_workspace({ workspacePath: "/path/to/MyProject.xcworkspace", scheme: "MyScheme", simulatorName: "iPhone 16" })
- List schemes: list_schems_ws({ workspacePath: "/path/to/MyProject.xcworkspace" })`,
          },
        ],
        isError: false,
      });
    });

    it('should return error when command fails', async () => {
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess as any);

      setTimeout(() => {
        mockProcess.stderr.emit('data', 'Scheme not found');
        mockProcess.emit('close', 1);
      }, 0);

      const result = await plugin.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'InvalidScheme',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Failed to retrieve build settings: Scheme not found' }],
        isError: true,
      });
    });

    it('should handle Error objects in catch blocks', async () => {
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess as any);

      setTimeout(() => {
        mockProcess.emit('error', new Error('Command execution failed'));
      }, 0);

      const result = await plugin.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [
          { type: 'text', text: 'Error retrieving build settings: Command execution failed' },
        ],
        isError: true,
      });
    });
  });
});
