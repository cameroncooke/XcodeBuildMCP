import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../../../utils/command.js';

// Import the plugin and logic function
import buildSimIdWs, { build_sim_id_wsLogic } from '../build_sim_id_ws.ts';

describe('build_sim_id_ws tool', () => {
  // Only clear any remaining mocks if needed

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(buildSimIdWs.name).toBe('build_sim_id_ws');
    });

    it('should have correct description', () => {
      expect(buildSimIdWs.description).toBe(
        "Builds an app from a workspace for a specific simulator by UUID. IMPORTANT: Requires workspacePath, scheme, and simulatorId. Example: build_sim_id_ws({ workspacePath: '/path/to/MyProject.xcworkspace', scheme: 'MyScheme', simulatorId: 'SIMULATOR_UUID' })",
      );
    });

    it('should have handler function', () => {
      expect(typeof buildSimIdWs.handler).toBe('function');
    });

    it('should have correct schema with required and optional fields', () => {
      const schema = z.object(buildSimIdWs.schema);

      // Valid inputs
      expect(
        schema.safeParse({
          workspacePath: '/path/to/workspace',
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

  describe('Parameter Validation', () => {
    it('should handle missing workspacePath parameter', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: 'Build succeeded' });

      const result = await build_sim_id_wsLogic(
        {
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
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

      const result = await build_sim_id_wsLogic(
        {
          workspacePath: '',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
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

      const result = await build_sim_id_wsLogic(
        {
          workspacePath: '/path/to/workspace',
          simulatorId: 'test-uuid-123',
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

      const result = await build_sim_id_wsLogic(
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
          text: '✅ Build build succeeded for scheme .',
        },
        {
          type: 'text',
          text: expect.stringContaining('Next Steps:'),
        },
      ]);
    });

    it('should handle missing simulatorId parameter', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: 'Build succeeded' });

      const result = await build_sim_id_wsLogic(
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
            text: "Required parameter 'simulatorId' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should handle empty simulatorId parameter', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'error: Unable to find a destination matching the provided destination specifier',
      });

      const result = await build_sim_id_wsLogic(
        {
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorId: '',
        },
        mockExecutor,
      );

      // Empty simulatorId passes validation but causes early failure in destination construction
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe(
        'For iOS Simulator platform, either simulatorId or simulatorName must be provided',
      );
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

      const result = await build_sim_id_wsLogic(
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

      const result = await build_sim_id_wsLogic(
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

      const result = await build_sim_id_wsLogic(
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

    it('should use default configuration when not provided', async () => {
      let capturedCommand: string[] = [];
      const mockExecutor = createMockExecutor({ success: true, output: 'BUILD SUCCEEDED' });

      // Override the executor to capture the command
      const spyExecutor = async (command: string[]) => {
        capturedCommand = command;
        return mockExecutor(command);
      };

      const result = await build_sim_id_wsLogic(
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

      const result = await build_sim_id_wsLogic(
        {
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
        },
        mockExecutor,
      );

      expect(result.isError).toBeUndefined();
      expect(result.content).toEqual([
        { type: 'text', text: '✅ Build build succeeded for scheme MyScheme.' },
        { type: 'text', text: expect.stringContaining('Next Steps:') },
      ]);
    });

    it('should handle build failure', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'error: Build input file cannot be found',
      });

      const result = await build_sim_id_wsLogic(
        {
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
        },
        mockExecutor,
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('❌ [stderr]');
      expect(result.content[1].text).toBe('❌ Build build failed for scheme MyScheme.');
    });

    it('should extract and format warnings from build output', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'warning: deprecated method used\nBUILD SUCCEEDED',
      });

      const result = await build_sim_id_wsLogic(
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
        { type: 'text', text: '✅ Build build succeeded for scheme MyScheme.' },
        { type: 'text', text: expect.stringContaining('Next Steps:') },
      ]);
    });

    it('should handle command execution errors', async () => {
      const mockExecutor = async () => {
        throw new Error('spawn xcodebuild ENOENT');
      };

      const result = await build_sim_id_wsLogic(
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
            text: 'Error during Build build: spawn xcodebuild ENOENT',
          },
        ],
        isError: true,
      });
    });

    it('should handle string errors from exceptions', async () => {
      const mockExecutor = async () => {
        throw 'String error message';
      };

      const result = await build_sim_id_wsLogic(
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
            text: 'Error during Build build: String error message',
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

      const result = await build_sim_id_wsLogic(
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

      const result = await build_sim_id_wsLogic(
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
