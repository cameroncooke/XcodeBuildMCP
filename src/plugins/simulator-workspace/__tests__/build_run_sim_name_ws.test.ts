/**
 * Tests for build_run_sim_name_ws plugin
 * Following CLAUDE.md testing standards with dependency injection and literal validation
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { createMockExecutor, createMockFileSystemExecutor } from '../../../utils/command.js';
import buildRunSimNameWs from '../build_run_sim_name_ws.ts';

describe('build_run_sim_name_ws tool', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(buildRunSimNameWs.name).toBe('build_run_sim_name_ws');
    });

    it('should have correct description', () => {
      expect(buildRunSimNameWs.description).toBe(
        "Builds and runs an app from a workspace on a simulator specified by name. IMPORTANT: Requires workspacePath, scheme, and simulatorName. Example: build_run_sim_name_ws({ workspacePath: '/path/to/workspace', scheme: 'MyScheme', simulatorName: 'iPhone 16' })",
      );
    });

    it('should have handler function', () => {
      expect(typeof buildRunSimNameWs.handler).toBe('function');
    });

    it('should have correct schema with required and optional fields', () => {
      const schema = z.object(buildRunSimNameWs.schema);

      // Valid inputs
      expect(
        schema.safeParse({
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        }).success,
      ).toBe(true);

      expect(
        schema.safeParse({
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
          configuration: 'Release',
          derivedDataPath: '/path/to/derived',
          extraArgs: ['--verbose'],
          useLatestOS: true,
          preferXcodebuild: false,
        }).success,
      ).toBe(true);

      // Invalid inputs - missing required fields
      expect(
        schema.safeParse({
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
        }).success,
      ).toBe(false);

      expect(
        schema.safeParse({
          workspacePath: '/path/to/workspace',
          simulatorName: 'iPhone 16',
        }).success,
      ).toBe(false);

      expect(
        schema.safeParse({
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        }).success,
      ).toBe(false);

      // Invalid types
      expect(
        schema.safeParse({
          workspacePath: 123,
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        }).success,
      ).toBe(false);

      expect(
        schema.safeParse({
          workspacePath: '/path/to/workspace',
          scheme: 123,
          simulatorName: 'iPhone 16',
        }).success,
      ).toBe(false);

      expect(
        schema.safeParse({
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorName: 123,
        }).success,
      ).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should handle validation failure for workspacePath', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Mock output',
      });

      const result = await buildRunSimNameWs.handler(
        {
          workspacePath: undefined,
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'workspacePath' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should handle validation failure for scheme', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Mock output',
      });

      const result = await buildRunSimNameWs.handler(
        {
          workspacePath: '/path/to/workspace',
          scheme: undefined,
          simulatorName: 'iPhone 16',
        },
        mockExecutor,
      );

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

    it('should handle validation failure for simulatorName', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Mock output',
      });

      const result = await buildRunSimNameWs.handler(
        {
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorName: undefined,
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'simulatorName' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should handle simulator not found', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: JSON.stringify({
          devices: {
            'iOS 16.0': [
              {
                udid: 'test-uuid-123',
                name: 'iPhone 14',
                state: 'Booted',
              },
            ],
          },
        }),
      });

      const result = await buildRunSimNameWs.handler(
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
            text: "Build succeeded, but could not find an available simulator named 'iPhone 16'. Use list_simulators({}) to check available devices.",
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

      const result = await buildRunSimNameWs.handler(
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
      // Create a mock executor that simulates successful flow
      const mockExecutor = async (command: string[]) => {
        if (command.includes('simctl') && command.includes('list')) {
          // First call: return simulator list with iPhone 16
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
            process: { pid: 12345 },
          };
        } else if (command.includes('xcodebuild') && command.includes('-showBuildSettings')) {
          // Build settings call
          return {
            success: true,
            output: 'BUILT_PRODUCTS_DIR = /path/to/build\nFULL_PRODUCT_NAME = MyApp.app\n',
            process: { pid: 12345 },
          };
        } else if (command.includes('xcodebuild') && command.includes('build')) {
          // Build command
          return {
            success: true,
            output: 'BUILD SUCCEEDED',
            process: { pid: 12345 },
          };
        } else if (command.includes('plutil')) {
          // Bundle ID extraction
          return {
            success: true,
            output: 'com.example.MyApp',
            process: { pid: 12345 },
          };
        } else {
          // Other commands (boot, install, launch)
          return {
            success: true,
            output: 'Success',
            process: { pid: 12345 },
          };
        }
      };

      const result = await buildRunSimNameWs.handler(
        {
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        },
        mockExecutor,
      );

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.isError).toBeUndefined();
    });

    it('should handle exception with Error object', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Command failed',
      });

      const result = await buildRunSimNameWs.handler(
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

      const result = await buildRunSimNameWs.handler(
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

      const result = await buildRunSimNameWs.handler(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        },
        trackingExecutor,
      );

      // Should generate the initial simulator list command
      expect(callHistory).toHaveLength(1);
      expect(callHistory[0].command).toEqual([
        'xcrun',
        'simctl',
        'list',
        'devices',
        'available',
        '--json',
      ]);
      expect(callHistory[0].logPrefix).toBe('List Simulators');
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

      const result = await buildRunSimNameWs.handler(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        },
        trackingExecutor,
      );

      // Should generate simulator list command and then build command
      expect(callHistory).toHaveLength(2);

      // First call: simulator list command
      expect(callHistory[0].command).toEqual([
        'xcrun',
        'simctl',
        'list',
        'devices',
        'available',
        '--json',
      ]);

      // Second call: build command
      expect(callHistory[1].command).toEqual([
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
      expect(callHistory[1].logPrefix).toBe('Build');
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

      const result = await buildRunSimNameWs.handler(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
          configuration: 'Release',
          useLatestOS: false,
        },
        trackingExecutor,
      );

      // Should generate simulator list, build command, and build settings command
      expect(callHistory).toHaveLength(3);

      // First call: simulator list command
      expect(callHistory[0].command).toEqual([
        'xcrun',
        'simctl',
        'list',
        'devices',
        'available',
        '--json',
      ]);

      // Second call: build command
      expect(callHistory[1].command).toEqual([
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

      // Third call: build settings command
      expect(callHistory[2].command).toEqual([
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
      expect(callHistory[2].logPrefix).toBe('Get App Path');
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

      const result = await buildRunSimNameWs.handler(
        {
          workspacePath: '/Users/dev/My Project/MyProject.xcworkspace',
          scheme: 'My Scheme',
          simulatorName: 'iPhone 16 Pro',
        },
        trackingExecutor,
      );

      // Should generate simulator list command first
      expect(callHistory).toHaveLength(1);
      expect(callHistory[0].command).toEqual([
        'xcrun',
        'simctl',
        'list',
        'devices',
        'available',
        '--json',
      ]);
      expect(callHistory[0].logPrefix).toBe('List Simulators');
    });
  });
});
