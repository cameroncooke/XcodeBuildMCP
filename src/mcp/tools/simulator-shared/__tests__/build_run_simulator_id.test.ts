import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../../../utils/command.js';
import buildRunSimIdWs, { build_run_sim_id_wsLogic } from '../build_run_sim_id_ws.ts';

describe('build_run_sim_id_ws tool', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(buildRunSimIdWs.name).toBe('build_run_sim_id_ws');
    });

    it('should have correct description', () => {
      expect(buildRunSimIdWs.description).toBe(
        "Builds and runs an app from a workspace on a simulator specified by UUID. IMPORTANT: Requires workspacePath, scheme, and simulatorId. Example: build_run_sim_id_ws({ workspacePath: '/path/to/workspace', scheme: 'MyScheme', simulatorId: 'SIMULATOR_UUID' })",
      );
    });

    it('should have handler function', () => {
      expect(typeof buildRunSimIdWs.handler).toBe('function');
    });

    it('should validate schema fields with safeParse', () => {
      const schema = z.object(buildRunSimIdWs.schema);

      // Valid input
      expect(
        schema.safeParse({
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
        }).success,
      ).toBe(true);

      // Missing required fields
      expect(
        schema.safeParse({
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
        }).success,
      ).toBe(false);

      expect(
        schema.safeParse({
          workspacePath: '/path/to/workspace',
          simulatorId: 'test-uuid-123',
        }).success,
      ).toBe(false);

      expect(
        schema.safeParse({
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
        }).success,
      ).toBe(false);

      // Invalid types
      expect(
        schema.safeParse({
          workspacePath: 123,
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
        }).success,
      ).toBe(false);

      expect(
        schema.safeParse({
          workspacePath: '/path/to/workspace',
          scheme: 123,
          simulatorId: 'test-uuid-123',
        }).success,
      ).toBe(false);

      expect(
        schema.safeParse({
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorId: 123,
        }).success,
      ).toBe(false);
    });
  });

  describe('Command Generation', () => {
    it('should generate correct xcodebuild command with minimal parameters', async () => {
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

      const result = await build_run_sim_id_wsLogic(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
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
        'platform=iOS Simulator,id=test-uuid-123',
        'build',
      ]);
      expect(callHistory[0].logPrefix).toBe('Build');
    });

    it('should generate correct xcodebuild command with all parameters', async () => {
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

      const result = await build_run_sim_id_wsLogic(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
          configuration: 'Release',
          derivedDataPath: '/custom/derived',
          extraArgs: ['--verbose'],
          preferXcodebuild: true,
        },
        trackingExecutor,
      );

      // Should generate the initial build command with all parameters
      expect(callHistory).toHaveLength(1);
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
        'platform=iOS Simulator,id=test-uuid-123',
        '-derivedDataPath',
        '/custom/derived',
        '--verbose',
        'build',
      ]);
      expect(callHistory[0].logPrefix).toBe('Build');
    });

    it('should generate correct build settings command after successful build', async () => {
      const callHistory: Array<{
        command: string[];
        logPrefix?: string;
        useShell?: boolean;
        env?: any;
      }> = [];

      let callCount = 0;
      // Create tracking executor that succeeds on first call (build) and fails on second
      const trackingExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        callHistory.push({ command, logPrefix, useShell, env });
        callCount++;

        if (callCount === 1) {
          // First call: build command succeeds
          return {
            success: true,
            output: 'BUILD SUCCEEDED',
            error: undefined,
            process: { pid: 12345 },
          };
        } else {
          // Second call: build settings command fails to stop execution
          return {
            success: false,
            output: '',
            error: 'Test error to stop execution',
            process: { pid: 12345 },
          };
        }
      };

      const result = await build_run_sim_id_wsLogic(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
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
        'platform=iOS Simulator,id=test-uuid-123',
        'build',
      ]);

      // Second call: build settings command
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
        'platform=iOS Simulator,id=test-uuid-123',
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

      const result = await build_run_sim_id_wsLogic(
        {
          workspacePath: '/Users/dev/My Project/MyProject.xcworkspace',
          scheme: 'My Scheme',
          simulatorId: 'test-uuid-123',
        },
        trackingExecutor,
      );

      // Should generate command with paths containing spaces
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
        'platform=iOS Simulator,id=test-uuid-123',
        'build',
      ]);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should handle validation failure for workspacePath', async () => {
      const result = await buildRunSimIdWs.handler({
        scheme: 'MyScheme',
        simulatorId: 'test-uuid-123',
        // Missing workspacePath
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Parameter validation failed\nDetails: Invalid parameters:\nworkspacePath: Required',
          },
        ],
        isError: true,
      });
    });

    it('should handle validation failure for scheme', async () => {
      const result = await buildRunSimIdWs.handler({
        workspacePath: '/path/to/workspace',
        simulatorId: 'test-uuid-123',
        // Missing scheme
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Parameter validation failed\nDetails: Invalid parameters:\nscheme: Required',
          },
        ],
        isError: true,
      });
    });

    it('should handle validation failure for simulatorId', async () => {
      const result = await buildRunSimIdWs.handler({
        workspacePath: '/path/to/workspace',
        scheme: 'MyScheme',
        // Missing simulatorId
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Parameter validation failed\nDetails: Invalid parameters:\nsimulatorId: Required',
          },
        ],
        isError: true,
      });
    });

    it('should handle build failure', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Build failed with error',
        output: '',
      });

      const result = await build_run_sim_id_wsLogic(
        {
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        isError: true,
        content: [
          {
            type: 'text',
            text: '❌ [stderr] Build failed with error',
          },
          {
            type: 'text',
            text: '❌ Build build failed for scheme MyScheme.',
          },
        ],
      });
    });

    it('should handle successful build with proper parameter validation', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'BUILD SUCCEEDED',
      });

      const result = await build_run_sim_id_wsLogic(
        {
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
        },
        mockExecutor,
      );

      // Should successfully process parameters and attempt build
      expect(result.isError).toBe(true); // Expected to fail due to missing simulator environment
      expect(result.content[0].text).toContain('Failed to extract app path from build settings');
    });
  });
});
