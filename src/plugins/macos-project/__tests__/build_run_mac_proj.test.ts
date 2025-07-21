import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../../utils/command.js';
import tool, { build_run_mac_projLogic } from '../build_run_mac_proj.ts';

describe('build_run_mac_proj', () => {
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
      // Track executor calls manually
      let callCount = 0;
      const executorCalls: any[] = [];
      const mockExecutor = (
        command: string[],
        description: string,
        logOutput: boolean,
        timeout?: number,
      ) => {
        callCount++;
        executorCalls.push({ command, description, logOutput, timeout });

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
      };

      // Mock execAsync for launching app
      const execAsyncCalls: string[] = [];
      const mockExecAsync = (cmd: string) => {
        execAsyncCalls.push(cmd);
        return Promise.resolve('');
      };

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
        configuration: 'Debug',
        preferXcodebuild: false,
      };

      const result = await build_run_mac_projLogic(args, mockExecutor, mockExecAsync);

      // Verify build command was called
      expect(executorCalls[0]).toEqual({
        command: [
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
        description: 'macOS Build',
        logOutput: true,
        timeout: undefined,
      });

      // Verify build settings command was called
      expect(executorCalls[1]).toEqual({
        command: [
          'xcodebuild',
          '-showBuildSettings',
          '-project',
          '/path/to/project.xcodeproj',
          '-scheme',
          'MyApp',
          '-configuration',
          'Debug',
        ],
        description: 'Get Build Settings for Launch',
        logOutput: true,
        timeout: undefined,
      });

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
        configuration: 'Debug',
        preferXcodebuild: false,
      };

      const result = await build_run_mac_projLogic(args, mockExecutor);

      expect(result).toEqual({
        content: [
          { type: 'text', text: '❌ [stderr] error: Build failed' },
          { type: 'text', text: '❌ macOS Build build failed for scheme MyApp.' },
        ],
        isError: true,
      });
    });

    it('should handle build settings failure', async () => {
      // Track executor calls manually
      let callCount = 0;
      const mockExecutor = (
        command: string[],
        description: string,
        logOutput: boolean,
        timeout?: number,
      ) => {
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
      };

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
        configuration: 'Debug',
        preferXcodebuild: false,
      };

      const result = await build_run_mac_projLogic(args, mockExecutor);

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
      // Track executor calls manually
      let callCount = 0;
      const mockExecutor = (
        command: string[],
        description: string,
        logOutput: boolean,
        timeout?: number,
      ) => {
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
      };

      // Mock execAsync for launching app to fail
      const mockExecAsync = (cmd: string) => {
        return Promise.reject(new Error('Failed to launch'));
      };

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
        configuration: 'Debug',
        preferXcodebuild: false,
      };

      const result = await build_run_mac_projLogic(args, mockExecutor, mockExecAsync);

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
      const mockExecutor = (
        command: string[],
        description: string,
        logOutput: boolean,
        timeout?: number,
      ) => {
        return Promise.reject(new Error('spawn xcodebuild ENOENT'));
      };

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
        configuration: 'Debug',
        preferXcodebuild: false,
      };

      const result = await build_run_mac_projLogic(args, mockExecutor);

      expect(result).toEqual({
        content: [
          { type: 'text', text: 'Error during macOS Build build: spawn xcodebuild ENOENT' },
        ],
        isError: true,
      });
    });

    it('should use default configuration when not provided', async () => {
      // Track executor calls manually
      let callCount = 0;
      const executorCalls: any[] = [];
      const mockExecutor = (
        command: string[],
        description: string,
        logOutput: boolean,
        timeout?: number,
      ) => {
        callCount++;
        executorCalls.push({ command, description, logOutput, timeout });

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
      };

      // Mock execAsync for launching app
      const mockExecAsync = (cmd: string) => {
        return Promise.resolve('');
      };

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
        configuration: 'Debug',
        preferXcodebuild: false,
      };

      await build_run_mac_projLogic(args, mockExecutor, mockExecAsync);

      expect(executorCalls[0]).toEqual({
        command: [
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
        description: 'macOS Build',
        logOutput: true,
        timeout: undefined,
      });
    });
  });
});
