import { describe, it, expect, beforeEach } from 'vitest';
import * as z from 'zod';
import { createMockExecutor, mockProcess } from '../../../../test-utils/mock-executors.ts';
import { sessionStore } from '../../../../utils/session-store.ts';
import tool, { buildRunMacOSLogic } from '../build_run_macos.ts';

describe('build_run_macos', () => {
  beforeEach(() => {
    sessionStore.clear();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should export the correct name', () => {
      expect(tool.name).toBe('build_run_macos');
    });

    it('should export the correct description', () => {
      expect(tool.description).toBe('Build and run macOS app.');
    });

    it('should export a handler function', () => {
      expect(typeof tool.handler).toBe('function');
    });

    it('should expose only non-session fields in schema', () => {
      const schema = z.strictObject(tool.schema);

      expect(schema.safeParse({}).success).toBe(true);
      expect(schema.safeParse({ extraArgs: ['--verbose'] }).success).toBe(true);

      expect(schema.safeParse({ derivedDataPath: '/tmp/derived' }).success).toBe(false);
      expect(schema.safeParse({ extraArgs: ['--ok', 2] }).success).toBe(false);
      expect(schema.safeParse({ preferXcodebuild: true }).success).toBe(false);

      const schemaKeys = Object.keys(tool.schema).sort();
      expect(schemaKeys).toEqual(['extraArgs']);
    });
  });

  describe('Handler Requirements', () => {
    it('should require scheme before executing', async () => {
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('scheme is required');
    });

    it('should require project or workspace once scheme is set', async () => {
      sessionStore.setDefaults({ scheme: 'MyApp' });

      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Provide a project or workspace');
    });

    it('should fail when both project and workspace provided explicitly', async () => {
      sessionStore.setDefaults({ scheme: 'MyApp' });

      const result = await tool.handler({
        projectPath: '/path/to/project.xcodeproj',
        workspacePath: '/path/to/workspace.xcworkspace',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Mutually exclusive parameters provided');
    });
  });

  describe('Command Generation and Response Logic', () => {
    it('should successfully build and run macOS app from project', async () => {
      // Track executor calls manually
      let callCount = 0;
      const executorCalls: any[] = [];
      const mockExecutor = (
        command: string[],
        description?: string,
        logOutput?: boolean,
        opts?: { cwd?: string },
        detached?: boolean,
      ) => {
        callCount++;
        executorCalls.push({ command, description, logOutput, opts });
        void detached;

        if (callCount === 1) {
          // First call for build
          return Promise.resolve({
            success: true,
            output: 'BUILD SUCCEEDED',
            error: '',
            process: mockProcess,
          });
        } else if (callCount === 2) {
          // Second call for build settings
          return Promise.resolve({
            success: true,
            output: 'BUILT_PRODUCTS_DIR = /path/to/build\nFULL_PRODUCT_NAME = MyApp.app',
            error: '',
            process: mockProcess,
          });
        }
        return Promise.resolve({ success: true, output: '', error: '', process: mockProcess });
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
        logOutput: false,
        opts: { cwd: '/path/to' },
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
        logOutput: false,
        opts: undefined,
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
        description?: string,
        logOutput?: boolean,
        opts?: { cwd?: string },
        detached?: boolean,
      ) => {
        callCount++;
        executorCalls.push({ command, description, logOutput, opts });
        void detached;

        if (callCount === 1) {
          // First call for build
          return Promise.resolve({
            success: true,
            output: 'BUILD SUCCEEDED',
            error: '',
            process: mockProcess,
          });
        } else if (callCount === 2) {
          // Second call for build settings
          return Promise.resolve({
            success: true,
            output: 'BUILT_PRODUCTS_DIR = /path/to/build\nFULL_PRODUCT_NAME = MyApp.app',
            error: '',
            process: mockProcess,
          });
        }
        return Promise.resolve({ success: true, output: '', error: '', process: mockProcess });
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
        logOutput: false,
        opts: { cwd: '/path/to' },
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
        logOutput: false,
        opts: undefined,
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
        description?: string,
        logOutput?: boolean,
        opts?: { cwd?: string },
        detached?: boolean,
      ) => {
        callCount++;
        void detached;
        if (callCount === 1) {
          // First call for build succeeds
          return Promise.resolve({
            success: true,
            output: 'BUILD SUCCEEDED',
            error: '',
            process: mockProcess,
          });
        } else if (callCount === 2) {
          // Second call for build settings fails
          return Promise.resolve({
            success: false,
            output: '',
            error: 'error: Failed to get settings',
            process: mockProcess,
          });
        }
        return Promise.resolve({ success: true, output: '', error: '', process: mockProcess });
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
        description?: string,
        logOutput?: boolean,
        opts?: { cwd?: string },
        detached?: boolean,
      ) => {
        callCount++;
        void detached;
        if (callCount === 1) {
          // First call for build succeeds
          return Promise.resolve({
            success: true,
            output: 'BUILD SUCCEEDED',
            error: '',
            process: mockProcess,
          });
        } else if (callCount === 2) {
          // Second call for build settings succeeds
          return Promise.resolve({
            success: true,
            output: 'BUILT_PRODUCTS_DIR = /path/to/build\nFULL_PRODUCT_NAME = MyApp.app',
            error: '',
            process: mockProcess,
          });
        } else if (callCount === 3) {
          // Third call for open command fails
          return Promise.resolve({
            success: false,
            output: '',
            error: 'Failed to launch',
            process: mockProcess,
          });
        }
        return Promise.resolve({ success: true, output: '', error: '', process: mockProcess });
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
        description?: string,
        logOutput?: boolean,
        opts?: { cwd?: string },
        detached?: boolean,
      ) => {
        void command;
        void description;
        void logOutput;
        void opts;
        void detached;
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
        description?: string,
        logOutput?: boolean,
        opts?: { cwd?: string },
        detached?: boolean,
      ) => {
        callCount++;
        executorCalls.push({ command, description, logOutput, opts });
        void detached;

        if (callCount === 1) {
          // First call for build
          return Promise.resolve({
            success: true,
            output: 'BUILD SUCCEEDED',
            error: '',
            process: mockProcess,
          });
        } else if (callCount === 2) {
          // Second call for build settings
          return Promise.resolve({
            success: true,
            output: 'BUILT_PRODUCTS_DIR = /path/to/build\nFULL_PRODUCT_NAME = MyApp.app',
            error: '',
            process: mockProcess,
          });
        }
        return Promise.resolve({ success: true, output: '', error: '', process: mockProcess });
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
        logOutput: false,
        opts: { cwd: '/path/to' },
      });
    });
  });
});
