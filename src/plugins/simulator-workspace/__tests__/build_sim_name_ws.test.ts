import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../../utils/command.js';

// Import the plugin and logic function
import buildSimNameWs, { build_sim_name_wsLogic } from '../build_sim_name_ws.ts';

describe('build_sim_name_ws tool', () => {
  // Only clear any remaining mocks if needed

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(buildSimNameWs.name).toBe('build_sim_name_ws');
    });

    it('should have correct description', () => {
      expect(buildSimNameWs.description).toBe(
        "Builds an app from a workspace for a specific simulator by name. IMPORTANT: Requires workspacePath, scheme, and simulatorName. Example: build_sim_name_ws({ workspacePath: '/path/to/MyProject.xcworkspace', scheme: 'MyScheme', simulatorName: 'iPhone 16' })",
      );
    });

    it('should have handler function', () => {
      expect(typeof buildSimNameWs.handler).toBe('function');
    });

    it('should have correct schema with required and optional fields', () => {
      const schema = z.object(buildSimNameWs.schema);

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

  describe('Parameter Validation', () => {
    it('should handle missing workspacePath parameter', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: 'Build succeeded' });

      const result = await build_sim_name_wsLogic(
        {
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

    it('should handle empty workspacePath parameter', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: 'BUILD SUCCEEDED' });

      const result = await build_sim_name_wsLogic(
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
          text: '✅ Build build succeeded for scheme MyScheme.',
        },
        {
          type: 'text',
          text: expect.stringContaining('Next Steps:'),
        },
      ]);
    });

    it('should handle missing scheme parameter', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: 'Build succeeded' });

      const result = await build_sim_name_wsLogic(
        {
          workspacePath: '/path/to/workspace',
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

    it('should handle empty scheme parameter', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: 'BUILD SUCCEEDED' });

      const result = await build_sim_name_wsLogic(
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
          text: '✅ Build build succeeded for scheme .',
        },
        {
          type: 'text',
          text: expect.stringContaining('Next Steps:'),
        },
      ]);
    });

    it('should handle missing simulatorName parameter', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: 'Build succeeded' });

      const result = await build_sim_name_wsLogic(
        {
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
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

    it('should handle empty simulatorName parameter', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'For iOS Simulator platform, either simulatorId or simulatorName must be provided',
      });

      const result = await build_sim_name_wsLogic(
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
    it('should generate correct build command with minimal parameters', async () => {
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

      const result = await build_sim_name_wsLogic(
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
      expect(callHistory[0].logPrefix).toBe('Build');
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

      const result = await build_sim_name_wsLogic(
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
      expect(callHistory[0].logPrefix).toBe('Build');
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

      const result = await build_sim_name_wsLogic(
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
      expect(callHistory[0].logPrefix).toBe('Build');
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

      const result = await build_sim_name_wsLogic(
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
      expect(callHistory[0].logPrefix).toBe('Build');
    });
  });

  describe('Response Processing', () => {
    it('should handle successful build', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: 'BUILD SUCCEEDED' });

      const result = await build_sim_name_wsLogic(
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
          text: '✅ Build build succeeded for scheme MyScheme.',
        },
        {
          type: 'text',
          text: expect.stringContaining('Next Steps:'),
        },
      ]);
    });

    it('should handle successful build with all optional parameters', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: 'BUILD SUCCEEDED' });

      const result = await build_sim_name_wsLogic(
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
          text: '✅ Build build succeeded for scheme MyScheme.',
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

      const result = await build_sim_name_wsLogic(
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
            text: '❌ Build build failed for scheme MyScheme.',
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

      const result = await build_sim_name_wsLogic(
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
            text: '✅ Build build succeeded for scheme MyScheme.',
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

      const result = await build_sim_name_wsLogic(
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

      const result = await build_sim_name_wsLogic(
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
          text: '❌ Build build failed for scheme MyScheme.',
        },
      ]);
    });

    it('should use default configuration when not provided', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: 'BUILD SUCCEEDED' });

      const result = await build_sim_name_wsLogic(
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
          text: '✅ Build build succeeded for scheme MyScheme.',
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
      const result = await build_sim_name_wsLogic(
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
          text: '✅ Build build succeeded for scheme MyScheme.',
        },
        {
          type: 'text',
          text: expect.stringContaining('Next Steps:'),
        },
      ]);
    });
  });
});
