import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';
import { EventEmitter } from 'events';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import tool from '../build_run_mac_proj.ts';

// Mock child_process at the lowest level
vi.mock('child_process', () => ({
  spawn: vi.fn(),
  exec: vi.fn(),
}));

// Mock util module
vi.mock('util', () => ({
  promisify: vi.fn(),
}));

class MockChildProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  pid = 12345;
}

describe('build_run_mac_proj', () => {
  let mockProcess: MockChildProcess;
  let mockExec: Record<string, unknown>;
  let mockPromisify: Record<string, unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockProcess = new MockChildProcess();

    vi.mocked(spawn).mockReturnValue(mockProcess);
    mockExec = vi.mocked(exec);
    mockPromisify = vi.mocked(promisify);

    // Mock promisify to return a function that resolves
    mockPromisify.mockReturnValue(vi.fn().mockResolvedValue({}));
  });

  describe('Export Field Validation (Literal)', () => {
    it('should export the correct name', () => {
      expect(tool.name).toBe('build_run_mac_proj');
    });

    it('should export the correct description', () => {
      expect(tool.description).toBe('Builds and runs a macOS app from a project file in one step.');
    });

    it('should export a handler function', () => {
      expect(typeof tool.handler).toBe('function');
    });

    it('should validate schema with valid inputs', () => {
      const validInput = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
        configuration: 'Debug',
        derivedDataPath: '/path/to/derived',
        arch: 'arm64',
        extraArgs: ['--verbose'],
        preferXcodebuild: true,
      };
      const schema = z.object(tool.schema);
      expect(schema.safeParse(validInput).success).toBe(true);
    });

    it('should validate schema with minimal valid inputs', () => {
      const validInput = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
      };
      const schema = z.object(tool.schema);
      expect(schema.safeParse(validInput).success).toBe(true);
    });

    it('should reject invalid projectPath', () => {
      const invalidInput = {
        projectPath: 123,
        scheme: 'MyApp',
      };
      const schema = z.object(tool.schema);
      expect(schema.safeParse(invalidInput).success).toBe(false);
    });

    it('should reject invalid scheme', () => {
      const invalidInput = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 123,
      };
      const schema = z.object(tool.schema);
      expect(schema.safeParse(invalidInput).success).toBe(false);
    });

    it('should reject invalid arch', () => {
      const invalidInput = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
        arch: 'invalid',
      };
      const schema = z.object(tool.schema);
      expect(schema.safeParse(invalidInput).success).toBe(false);
    });
  });

  describe('Command Generation and Response Logic', () => {
    it('should successfully build and run macOS app', async () => {
      const mockExecAsync = mockPromisify.mockReturnValue(vi.fn().mockResolvedValue({}));

      // Mock successful build
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'BUILD SUCCEEDED');
        mockProcess.emit('close', 0);
      }, 0);

      // Mock successful build settings retrieval on second spawn call
      let callCount = 0;
      vi.mocked(spawn).mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          // Second call for build settings
          const mockBuildSettingsProcess = new MockChildProcess();
          setTimeout(() => {
            mockBuildSettingsProcess.stdout.emit(
              'data',
              'BUILT_PRODUCTS_DIR = /path/to/build\nFULL_PRODUCT_NAME = MyApp.app',
            );
            mockBuildSettingsProcess.emit('close', 0);
          }, 0);
          return mockBuildSettingsProcess;
        }
        return mockProcess;
      });

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
      };

      const result = await tool.handler(args);

      // Verify build command was called
      expect(spawn).toHaveBeenCalledWith(
        'sh',
        [
          '-c',
          'xcodebuild -project /path/to/project.xcodeproj -scheme MyApp -configuration Debug -skipMacroValidation -destination "platform=macOS" build',
        ],
        expect.any(Object),
      );

      // Verify build settings command was called
      expect(spawn).toHaveBeenCalledWith(
        'sh',
        [
          '-c',
          'xcodebuild -showBuildSettings -project /path/to/project.xcodeproj -scheme MyApp -configuration Debug',
        ],
        expect.any(Object),
      );

      // Verify app launch command was called
      expect(mockExecAsync).toHaveBeenCalledWith('open "/path/to/build/MyApp.app"');

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ macOS build and run succeeded for scheme MyApp. App launched: /path/to/build/MyApp.app',
          },
        ],
      });
    });

    it('should handle build failure', async () => {
      setTimeout(() => {
        mockProcess.stderr.emit('data', 'error: Build failed\n');
        mockProcess.emit('close', 1);
      }, 0);

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
      };

      const result = await tool.handler(args);

      expect(result).toEqual({
        content: [
          { type: 'text', text: '❌ [stderr] error: Build failed' },
          { type: 'text', text: '❌ macOS Build build failed for scheme MyApp.' },
        ],
        isError: true,
      });
    });

    it('should handle build settings failure', async () => {
      // Mock successful build
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'BUILD SUCCEEDED');
        mockProcess.emit('close', 0);
      }, 0);

      // Mock failed build settings retrieval
      let callCount = 0;
      vi.mocked(spawn).mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          // Second call for build settings fails
          const mockBuildSettingsProcess = new MockChildProcess();
          setTimeout(() => {
            mockBuildSettingsProcess.stderr.emit('data', 'error: Failed to get settings');
            mockBuildSettingsProcess.emit('close', 1);
          }, 0);
          return mockBuildSettingsProcess;
        }
        return mockProcess;
      });

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
      };

      const result = await tool.handler(args);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ Build succeeded, but failed to get app path to launch: error: Failed to get settings',
          },
        ],
      });
    });

    it('should handle app launch failure', async () => {
      const mockExecAsync = mockPromisify.mockReturnValue(
        vi.fn().mockRejectedValue(new Error('Failed to launch')),
      );

      // Mock successful build
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'BUILD SUCCEEDED');
        mockProcess.emit('close', 0);
      }, 0);

      // Mock successful build settings retrieval
      let callCount = 0;
      vi.mocked(spawn).mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          // Second call for build settings
          const mockBuildSettingsProcess = new MockChildProcess();
          setTimeout(() => {
            mockBuildSettingsProcess.stdout.emit(
              'data',
              'BUILT_PRODUCTS_DIR = /path/to/build\nFULL_PRODUCT_NAME = MyApp.app',
            );
            mockBuildSettingsProcess.emit('close', 0);
          }, 0);
          return mockBuildSettingsProcess;
        }
        return mockProcess;
      });

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
      };

      const result = await tool.handler(args);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ Build succeeded, but failed to launch app /path/to/build/MyApp.app. Error: Failed to launch',
          },
        ],
      });
    });

    it('should handle spawn error', async () => {
      setTimeout(() => {
        mockProcess.emit('error', new Error('spawn xcodebuild ENOENT'));
      }, 0);

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
      };

      const result = await tool.handler(args);

      expect(result).toEqual({
        content: [
          { type: 'text', text: 'Error during macOS Build build: spawn xcodebuild ENOENT' },
        ],
        isError: true,
      });
    });

    it('should use default configuration when not provided', async () => {
      const mockExecAsync = mockPromisify.mockReturnValue(vi.fn().mockResolvedValue({}));

      // Mock successful build
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'BUILD SUCCEEDED');
        mockProcess.emit('close', 0);
      }, 0);

      // Mock successful build settings retrieval
      let callCount = 0;
      vi.mocked(spawn).mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          const mockBuildSettingsProcess = new MockChildProcess();
          setTimeout(() => {
            mockBuildSettingsProcess.stdout.emit(
              'data',
              'BUILT_PRODUCTS_DIR = /path/to/build\nFULL_PRODUCT_NAME = MyApp.app',
            );
            mockBuildSettingsProcess.emit('close', 0);
          }, 0);
          return mockBuildSettingsProcess;
        }
        return mockProcess;
      });

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
      };

      await tool.handler(args);

      expect(spawn).toHaveBeenCalledWith(
        'sh',
        [
          '-c',
          'xcodebuild -project /path/to/project.xcodeproj -scheme MyApp -configuration Debug -skipMacroValidation -destination "platform=macOS" build',
        ],
        expect.any(Object),
      );
    });
  });
});
