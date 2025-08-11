import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../../../utils/command.js';

// Import the plugin and logic function
import buildSimulatorId, { build_simulator_idLogic } from '../build_simulator_id.ts';

describe('build_simulator_id tool', () => {
  // Only clear any remaining mocks if needed

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(buildSimulatorId.name).toBe('build_simulator_id');
    });

    it('should have correct description', () => {
      expect(buildSimulatorId.description).toBe(
        "Builds an app from a project or workspace for a specific simulator by UUID. Provide exactly one of projectPath or workspacePath. IMPORTANT: Requires either projectPath or workspacePath, plus scheme and simulatorId. Example: build_simulator_id({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme', simulatorId: 'SIMULATOR_UUID' })",
      );
    });

    it('should have handler function', () => {
      expect(typeof buildSimulatorId.handler).toBe('function');
    });

    it('should have correct schema with required and optional fields', () => {
      const schema = z.object(buildSimulatorId.schema);

      // Valid inputs - workspace path
      expect(
        schema.safeParse({
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
        }).success,
      ).toBe(true);

      // Valid inputs - project path
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
        }).success,
      ).toBe(true);

      expect(
        schema.safeParse({
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
          configuration: 'Release',
          derivedDataPath: '/path/to/derived',
          extraArgs: ['--verbose'],
          useLatestOS: true,
          preferXcodebuild: false,
          simulatorName: 'iPhone 16',
        }).success,
      ).toBe(true);

      // Invalid inputs - missing required fields
      expect(
        schema.safeParse({
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          // simulatorId missing
        }).success,
      ).toBe(false);

      expect(
        schema.safeParse({
          workspacePath: '/path/to/workspace',
          simulatorId: 'test-uuid-123',
          // scheme missing
        }).success,
      ).toBe(false);

      // This should pass base schema validation (but would fail XOR validation at handler level)
      expect(
        schema.safeParse({
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
          // Neither projectPath nor workspacePath - base schema allows this
        }).success,
      ).toBe(true);

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

  describe('XOR Validation', () => {
    it('should error when neither projectPath nor workspacePath provided', async () => {
      const result = await buildSimulatorId.handler({
        scheme: 'MyScheme',
        simulatorId: 'test-uuid-123',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Either projectPath or workspacePath is required');
    });

    it('should error when both projectPath and workspacePath provided', async () => {
      const result = await buildSimulatorId.handler({
        projectPath: '/path/project.xcodeproj',
        workspacePath: '/path/workspace.xcworkspace',
        scheme: 'MyScheme',
        simulatorId: 'test-uuid-123',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('mutually exclusive');
    });

    it('should handle empty string conversion for XOR validation', async () => {
      // Empty strings should be converted to undefined
      const mockExecutor = createMockExecutor({ success: true, output: 'BUILD SUCCEEDED' });

      const result = await build_simulator_idLogic(
        {
          projectPath: '',
          workspacePath: '/path/workspace.xcworkspace',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
        },
        mockExecutor,
      );
      // Should succeed because empty string projectPath becomes undefined
      expect(result.isError).toBeUndefined();
    });
  });

  describe('Parameter Validation', () => {
    it('should handle missing scheme parameter', async () => {
      // Test the handler directly since validation happens at the handler level
      const result = await buildSimulatorId.handler({
        workspacePath: '/path/to/workspace',
        simulatorId: 'test-uuid-123',
        // scheme missing
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Parameter validation failed');
      expect(result.content[0].text).toContain('scheme');
    });

    it('should handle empty workspacePath parameter', async () => {
      // Test with handler to get proper XOR validation
      const result = await buildSimulatorId.handler({
        workspacePath: '',
        scheme: 'MyScheme',
        simulatorId: 'test-uuid-123',
      });

      // Empty string gets converted to undefined in preprocessing, so this will fail XOR validation
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Either projectPath or workspacePath is required');
    });

    it('should handle missing simulatorId parameter', async () => {
      // Test the handler directly since validation happens at the handler level
      const result = await buildSimulatorId.handler({
        workspacePath: '/path/to/workspace',
        scheme: 'MyScheme',
        // simulatorId missing
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Parameter validation failed');
      expect(result.content[0].text).toContain('simulatorId');
    });

    it('should handle empty scheme parameter', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: 'BUILD SUCCEEDED' });

      const result = await build_simulator_idLogic(
        {
          workspacePath: '/path/to/workspace',
          scheme: '',
          simulatorId: 'test-uuid-123',
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

    it('should handle empty simulatorId parameter', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'For iOS Simulator platform, either simulatorId or simulatorName must be provided',
      });

      const result = await build_simulator_idLogic(
        {
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorId: '',
        },
        mockExecutor,
      );

      // Empty simulatorId causes early failure in destination construction
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe(
        'For iOS Simulator platform, either simulatorId or simulatorName must be provided',
      );
    });

    it('should handle invalid simulatorId parameter', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'error: Unable to find a destination matching the provided destination specifier',
      });

      const result = await build_simulator_idLogic(
        {
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorId: 'invalid-uuid',
        },
        mockExecutor,
      );

      // Invalid simulatorId causes build failure
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unable to find a destination');
    });
  });

  describe('Command Generation', () => {
    it('should generate correct xcodebuild command with minimal parameters', async () => {
      let capturedCommand: string[] = [];
      const mockExecutor = createMockExecutor({ success: true, output: 'BUILD SUCCEEDED' });

      // Override the executor to capture the command
      const spyExecutor = async (command: string[]) => {
        capturedCommand = command;
        return mockExecutor(command);
      };

      const result = await build_simulator_idLogic(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
        },
        spyExecutor,
      );

      expect(capturedCommand).toEqual([
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
    });

    it('should generate correct xcodebuild command with all parameters', async () => {
      let capturedCommand: string[] = [];
      const mockExecutor = createMockExecutor({ success: true, output: 'BUILD SUCCEEDED' });

      // Override the executor to capture the command
      const spyExecutor = async (command: string[]) => {
        capturedCommand = command;
        return mockExecutor(command);
      };

      const result = await build_simulator_idLogic(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
          configuration: 'Release',
          derivedDataPath: '/custom/derived',
          extraArgs: ['--verbose'],
        },
        spyExecutor,
      );

      expect(capturedCommand).toEqual([
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
    });

    it('should handle paths with spaces in command generation', async () => {
      let capturedCommand: string[] = [];
      const mockExecutor = createMockExecutor({ success: true, output: 'BUILD SUCCEEDED' });

      // Override the executor to capture the command
      const spyExecutor = async (command: string[]) => {
        capturedCommand = command;
        return mockExecutor(command);
      };

      const result = await build_simulator_idLogic(
        {
          workspacePath: '/Users/dev/My Project/MyProject.xcworkspace',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
        },
        spyExecutor,
      );

      expect(capturedCommand).toEqual([
        'xcodebuild',
        '-workspace',
        '/Users/dev/My Project/MyProject.xcworkspace',
        '-scheme',
        'MyScheme',
        '-configuration',
        'Debug',
        '-skipMacroValidation',
        '-destination',
        'platform=iOS Simulator,id=test-uuid-123',
        'build',
      ]);
    });

    it('should generate correct xcodebuild command with projectPath', async () => {
      let capturedCommand: string[] = [];
      const mockExecutor = createMockExecutor({ success: true, output: 'BUILD SUCCEEDED' });

      // Override the executor to capture the command
      const spyExecutor = async (command: string[]) => {
        capturedCommand = command;
        return mockExecutor(command);
      };

      const result = await build_simulator_idLogic(
        {
          projectPath: '/path/to/MyProject.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
        },
        spyExecutor,
      );

      expect(capturedCommand).toEqual([
        'xcodebuild',
        '-project',
        '/path/to/MyProject.xcodeproj',
        '-scheme',
        'MyScheme',
        '-configuration',
        'Debug',
        '-skipMacroValidation',
        '-destination',
        'platform=iOS Simulator,id=test-uuid-123',
        'build',
      ]);
    });

    it('should use default configuration when not provided', async () => {
      let capturedCommand: string[] = [];
      const mockExecutor = createMockExecutor({ success: true, output: 'BUILD SUCCEEDED' });

      // Override the executor to capture the command
      const spyExecutor = async (command: string[]) => {
        capturedCommand = command;
        return mockExecutor(command);
      };

      const result = await build_simulator_idLogic(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
          // configuration intentionally omitted
        },
        spyExecutor,
      );

      expect(capturedCommand).toContain('-configuration');
      expect(capturedCommand).toContain('Debug');
    });
  });

  describe('Response Processing', () => {
    it('should handle successful build', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'BUILD SUCCEEDED',
      });

      const result = await build_simulator_idLogic(
        {
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
        },
        mockExecutor,
      );

      expect(result.isError).toBeUndefined();
      expect(result.content).toEqual([
        { type: 'text', text: '✅ iOS Simulator Build build succeeded for scheme MyScheme.' },
        { type: 'text', text: expect.stringContaining('Next Steps:') },
      ]);
    });

    it('should handle build failure', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'error: Build input file cannot be found',
      });

      const result = await build_simulator_idLogic(
        {
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
        },
        mockExecutor,
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('❌ [stderr]');
      expect(result.content[1].text).toBe(
        '❌ iOS Simulator Build build failed for scheme MyScheme.',
      );
    });

    it('should extract and format warnings from build output', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'warning: deprecated method used\nBUILD SUCCEEDED',
      });

      const result = await build_simulator_idLogic(
        {
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
        },
        mockExecutor,
      );

      expect(result.isError).toBeUndefined();
      expect(result.content).toEqual([
        { type: 'text', text: '⚠️ Warning: warning: deprecated method used' },
        { type: 'text', text: '✅ iOS Simulator Build build succeeded for scheme MyScheme.' },
        { type: 'text', text: expect.stringContaining('Next Steps:') },
      ]);
    });

    it('should handle command execution errors', async () => {
      const mockExecutor = async () => {
        throw new Error('spawn xcodebuild ENOENT');
      };

      const result = await build_simulator_idLogic(
        {
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error during iOS Simulator Build build: spawn xcodebuild ENOENT',
          },
        ],
        isError: true,
      });
    });

    it('should handle string errors from exceptions', async () => {
      const mockExecutor = async () => {
        throw 'String error message';
      };

      const result = await build_simulator_idLogic(
        {
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error during iOS Simulator Build build: String error message',
          },
        ],
        isError: true,
      });
    });
  });

  describe('Optional Parameters', () => {
    it('should handle useLatestOS parameter', async () => {
      let capturedCommand: string[] = [];
      const mockExecutor = createMockExecutor({ success: true, output: 'BUILD SUCCEEDED' });

      // Override the executor to capture the command
      const spyExecutor = async (command: string[]) => {
        capturedCommand = command;
        return mockExecutor(command);
      };

      const result = await build_simulator_idLogic(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
          useLatestOS: false,
        },
        spyExecutor,
      );

      // useLatestOS affects the internal behavior but may not directly appear in the command
      expect(capturedCommand).toContain('xcodebuild');
    });

    it('should handle preferXcodebuild parameter', async () => {
      let capturedCommand: string[] = [];
      const mockExecutor = createMockExecutor({ success: true, output: 'BUILD SUCCEEDED' });

      // Override the executor to capture the command
      const spyExecutor = async (command: string[]) => {
        capturedCommand = command;
        return mockExecutor(command);
      };

      const result = await build_simulator_idLogic(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
          preferXcodebuild: true,
        },
        spyExecutor,
      );

      // preferXcodebuild affects internal routing but command should still contain xcodebuild
      expect(capturedCommand).toContain('xcodebuild');
    });
  });
});
