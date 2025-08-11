import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../../../utils/command.js';
import buildRunSimulatorId, { build_run_simulator_idLogic } from '../build_run_simulator_id.js';

describe('build_run_simulator_id tool', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(buildRunSimulatorId.name).toBe('build_run_simulator_id');
    });

    it('should have correct description', () => {
      expect(buildRunSimulatorId.description).toBe(
        "Builds and runs an app from a project or workspace on a specific simulator by UUID. Provide exactly one of projectPath or workspacePath. IMPORTANT: Requires either projectPath or workspacePath, plus scheme and simulatorId. Example: build_run_simulator_id({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme', simulatorId: 'SIMULATOR_UUID' })",
      );
    });

    it('should have handler function', () => {
      expect(typeof buildRunSimulatorId.handler).toBe('function');
    });

    it('should validate schema fields with safeParse', () => {
      const schema = z.object(buildRunSimulatorId.schema);

      // Valid input with workspace
      expect(
        schema.safeParse({
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
        }).success,
      ).toBe(true);

      // Valid input with project
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
        }).success,
      ).toBe(true);

      // Missing project/workspace path - use refinement validation instead of base schema
      const buildRunSimulatorIdSchemaForTest = z
        .object(buildRunSimulatorId.schema)
        .refine((val) => val.projectPath !== undefined || val.workspacePath !== undefined, {
          message: 'Either projectPath or workspacePath is required.',
        })
        .refine((val) => !(val.projectPath !== undefined && val.workspacePath !== undefined), {
          message: 'projectPath and workspacePath are mutually exclusive. Provide only one.',
        });
      expect(
        buildRunSimulatorIdSchemaForTest.safeParse({
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
        }).success,
      ).toBe(false);

      // Missing scheme
      expect(
        schema.safeParse({
          workspacePath: '/path/to/workspace',
          simulatorId: 'test-uuid-123',
        }).success,
      ).toBe(false);

      // Missing simulatorId
      expect(
        schema.safeParse({
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
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

    // XOR validation tests - add these after the existing schema tests
    it('should reject both projectPath and workspacePath provided', async () => {
      const result = await buildRunSimulatorId.handler({
        projectPath: '/path/to/project.xcodeproj',
        workspacePath: '/path/to/workspace',
        scheme: 'MyScheme',
        simulatorId: 'test-uuid-123',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('mutually exclusive');
    });

    it('should reject neither projectPath nor workspacePath provided', async () => {
      const result = await buildRunSimulatorId.handler({
        scheme: 'MyScheme',
        simulatorId: 'test-uuid-123',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Either projectPath or workspacePath is required');
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

      const result = await build_run_simulator_idLogic(
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
      expect(callHistory[0].logPrefix).toBe('iOS Simulator Build');
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

      const result = await build_run_simulator_idLogic(
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
      expect(callHistory[0].logPrefix).toBe('iOS Simulator Build');
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

      const result = await build_run_simulator_idLogic(
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

      const result = await build_run_simulator_idLogic(
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
    it('should handle validation failure for missing project/workspace path', async () => {
      const result = await buildRunSimulatorId.handler({
        scheme: 'MyScheme',
        simulatorId: 'test-uuid-123',
        // Missing both projectPath and workspacePath
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Either projectPath or workspacePath is required');
    });

    it('should handle validation failure for scheme', async () => {
      const result = await buildRunSimulatorId.handler({
        workspacePath: '/path/to/workspace',
        simulatorId: 'test-uuid-123',
        // Missing scheme
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('scheme');
      expect(result.content[0].text).toContain('Required');
    });

    it('should handle validation failure for simulatorId', async () => {
      const result = await buildRunSimulatorId.handler({
        workspacePath: '/path/to/workspace',
        scheme: 'MyScheme',
        // Missing simulatorId
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('simulatorId');
      expect(result.content[0].text).toContain('Required');
    });

    it('should handle build failure', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Build failed with error',
        output: '',
      });

      const result = await build_run_simulator_idLogic(
        {
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
        },
        mockExecutor,
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Build failed with error');
    });

    it('should handle successful build with workspace path', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'BUILD SUCCEEDED',
      });

      const result = await build_run_simulator_idLogic(
        {
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
        },
        mockExecutor,
      );

      // Should successfully process parameters and attempt build
      expect(result.isError).toBe(true); // Expected to fail due to missing simulator environment
      expect(result.content[0].text).toContain(
        'Build succeeded, but could not find app path in build settings',
      );
    });

    it('should handle successful build with project path', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'BUILD SUCCEEDED',
      });

      const result = await build_run_simulator_idLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
        },
        mockExecutor,
      );

      // Should successfully process parameters and attempt build
      expect(result.isError).toBe(true); // Expected to fail due to missing simulator environment
      expect(result.content[0].text).toContain(
        'Build succeeded, but could not find app path in build settings',
      );
    });
  });
});
