import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../../utils/command.js';
import { exec } from 'child_process';
import { promisify } from 'util';

// Mock child_process and util at module level
vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

vi.mock('util', () => ({
  promisify: vi.fn(),
}));

import tool from '../build_run_mac_proj.ts';

describe('build_run_mac_proj', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      // Mock successful build first, then successful build settings
      let callCount = 0;
      const mockExecutor = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call for build
          return Promise.resolve({
            success: true,
            output: 'BUILD SUCCEEDED',
            error: '',
          });
        } else if (callCount === 2) {
          // Second call for build settings
          return Promise.resolve({
            success: true,
            output: 'BUILT_PRODUCTS_DIR = /path/to/build\nFULL_PRODUCT_NAME = MyApp.app',
            error: '',
          });
        }
        return Promise.resolve({ success: true, output: '', error: '' });
      });

      // Mock exec for launching app
      const mockExecAsync = vi.fn().mockResolvedValue('');
      vi.mocked(promisify).mockReturnValue(mockExecAsync);

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
      };

      const result = await tool.handler(args, mockExecutor);

      // Verify build command was called
      expect(mockExecutor).toHaveBeenCalledWith(
        [
          'xcodebuild',
          '-project',
          '/path/to/project.xcodeproj',
          '-scheme',
          'MyApp',
          '-configuration',
          'Debug',
          '-skipMacroValidation',
          '-destination',
          'platform=macOS',
          'build',
        ],
        'macOS Build',
        true,
        undefined,
      );

      // Verify build settings command was called
      expect(mockExecutor).toHaveBeenCalledWith(
        [
          'xcodebuild',
          '-showBuildSettings',
          '-project',
          '/path/to/project.xcodeproj',
          '-scheme',
          'MyApp',
          '-configuration',
          'Debug',
        ],
        'Get Build Settings for Launch',
        true,
        undefined,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ macOS Build build succeeded for scheme MyApp.',
          },
          {
            type: 'text',
            text: 'Next Steps:\n1. Get App Path: get_macos_app_path_project\n2. Get Bundle ID: get_macos_bundle_id\n3. Launch App: launch_macos_app',
          },
          {
            type: 'text',
            text: '✅ macOS build and run succeeded for scheme MyApp. App launched: /path/to/build/MyApp.app',
          },
        ],
      });
    });

    it('should handle build failure', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'error: Build failed',
      });

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
      };

      const result = await tool.handler(args, mockExecutor);

      expect(result).toEqual({
        content: [
          { type: 'text', text: '❌ [stderr] error: Build failed' },
          { type: 'text', text: '❌ macOS Build build failed for scheme MyApp.' },
        ],
        isError: true,
      });
    });

    it('should handle build settings failure', async () => {
      // Mock successful build first, then failed build settings
      let callCount = 0;
      const mockExecutor = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call for build succeeds
          return Promise.resolve({
            success: true,
            output: 'BUILD SUCCEEDED',
            error: '',
          });
        } else if (callCount === 2) {
          // Second call for build settings fails
          return Promise.resolve({
            success: false,
            output: '',
            error: 'error: Failed to get settings',
          });
        }
        return Promise.resolve({ success: true, output: '', error: '' });
      });

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
      };

      const result = await tool.handler(args, mockExecutor);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ macOS Build build succeeded for scheme MyApp.',
          },
          {
            type: 'text',
            text: 'Next Steps:\n1. Get App Path: get_macos_app_path_project\n2. Get Bundle ID: get_macos_bundle_id\n3. Launch App: launch_macos_app',
          },
          {
            type: 'text',
            text: '✅ Build succeeded, but failed to get app path to launch: error: Failed to get settings',
          },
        ],
        isError: false,
      });
    });

    it('should handle app launch failure', async () => {
      // Mock successful build and build settings
      let callCount = 0;
      const mockExecutor = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call for build succeeds
          return Promise.resolve({
            success: true,
            output: 'BUILD SUCCEEDED',
            error: '',
          });
        } else if (callCount === 2) {
          // Second call for build settings succeeds
          return Promise.resolve({
            success: true,
            output: 'BUILT_PRODUCTS_DIR = /path/to/build\nFULL_PRODUCT_NAME = MyApp.app',
            error: '',
          });
        }
        return Promise.resolve({ success: true, output: '', error: '' });
      });

      // Mock exec for launching app to fail
      const mockExecAsync = vi.fn().mockRejectedValue(new Error('Failed to launch'));
      vi.mocked(promisify).mockReturnValue(mockExecAsync);

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
      };

      const result = await tool.handler(args, mockExecutor);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ macOS Build build succeeded for scheme MyApp.',
          },
          {
            type: 'text',
            text: 'Next Steps:\n1. Get App Path: get_macos_app_path_project\n2. Get Bundle ID: get_macos_bundle_id\n3. Launch App: launch_macos_app',
          },
          {
            type: 'text',
            text: '✅ Build succeeded, but failed to launch app /path/to/build/MyApp.app. Error: Failed to launch',
          },
        ],
        isError: false,
      });
    });

    it('should handle spawn error', async () => {
      const mockExecutor = vi.fn().mockRejectedValue(new Error('spawn xcodebuild ENOENT'));

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
      };

      const result = await tool.handler(args, mockExecutor);

      expect(result).toEqual({
        content: [
          { type: 'text', text: 'Error during macOS Build build: spawn xcodebuild ENOENT' },
        ],
        isError: true,
      });
    });

    it('should use default configuration when not provided', async () => {
      // Mock successful build first, then successful build settings
      let callCount = 0;
      const mockExecutor = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call for build
          return Promise.resolve({
            success: true,
            output: 'BUILD SUCCEEDED',
            error: '',
          });
        } else if (callCount === 2) {
          // Second call for build settings
          return Promise.resolve({
            success: true,
            output: 'BUILT_PRODUCTS_DIR = /path/to/build\nFULL_PRODUCT_NAME = MyApp.app',
            error: '',
          });
        }
        return Promise.resolve({ success: true, output: '', error: '' });
      });

      // Mock exec for launching app
      const mockExecAsync = vi.fn().mockResolvedValue('');
      vi.mocked(promisify).mockReturnValue(mockExecAsync);

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
      };

      await tool.handler(args, mockExecutor);

      expect(mockExecutor).toHaveBeenCalledWith(
        [
          'xcodebuild',
          '-project',
          '/path/to/project.xcodeproj',
          '-scheme',
          'MyApp',
          '-configuration',
          'Debug',
          '-skipMacroValidation',
          '-destination',
          'platform=macOS',
          'build',
        ],
        'macOS Build',
        true,
        undefined,
      );
    });
  });
});
