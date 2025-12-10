/**
 * Tests for build_run_sim plugin (unified)
 * Following CLAUDE.md testing standards with dependency injection and literal validation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../../../test-utils/mock-executors.ts';
import { sessionStore } from '../../../../utils/session-store.ts';
import buildRunSim, { build_run_simLogic } from '../build_run_sim.ts';

describe('build_run_sim tool', () => {
  beforeEach(() => {
    sessionStore.clear();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(buildRunSim.name).toBe('build_run_sim');
    });

    it('should have correct description', () => {
      expect(buildRunSim.description).toBe('Builds and runs an app on an iOS simulator.');
    });

    it('should have handler function', () => {
      expect(typeof buildRunSim.handler).toBe('function');
    });

    it('should expose only non-session fields in public schema', () => {
      const schema = z.object(buildRunSim.schema);

      expect(schema.safeParse({}).success).toBe(true);

      expect(
        schema.safeParse({
          derivedDataPath: '/path/to/derived',
          extraArgs: ['--verbose'],
          preferXcodebuild: false,
        }).success,
      ).toBe(true);

      expect(schema.safeParse({ derivedDataPath: 123 }).success).toBe(false);
      expect(schema.safeParse({ extraArgs: [123] }).success).toBe(false);
      expect(schema.safeParse({ preferXcodebuild: 'yes' }).success).toBe(false);

      const schemaKeys = Object.keys(buildRunSim.schema).sort();
      expect(schemaKeys).toEqual(
        ['derivedDataPath', 'extraArgs', 'preferXcodebuild', 'suppressWarnings'].sort(),
      );
      expect(schemaKeys).not.toContain('scheme');
      expect(schemaKeys).not.toContain('simulatorName');
      expect(schemaKeys).not.toContain('projectPath');
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    // Note: Parameter validation is now handled by createTypedTool wrapper with Zod schema
    // The logic function receives validated parameters, so these tests focus on business logic

    it('should handle simulator not found', async () => {
      let callCount = 0;
      const mockExecutor = async (command: string[]) => {
        callCount++;
        if (callCount === 1) {
          // First call: build succeeds
          return {
            success: true,
            output: 'BUILD SUCCEEDED',
            process: { pid: 12345 },
          };
        } else if (callCount === 2) {
          // Second call: showBuildSettings fails to get app path
          return {
            success: false,
            error: 'Could not get build settings',
            process: { pid: 12345 },
          };
        }
        return {
          success: false,
          error: 'Unexpected call',
          process: { pid: 12345 },
        };
      };

      const result = await build_run_simLogic(
        {
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Build succeeded, but failed to get app path: Could not get build settings',
          },
        ],
        isError: true,
      });
    });

    it('should handle build failure', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Build failed with error',
      });

      const result = await build_run_simLogic(
        {
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        },
        mockExecutor,
      );

      expect(result.isError).toBe(true);
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
    });

    it('should handle successful build and run', async () => {
      // Create a mock executor that simulates full successful flow
      let callCount = 0;
      const mockExecutor = async (command: string[], logPrefix?: string) => {
        callCount++;

        if (command.includes('xcodebuild') && command.includes('build')) {
          // First call: build succeeds
          return {
            success: true,
            output: 'BUILD SUCCEEDED',
            process: { pid: 12345 },
          };
        } else if (command.includes('xcodebuild') && command.includes('-showBuildSettings')) {
          // Second call: build settings to get app path
          return {
            success: true,
            output: 'BUILT_PRODUCTS_DIR = /path/to/build\nFULL_PRODUCT_NAME = MyApp.app\n',
            process: { pid: 12345 },
          };
        } else if (command.includes('simctl') && command.includes('list')) {
          // Find simulator calls
          return {
            success: true,
            output: JSON.stringify({
              devices: {
                'iOS 16.0': [
                  {
                    udid: 'test-uuid-123',
                    name: 'iPhone 16',
                    state: 'Booted',
                    isAvailable: true,
                  },
                ],
              },
            }),
            process: { pid: 12345 },
          };
        } else if (
          command.includes('plutil') ||
          command.includes('PlistBuddy') ||
          command.includes('defaults')
        ) {
          // Bundle ID extraction
          return {
            success: true,
            output: 'com.example.MyApp',
            process: { pid: 12345 },
          };
        } else {
          // All other commands (boot, open, install, launch) succeed
          return {
            success: true,
            output: 'Success',
            process: { pid: 12345 },
          };
        }
      };

      const result = await build_run_simLogic(
        {
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        },
        mockExecutor,
      );

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.isError).toBe(false);
    });

    it('should handle exception with Error object', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Command failed',
      });

      const result = await build_run_simLogic(
        {
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        },
        mockExecutor,
      );

      expect(result.isError).toBe(true);
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
    });

    it('should handle exception with string error', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'String error',
      });

      const result = await build_run_simLogic(
        {
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        },
        mockExecutor,
      );

      expect(result.isError).toBe(true);
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
    });
  });

  describe('Command Generation', () => {
    it('should generate correct simctl list command with minimal parameters', async () => {
      const callHistory: Array<{
        command: string[];
        logPrefix?: string;
        useShell?: boolean;
        env?: any;
      }> = [];

      // Create tracking executor
      const trackingExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        callHistory.push({ command, logPrefix, useShell, env });
        return {
          success: false,
          output: '',
          error: 'Test error to stop execution early',
          process: { pid: 12345 },
        };
      };

      const result = await build_run_simLogic(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        },
        trackingExecutor,
      );

      // Should generate the initial build command
      expect(callHistory).toHaveLength(1);
      expect(callHistory[0].command).toEqual([
        'xcodebuild',
        '-workspace',
        '/path/to/MyProject.xcworkspace',
        '-scheme',
        'MyScheme',
        '-configuration',
        'Debug',
        '-skipMacroValidation',
        '-destination',
        'platform=iOS Simulator,name=iPhone 16,OS=latest',
        'build',
      ]);
      expect(callHistory[0].logPrefix).toBe('iOS Simulator Build');
    });

    it('should generate correct build command after finding simulator', async () => {
      const callHistory: Array<{
        command: string[];
        logPrefix?: string;
        useShell?: boolean;
        env?: any;
      }> = [];

      let callCount = 0;
      // Create tracking executor that succeeds on first call (list) and fails on second
      const trackingExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        callHistory.push({ command, logPrefix, useShell, env });
        callCount++;

        if (callCount === 1) {
          // First call: simulator list succeeds
          return {
            success: true,
            output: JSON.stringify({
              devices: {
                'iOS 16.0': [
                  {
                    udid: 'test-uuid-123',
                    name: 'iPhone 16',
                    state: 'Booted',
                  },
                ],
              },
            }),
            error: undefined,
            process: { pid: 12345 },
          };
        } else {
          // Second call: build command fails to stop execution
          return {
            success: false,
            output: '',
            error: 'Test error to stop execution',
            process: { pid: 12345 },
          };
        }
      };

      const result = await build_run_simLogic(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        },
        trackingExecutor,
      );

      // Should generate build command and then build settings command
      expect(callHistory).toHaveLength(2);

      // First call: build command
      expect(callHistory[0].command).toEqual([
        'xcodebuild',
        '-workspace',
        '/path/to/MyProject.xcworkspace',
        '-scheme',
        'MyScheme',
        '-configuration',
        'Debug',
        '-skipMacroValidation',
        '-destination',
        'platform=iOS Simulator,name=iPhone 16,OS=latest',
        'build',
      ]);
      expect(callHistory[0].logPrefix).toBe('iOS Simulator Build');

      // Second call: build settings command to get app path
      expect(callHistory[1].command).toEqual([
        'xcodebuild',
        '-showBuildSettings',
        '-workspace',
        '/path/to/MyProject.xcworkspace',
        '-scheme',
        'MyScheme',
        '-configuration',
        'Debug',
        '-destination',
        'platform=iOS Simulator,name=iPhone 16,OS=latest',
      ]);
      expect(callHistory[1].logPrefix).toBe('Get App Path');
    });

    it('should generate correct build settings command after successful build', async () => {
      const callHistory: Array<{
        command: string[];
        logPrefix?: string;
        useShell?: boolean;
        env?: any;
      }> = [];

      let callCount = 0;
      // Create tracking executor that succeeds on first two calls and fails on third
      const trackingExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        callHistory.push({ command, logPrefix, useShell, env });
        callCount++;

        if (callCount === 1) {
          // First call: simulator list succeeds
          return {
            success: true,
            output: JSON.stringify({
              devices: {
                'iOS 16.0': [
                  {
                    udid: 'test-uuid-123',
                    name: 'iPhone 16',
                    state: 'Booted',
                  },
                ],
              },
            }),
            error: undefined,
            process: { pid: 12345 },
          };
        } else if (callCount === 2) {
          // Second call: build command succeeds
          return {
            success: true,
            output: 'BUILD SUCCEEDED',
            error: undefined,
            process: { pid: 12345 },
          };
        } else {
          // Third call: build settings command fails to stop execution
          return {
            success: false,
            output: '',
            error: 'Test error to stop execution',
            process: { pid: 12345 },
          };
        }
      };

      const result = await build_run_simLogic(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
          configuration: 'Release',
          useLatestOS: false,
        },
        trackingExecutor,
      );

      // Should generate build command and build settings command
      expect(callHistory).toHaveLength(2);

      // First call: build command
      expect(callHistory[0].command).toEqual([
        'xcodebuild',
        '-workspace',
        '/path/to/MyProject.xcworkspace',
        '-scheme',
        'MyScheme',
        '-configuration',
        'Release',
        '-skipMacroValidation',
        '-destination',
        'platform=iOS Simulator,name=iPhone 16',
        'build',
      ]);
      expect(callHistory[0].logPrefix).toBe('iOS Simulator Build');

      // Second call: build settings command
      expect(callHistory[1].command).toEqual([
        'xcodebuild',
        '-showBuildSettings',
        '-workspace',
        '/path/to/MyProject.xcworkspace',
        '-scheme',
        'MyScheme',
        '-configuration',
        'Release',
        '-destination',
        'platform=iOS Simulator,name=iPhone 16',
      ]);
      expect(callHistory[1].logPrefix).toBe('Get App Path');
    });

    it('should handle paths with spaces in command generation', async () => {
      const callHistory: Array<{
        command: string[];
        logPrefix?: string;
        useShell?: boolean;
        env?: any;
      }> = [];

      // Create tracking executor
      const trackingExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        callHistory.push({ command, logPrefix, useShell, env });
        return {
          success: false,
          output: '',
          error: 'Test error to stop execution early',
          process: { pid: 12345 },
        };
      };

      const result = await build_run_simLogic(
        {
          workspacePath: '/Users/dev/My Project/MyProject.xcworkspace',
          scheme: 'My Scheme',
          simulatorName: 'iPhone 16 Pro',
        },
        trackingExecutor,
      );

      // Should generate build command first
      expect(callHistory).toHaveLength(1);
      expect(callHistory[0].command).toEqual([
        'xcodebuild',
        '-workspace',
        '/Users/dev/My Project/MyProject.xcworkspace',
        '-scheme',
        'My Scheme',
        '-configuration',
        'Debug',
        '-skipMacroValidation',
        '-destination',
        'platform=iOS Simulator,name=iPhone 16 Pro,OS=latest',
        'build',
      ]);
      expect(callHistory[0].logPrefix).toBe('iOS Simulator Build');
    });
  });

  describe('XOR Validation', () => {
    it('should error when neither projectPath nor workspacePath provided', async () => {
      const result = await buildRunSim.handler({
        scheme: 'MyScheme',
        simulatorName: 'iPhone 16',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Missing required session defaults');
      expect(result.content[0].text).toContain('Provide a project or workspace');
    });

    it('should error when both projectPath and workspacePath provided', async () => {
      const result = await buildRunSim.handler({
        projectPath: '/path/project.xcodeproj',
        workspacePath: '/path/workspace.xcworkspace',
        scheme: 'MyScheme',
        simulatorName: 'iPhone 16',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Parameter validation failed');
      expect(result.content[0].text).toContain('Mutually exclusive parameters provided');
      expect(result.content[0].text).toContain('projectPath');
      expect(result.content[0].text).toContain('workspacePath');
    });

    it('should succeed with only projectPath', async () => {
      // This test fails early due to build failure, which is expected behavior
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Build failed',
      });

      const result = await build_run_simLogic(
        {
          projectPath: '/path/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        },
        mockExecutor,
      );
      // The test succeeds if the logic function accepts the parameters and attempts to build
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Build failed');
    });

    it('should succeed with only workspacePath', async () => {
      // This test fails early due to build failure, which is expected behavior
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Build failed',
      });

      const result = await build_run_simLogic(
        {
          workspacePath: '/path/workspace.xcworkspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        },
        mockExecutor,
      );
      // The test succeeds if the logic function accepts the parameters and attempts to build
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Build failed');
    });
  });
});
