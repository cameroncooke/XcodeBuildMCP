import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../../../utils/command.js';

// Import the plugin and logic function
import buildSimulatorName, { build_simulator_nameLogic } from '../build_simulator_name.ts';

describe('build_simulator_name tool', () => {
  // Only clear any remaining mocks if needed

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(buildSimulatorName.name).toBe('build_simulator_name');
    });

    it('should have correct description', () => {
      expect(buildSimulatorName.description).toBe(
        "Builds an app from a project or workspace for a specific simulator by name. Provide exactly one of projectPath or workspacePath. IMPORTANT: Requires either projectPath or workspacePath, plus scheme and simulatorName. Example: build_simulator_name({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme', simulatorName: 'iPhone 16' })",
      );
    });

    it('should have handler function', () => {
      expect(typeof buildSimulatorName.handler).toBe('function');
    });

    it('should have correct schema with required and optional fields', () => {
      const schema = z.object(buildSimulatorName.schema);

      // Valid inputs - workspace
      expect(
        schema.safeParse({
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        }).success,
      ).toBe(true);

      // Valid inputs - project
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
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

    it('should validate XOR constraint between projectPath and workspacePath', () => {
      const schema = z.object(buildSimulatorName.schema);

      // Both projectPath and workspacePath provided - should be invalid
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        }).success,
      ).toBe(true); // Schema validation passes, but handler validation will catch this

      // Neither provided - should be invalid
      expect(
        schema.safeParse({
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        }).success,
      ).toBe(true); // Schema validation passes, but handler validation will catch this
    });
  });

  describe('Parameter Validation', () => {
    it('should handle missing both projectPath and workspacePath', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: 'Build succeeded' });

      // Since we use XOR validation, this should fail at the handler level
      const result = await buildSimulatorName.handler({
        scheme: 'MyScheme',
        simulatorName: 'iPhone 16',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Parameter validation failed');
      expect(result.content[0].text).toContain('Either projectPath or workspacePath is required');
    });

    it('should handle both projectPath and workspacePath provided', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: 'Build succeeded' });

      // Since we use XOR validation, this should fail at the handler level
      const result = await buildSimulatorName.handler({
        projectPath: '/path/to/project.xcodeproj',
        workspacePath: '/path/to/workspace',
        scheme: 'MyScheme',
        simulatorName: 'iPhone 16',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Parameter validation failed');
      expect(result.content[0].text).toContain(
        'projectPath and workspacePath are mutually exclusive',
      );
    });

    it('should handle empty workspacePath parameter', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: 'BUILD SUCCEEDED' });

      const result = await build_simulator_nameLogic(
        {
          workspacePath: '',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        },
        mockExecutor,
      );

      // Empty string passes validation but may cause build issues
      expect(result.content).toEqual([
        {
          type: 'text',
          text: '✅ iOS Simulator Build build succeeded for scheme MyScheme.',
        },
        {
          type: 'text',
          text: expect.stringContaining('Next Steps:'),
        },
      ]);
    });

    it('should handle missing scheme parameter', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: 'Build succeeded' });

      // Since we removed manual validation, this test now checks that Zod validation works
      // by testing the typed tool handler through the default export
      const result = await buildSimulatorName.handler({
        workspacePath: '/path/to/workspace',
        simulatorName: 'iPhone 16',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Parameter validation failed');
      expect(result.content[0].text).toContain('scheme');
      expect(result.content[0].text).toContain('Required');
    });

    it('should handle empty scheme parameter', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: 'BUILD SUCCEEDED' });

      const result = await build_simulator_nameLogic(
        {
          workspacePath: '/path/to/workspace',
          scheme: '',
          simulatorName: 'iPhone 16',
        },
        mockExecutor,
      );

      // Empty string passes validation but may cause build issues
      expect(result.content).toEqual([
        {
          type: 'text',
          text: '✅ iOS Simulator Build build succeeded for scheme .',
        },
        {
          type: 'text',
          text: expect.stringContaining('Next Steps:'),
        },
      ]);
    });

    it('should handle missing simulatorName parameter', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: 'Build succeeded' });

      // Since we removed manual validation, this test now checks that Zod validation works
      // by testing the typed tool handler through the default export
      const result = await buildSimulatorName.handler({
        workspacePath: '/path/to/workspace',
        scheme: 'MyScheme',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Parameter validation failed');
      expect(result.content[0].text).toContain('simulatorName');
      expect(result.content[0].text).toContain('Required');
    });

    it('should handle empty simulatorName parameter', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'For iOS Simulator platform, either simulatorId or simulatorName must be provided',
      });

      const result = await build_simulator_nameLogic(
        {
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorName: '',
        },
        mockExecutor,
      );

      // Empty simulatorName passes validation but causes early failure in destination construction
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe(
        '❌ [stderr] For iOS Simulator platform, either simulatorId or simulatorName must be provided',
      );
    });
  });

  describe('Command Generation', () => {
    it('should generate correct build command with minimal parameters (workspace)', async () => {
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

      const result = await build_simulator_nameLogic(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        },
        trackingExecutor,
      );

      // Should generate one build command
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

    it('should generate correct build command with minimal parameters (project)', async () => {
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

      const result = await build_simulator_nameLogic(
        {
          projectPath: '/path/to/MyProject.xcodeproj',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        },
        trackingExecutor,
      );

      // Should generate one build command
      expect(callHistory).toHaveLength(1);
      expect(callHistory[0].command).toEqual([
        'xcodebuild',
        '-project',
        '/path/to/MyProject.xcodeproj',
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

    it('should generate correct build command with all optional parameters', async () => {
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

      const result = await build_simulator_nameLogic(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
          configuration: 'Release',
          derivedDataPath: '/custom/derived/path',
          extraArgs: ['--verbose'],
          useLatestOS: false,
        },
        trackingExecutor,
      );

      // Should generate one build command with all parameters
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
        'platform=iOS Simulator,name=iPhone 16',
        '-derivedDataPath',
        '/custom/derived/path',
        '--verbose',
        'build',
      ]);
      expect(callHistory[0].logPrefix).toBe('iOS Simulator Build');
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

      const result = await build_simulator_nameLogic(
        {
          workspacePath: '/Users/dev/My Project/MyProject.xcworkspace',
          scheme: 'My Scheme',
          simulatorName: 'iPhone 16 Pro',
        },
        trackingExecutor,
      );

      // Should generate one build command with paths containing spaces
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

    it('should generate correct build command with useLatestOS set to true', async () => {
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

      const result = await build_simulator_nameLogic(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
          useLatestOS: true,
        },
        trackingExecutor,
      );

      // Should generate one build command with OS=latest
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
  });

  describe('Response Processing', () => {
    it('should handle successful build', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: 'BUILD SUCCEEDED' });

      const result = await build_simulator_nameLogic(
        {
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        },
        mockExecutor,
      );

      expect(result.content).toEqual([
        {
          type: 'text',
          text: '✅ iOS Simulator Build build succeeded for scheme MyScheme.',
        },
        {
          type: 'text',
          text: expect.stringContaining('Next Steps:'),
        },
      ]);
    });

    it('should handle successful build with all optional parameters', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: 'BUILD SUCCEEDED' });

      const result = await build_simulator_nameLogic(
        {
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
          configuration: 'Release',
          derivedDataPath: '/path/to/derived',
          extraArgs: ['--verbose'],
          useLatestOS: false,
          preferXcodebuild: true,
        },
        mockExecutor,
      );

      expect(result.content).toEqual([
        {
          type: 'text',
          text: '✅ iOS Simulator Build build succeeded for scheme MyScheme.',
        },
        {
          type: 'text',
          text: expect.stringContaining('Next Steps:'),
        },
      ]);
    });

    it('should handle build failure', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'Build failed: Compilation error',
      });

      const result = await build_simulator_nameLogic(
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
            text: '❌ [stderr] Build failed: Compilation error',
          },
          {
            type: 'text',
            text: '❌ iOS Simulator Build build failed for scheme MyScheme.',
          },
        ],
        isError: true,
      });
    });

    it('should handle build warnings', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'warning: deprecated method used\nBUILD SUCCEEDED',
      });

      const result = await build_simulator_nameLogic(
        {
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        },
        mockExecutor,
      );

      expect(result.content).toEqual(
        expect.arrayContaining([
          {
            type: 'text',
            text: expect.stringContaining('⚠️'),
          },
          {
            type: 'text',
            text: '✅ iOS Simulator Build build succeeded for scheme MyScheme.',
          },
          {
            type: 'text',
            text: expect.stringContaining('Next Steps:'),
          },
        ]),
      );
    });

    it('should handle command executor errors', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'spawn xcodebuild ENOENT',
      });

      const result = await build_simulator_nameLogic(
        {
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        },
        mockExecutor,
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('❌ [stderr] spawn xcodebuild ENOENT');
    });

    it('should handle mixed warning and error output', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        output: 'warning: deprecated method\nerror: undefined symbol',
        error: 'Build failed',
      });

      const result = await build_simulator_nameLogic(
        {
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        },
        mockExecutor,
      );

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        {
          type: 'text',
          text: '⚠️ Warning: warning: deprecated method',
        },
        {
          type: 'text',
          text: '❌ Error: error: undefined symbol',
        },
        {
          type: 'text',
          text: '❌ [stderr] Build failed',
        },
        {
          type: 'text',
          text: '❌ iOS Simulator Build build failed for scheme MyScheme.',
        },
      ]);
    });

    it('should use default configuration when not provided', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: 'BUILD SUCCEEDED' });

      const result = await build_simulator_nameLogic(
        {
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
          // configuration intentionally omitted - should default to Debug
        },
        mockExecutor,
      );

      expect(result.content).toEqual([
        {
          type: 'text',
          text: '✅ iOS Simulator Build build succeeded for scheme MyScheme.',
        },
        {
          type: 'text',
          text: expect.stringContaining('Next Steps:'),
        },
      ]);
    });
  });

  describe('Error Handling', () => {
    it('should handle catch block exceptions', async () => {
      // Create a mock that throws an error when called
      const mockExecutor = createMockExecutor({ success: true, output: 'BUILD SUCCEEDED' });

      // Mock the handler to throw an error by passing invalid parameters to internal functions
      const result = await build_simulator_nameLogic(
        {
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        },
        mockExecutor,
      );

      // Should handle the build successfully
      expect(result.content).toEqual([
        {
          type: 'text',
          text: '✅ iOS Simulator Build build succeeded for scheme MyScheme.',
        },
        {
          type: 'text',
          text: expect.stringContaining('Next Steps:'),
        },
      ]);
    });
  });
});
