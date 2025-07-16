import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../../utils/command.js';
import buildRunSimNameProj from '../build_run_sim_name_proj.ts';

describe('build_run_sim_name_proj plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name field', () => {
      expect(buildRunSimNameProj.name).toBe('build_run_sim_name_proj');
    });

    it('should have correct description field', () => {
      expect(buildRunSimNameProj.description).toBe(
        "Builds and runs an app from a project file on a simulator specified by name. IMPORTANT: Requires projectPath, scheme, and simulatorName. Example: build_run_sim_name_proj({ projectPath: '/path/to/project.xcodeproj', scheme: 'MyScheme', simulatorName: 'iPhone 16' })",
      );
    });

    it('should have handler as a function', () => {
      expect(typeof buildRunSimNameProj.handler).toBe('function');
    });

    it('should validate schema fields with safeParse', () => {
      const schema = z.object(buildRunSimNameProj.schema);

      // Valid input
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        }).success,
      ).toBe(true);

      // Invalid projectPath
      expect(
        schema.safeParse({
          projectPath: 123,
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        }).success,
      ).toBe(false);

      // Invalid scheme
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 123,
          simulatorName: 'iPhone 16',
        }).success,
      ).toBe(false);

      // Invalid simulatorName
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorName: 123,
        }).success,
      ).toBe(false);

      // Valid with optional fields
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
          configuration: 'Release',
          derivedDataPath: '/path/to/derived',
          extraArgs: ['--arg1', '--arg2'],
          useLatestOS: true,
          preferXcodebuild: true,
        }).success,
      ).toBe(true);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return validation error for missing projectPath', async () => {
      const result = await buildRunSimNameProj.handler({
        scheme: 'MyScheme',
        simulatorName: 'iPhone 16',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'projectPath' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should return validation error for missing scheme', async () => {
      const result = await buildRunSimNameProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        simulatorName: 'iPhone 16',
      });

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

    it('should return validation error for missing simulatorName', async () => {
      const result = await buildRunSimNameProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
      });

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

    it('should return build error when build fails', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Build failed with error',
      });

      const result = await buildRunSimNameProj.handler(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          { type: 'text', text: '❌ [stderr] Build failed with error' },
          { type: 'text', text: '❌ iOS Simulator Build build failed for scheme MyScheme.' },
        ],
        isError: true,
      });
    });

    it('should handle successful build and run', async () => {
      // Manual call tracking for mockExecutor
      const executorCalls: any[] = [];
      let callIndex = 0;

      const mockExecutor = (...args: any[]) => {
        executorCalls.push(args);
        callIndex++;

        // First call: build command
        if (callIndex === 1) {
          return Promise.resolve({
            success: true,
            output: 'BUILD SUCCEEDED',
            error: undefined,
            process: { pid: 12345 },
          });
        }

        // Second call: app path command
        if (callIndex === 2) {
          return Promise.resolve({
            success: true,
            output: 'CODESIGNING_FOLDER_PATH = /path/to/MyApp.app',
            error: undefined,
            process: { pid: 12345 },
          });
        }

        // Default fallback
        return Promise.resolve({
          success: true,
          output: '',
          error: undefined,
          process: { pid: 12345 },
        });
      };

      // Mock sync calls with manual tracking
      const execSyncCalls: any[] = [];
      let execSyncCallIndex = 0;

      const mockExecSync = (command: string) => {
        execSyncCalls.push(command);
        execSyncCallIndex++;

        // simulator list
        if (execSyncCallIndex === 1) {
          return JSON.stringify({
            devices: {
              'com.apple.CoreSimulator.SimRuntime.iOS-17-0': [
                {
                  name: 'iPhone 16',
                  udid: 'test-uuid-123',
                  isAvailable: true,
                },
              ],
            },
          });
        }

        // simulator state
        if (execSyncCallIndex === 2) {
          return '    iPhone 16 (test-uuid-123) (Booted)';
        }

        // open Simulator
        if (execSyncCallIndex === 3) {
          return '';
        }

        // install app
        if (execSyncCallIndex === 4) {
          return '';
        }

        // bundle ID
        if (execSyncCallIndex === 5) {
          return 'com.example.MyApp';
        }

        // launch app
        if (execSyncCallIndex === 6) {
          return '';
        }

        return '';
      };

      const result = await buildRunSimNameProj.handler(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        },
        mockExecutor,
        mockExecSync,
      );

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('✅ iOS simulator build and run succeeded');
      expect(result.content[0].text).toContain('com.example.MyApp');
    });

    it('should handle command generation with extra args', async () => {
      // Manual call tracking for mockExecutor
      const executorCalls: any[] = [];

      const mockExecutor = (...args: any[]) => {
        executorCalls.push(args);
        return Promise.resolve({
          success: false,
          error: 'Build failed',
          output: '',
          process: { pid: 12345 },
        });
      };

      await buildRunSimNameProj.handler(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
          configuration: 'Release',
          derivedDataPath: '/path/to/derived',
          extraArgs: ['--custom-arg'],
          preferXcodebuild: true,
        },
        mockExecutor,
      );

      expect(executorCalls).toHaveLength(1);
      expect(executorCalls[0][0]).toEqual(
        expect.arrayContaining([
          'xcodebuild',
          '-project',
          '/path/to/project.xcodeproj',
          '-scheme',
          'MyScheme',
          '-configuration',
          'Release',
          '-derivedDataPath',
          '/path/to/derived',
          '--custom-arg',
          'build',
        ]),
      );
      expect(executorCalls[0][1]).toBe('iOS Simulator Build');
      expect(executorCalls[0][2]).toBe(true);
      expect(executorCalls[0][3]).toBe(undefined);
    });
  });
});
