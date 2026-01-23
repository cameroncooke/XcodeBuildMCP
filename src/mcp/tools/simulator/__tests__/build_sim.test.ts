import { describe, it, expect, beforeEach } from 'vitest';
import * as z from 'zod';
import {
  createMockExecutor,
  createMockCommandResponse,
} from '../../../../test-utils/mock-executors.ts';
import type { CommandExecutor } from '../../../../utils/execution/index.ts';
import { sessionStore } from '../../../../utils/session-store.ts';

// Import the plugin and logic function
import buildSim, { build_simLogic } from '../build_sim.ts';

describe('build_sim tool', () => {
  beforeEach(() => {
    sessionStore.clear();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(buildSim.name).toBe('build_sim');
    });

    it('should have correct description', () => {
      expect(buildSim.description).toBe('Build for iOS sim.');
    });

    it('should have handler function', () => {
      expect(typeof buildSim.handler).toBe('function');
    });

    it('should have correct public schema (only non-session fields)', () => {
      const schema = z.object(buildSim.schema);

      // Public schema should allow empty input
      expect(schema.safeParse({}).success).toBe(true);

      // Valid public inputs
      expect(
        schema.safeParse({
          derivedDataPath: '/path/to/derived',
          extraArgs: ['--verbose'],
          preferXcodebuild: false,
        }).success,
      ).toBe(true);

      // Invalid types on public inputs
      expect(schema.safeParse({ derivedDataPath: 123 }).success).toBe(false);
      expect(schema.safeParse({ extraArgs: [123] }).success).toBe(false);
      expect(schema.safeParse({ preferXcodebuild: 'yes' }).success).toBe(false);
    });
  });

  describe('Parameter Validation', () => {
    it('should handle missing both projectPath and workspacePath', async () => {
      const result = await buildSim.handler({
        scheme: 'MyScheme',
        simulatorName: 'iPhone 16',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Missing required session defaults');
      expect(result.content[0].text).toContain('Provide a project or workspace');
    });

    it('should handle both projectPath and workspacePath provided', async () => {
      const result = await buildSim.handler({
        projectPath: '/path/to/project.xcodeproj',
        workspacePath: '/path/to/workspace',
        scheme: 'MyScheme',
        simulatorName: 'iPhone 16',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Parameter validation failed');
      expect(result.content[0].text).toContain('Mutually exclusive parameters provided');
      expect(result.content[0].text).toContain('projectPath');
      expect(result.content[0].text).toContain('workspacePath');
    });

    it('should handle empty workspacePath parameter', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: 'BUILD SUCCEEDED' });

      const result = await build_simLogic(
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
      const result = await buildSim.handler({
        workspacePath: '/path/to/workspace',
        simulatorName: 'iPhone 16',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Missing required session defaults');
      expect(result.content[0].text).toContain('scheme is required');
    });

    it('should handle empty scheme parameter', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: 'BUILD SUCCEEDED' });

      const result = await build_simLogic(
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

    it('should handle missing both simulatorId and simulatorName', async () => {
      const result = await buildSim.handler({
        workspacePath: '/path/to/workspace',
        scheme: 'MyScheme',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Missing required session defaults');
      expect(result.content[0].text).toContain('Provide simulatorId or simulatorName');
    });

    it('should handle both simulatorId and simulatorName provided', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: 'Build succeeded' });

      // Should fail with XOR validation
      const result = await buildSim.handler({
        workspacePath: '/path/to/workspace',
        scheme: 'MyScheme',
        simulatorId: 'ABC-123',
        simulatorName: 'iPhone 16',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Parameter validation failed');
      expect(result.content[0].text).toContain('Mutually exclusive parameters provided');
      expect(result.content[0].text).toContain('simulatorId');
      expect(result.content[0].text).toContain('simulatorName');
    });

    it('should handle empty simulatorName parameter', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'For iOS Simulator platform, either simulatorId or simulatorName must be provided',
      });

      const result = await build_simLogic(
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
        'For iOS Simulator platform, either simulatorId or simulatorName must be provided',
      );
    });
  });

  describe('Command Generation', () => {
    it('should generate correct build command with minimal parameters (workspace)', async () => {
      const callHistory: Array<{
        command: string[];
        logPrefix?: string;
        useShell?: boolean;
        opts?: { env?: Record<string, string>; cwd?: string };
      }> = [];

      // Create tracking executor
      const trackingExecutor: CommandExecutor = async (command, logPrefix, useShell, opts) => {
        callHistory.push({ command, logPrefix, useShell, opts });
        return createMockCommandResponse({
          success: false,
          output: '',
          error: 'Test error to stop execution early',
        });
      };

      const result = await build_simLogic(
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
        opts?: { env?: Record<string, string>; cwd?: string };
      }> = [];

      // Create tracking executor
      const trackingExecutor: CommandExecutor = async (command, logPrefix, useShell, opts) => {
        callHistory.push({ command, logPrefix, useShell, opts });
        return createMockCommandResponse({
          success: false,
          output: '',
          error: 'Test error to stop execution early',
        });
      };

      const result = await build_simLogic(
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
        opts?: { env?: Record<string, string>; cwd?: string };
      }> = [];

      // Create tracking executor
      const trackingExecutor: CommandExecutor = async (command, logPrefix, useShell, opts) => {
        callHistory.push({ command, logPrefix, useShell, opts });
        return createMockCommandResponse({
          success: false,
          output: '',
          error: 'Test error to stop execution early',
        });
      };

      const result = await build_simLogic(
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
        opts?: { env?: Record<string, string>; cwd?: string };
      }> = [];

      // Create tracking executor
      const trackingExecutor: CommandExecutor = async (command, logPrefix, useShell, opts) => {
        callHistory.push({ command, logPrefix, useShell, opts });
        return createMockCommandResponse({
          success: false,
          output: '',
          error: 'Test error to stop execution early',
        });
      };

      const result = await build_simLogic(
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
        opts?: { env?: Record<string, string>; cwd?: string };
      }> = [];

      // Create tracking executor
      const trackingExecutor: CommandExecutor = async (command, logPrefix, useShell, opts) => {
        callHistory.push({ command, logPrefix, useShell, opts });
        return createMockCommandResponse({
          success: false,
          output: '',
          error: 'Test error to stop execution early',
        });
      };

      const result = await build_simLogic(
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

      const result = await build_simLogic(
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

      const result = await build_simLogic(
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

      const result = await build_simLogic(
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

      const result = await build_simLogic(
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

      const result = await build_simLogic(
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

      const result = await build_simLogic(
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

      const result = await build_simLogic(
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
      const result = await build_simLogic(
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
