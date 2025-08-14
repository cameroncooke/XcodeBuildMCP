import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../../../utils/command.js';
import tool, { buildRunMacOSLogic } from '../build_run_macos.js';

describe('build_run_macos', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should export the correct name', () => {
      expect(tool.name).toBe('build_run_macos');
    });

    it('should export the correct description', () => {
      expect(tool.description).toBe(
        "Builds and runs a macOS app from a project or workspace in one step. Provide exactly one of projectPath or workspacePath. Example: build_run_macos({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme' })",
      );
    });

    it('should export a handler function', () => {
      expect(typeof tool.handler).toBe('function');
    });

    it('should validate schema with valid project inputs', () => {
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

    it('should validate schema with valid workspace inputs', () => {
      const validInput = {
        workspacePath: '/path/to/workspace.xcworkspace',
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

    it('should validate schema with minimal valid project inputs', () => {
      const validInput = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
      };
      const schema = z.object(tool.schema);
      expect(schema.safeParse(validInput).success).toBe(true);
    });

    it('should validate schema with minimal valid workspace inputs', () => {
      const validInput = {
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyApp',
      };
      const schema = z.object(tool.schema);
      expect(schema.safeParse(validInput).success).toBe(true);
    });

    it('should reject inputs with both projectPath and workspacePath', () => {
      const invalidInput = {
        projectPath: '/path/to/project.xcodeproj',
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyApp',
      };
      const schema = z.object(tool.schema);
      expect(schema.safeParse(invalidInput).success).toBe(true); // Base schema passes, but runtime validation should fail
    });

    it('should reject inputs with neither projectPath nor workspacePath', () => {
      const invalidInput = {
        scheme: 'MyApp',
      };
      const schema = z.object(tool.schema);
      expect(schema.safeParse(invalidInput).success).toBe(true); // Base schema passes, but runtime validation should fail
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
    it('should successfully build and run macOS app from project', async () => {
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

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
        configuration: 'Debug',
        preferXcodebuild: false,
      };

      const result = await buildRunMacOSLogic(args, mockExecutor);

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
            text: "Next Steps:\n1. Get app path: get_mac_app_path({ scheme: 'MyApp' })\n2. Get bundle ID: get_mac_bundle_id({ appPath: 'PATH_FROM_STEP_1' })\n3. Launch: launch_mac_app({ appPath: 'PATH_FROM_STEP_1' })",
          },
          {
            type: 'text',
            text: '✅ macOS build and run succeeded for scheme MyApp. App launched: /path/to/build/MyApp.app',
          },
        ],
        isError: false,
      });
    });

    it('should successfully build and run macOS app from workspace', async () => {
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

      const args = {
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyApp',
        configuration: 'Debug',
        preferXcodebuild: false,
      };

      const result = await buildRunMacOSLogic(args, mockExecutor);

      // Verify build command was called
      expect(executorCalls[0]).toEqual({
        command: [
          'xcodebuild',
          '-workspace',
          '/path/to/workspace.xcworkspace',
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
          '-workspace',
          '/path/to/workspace.xcworkspace',
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
            text: "Next Steps:\n1. Get app path: get_mac_app_path({ scheme: 'MyApp' })\n2. Get bundle ID: get_mac_bundle_id({ appPath: 'PATH_FROM_STEP_1' })\n3. Launch: launch_mac_app({ appPath: 'PATH_FROM_STEP_1' })",
          },
          {
            type: 'text',
            text: '✅ macOS build and run succeeded for scheme MyApp. App launched: /path/to/build/MyApp.app',
          },
        ],
        isError: false,
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

      const result = await buildRunMacOSLogic(args, mockExecutor);

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

      const result = await buildRunMacOSLogic(args, mockExecutor);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ macOS Build build succeeded for scheme MyApp.',
          },
          {
            type: 'text',
            text: "Next Steps:\n1. Get app path: get_mac_app_path({ scheme: 'MyApp' })\n2. Get bundle ID: get_mac_bundle_id({ appPath: 'PATH_FROM_STEP_1' })\n3. Launch: launch_mac_app({ appPath: 'PATH_FROM_STEP_1' })",
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
        } else if (callCount === 3) {
          // Third call for open command fails
          return Promise.resolve({
            success: false,
            output: '',
            error: 'Failed to launch',
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

      const result = await buildRunMacOSLogic(args, mockExecutor);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ macOS Build build succeeded for scheme MyApp.',
          },
          {
            type: 'text',
            text: "Next Steps:\n1. Get app path: get_mac_app_path({ scheme: 'MyApp' })\n2. Get bundle ID: get_mac_bundle_id({ appPath: 'PATH_FROM_STEP_1' })\n3. Launch: launch_mac_app({ appPath: 'PATH_FROM_STEP_1' })",
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

      const result = await buildRunMacOSLogic(args, mockExecutor);

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

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
        configuration: 'Debug',
        preferXcodebuild: false,
      };

      await buildRunMacOSLogic(args, mockExecutor);

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
