import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import plugin from '../show_build_set_proj.ts';

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

describe('show_build_set_proj plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(plugin.name).toBe('show_build_set_proj');
    });

    it('should have correct description', () => {
      expect(plugin.description).toBe(
        "Shows build settings from a project file using xcodebuild. IMPORTANT: Requires projectPath and scheme. Example: show_build_set_proj({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme' })",
      );
    });

    it('should have handler function', () => {
      expect(typeof plugin.handler).toBe('function');
    });

    it('should validate schema with valid inputs', () => {
      expect(
        plugin.schema.safeParse({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme' })
          .success,
      ).toBe(true);
      expect(
        plugin.schema.safeParse({ projectPath: '/Users/dev/App.xcodeproj', scheme: 'AppScheme' })
          .success,
      ).toBe(true);
    });

    it('should validate schema with invalid inputs', () => {
      expect(plugin.schema.safeParse({}).success).toBe(false);
      expect(plugin.schema.safeParse({ projectPath: '/path/to/project.xcodeproj' }).success).toBe(
        false,
      );
      expect(plugin.schema.safeParse({ scheme: 'MyScheme' }).success).toBe(false);
      expect(plugin.schema.safeParse({ projectPath: 123, scheme: 'MyScheme' }).success).toBe(false);
      expect(
        plugin.schema.safeParse({ projectPath: '/path/to/project.xcodeproj', scheme: 123 }).success,
      ).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should handle schema validation error when projectPath is null', async () => {
      // Schema validation will throw before reaching validateRequiredParam
      await expect(plugin.handler({ projectPath: null, scheme: 'MyScheme' })).rejects.toThrow();
    });

    it('should handle schema validation error when scheme is null', async () => {
      // Schema validation will throw before reaching validateRequiredParam
      await expect(
        plugin.handler({ projectPath: '/path/to/MyProject.xcodeproj', scheme: null }),
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
        projectPath: '/path/to/MyProject.xcodeproj',
        scheme: 'MyScheme',
      });

      expect(mockSpawn).toHaveBeenCalledWith(
        'sh',
        [
          '-c',
          'xcodebuild -showBuildSettings -project /path/to/MyProject.xcodeproj -scheme MyScheme',
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
- Build the project: macos_build_project({ projectPath: "/path/to/MyProject.xcodeproj", scheme: "MyScheme" })
- For iOS: ios_simulator_build_by_name_project({ projectPath: "/path/to/MyProject.xcodeproj", scheme: "MyScheme", simulatorName: "iPhone 16" })
- List schemes: list_schems_proj({ projectPath: "/path/to/MyProject.xcodeproj" })`,
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
        projectPath: '/path/to/MyProject.xcodeproj',
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
        projectPath: '/path/to/MyProject.xcodeproj',
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
