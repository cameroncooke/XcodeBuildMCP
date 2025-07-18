/**
 * Clean Workspace Plugin Tests - Comprehensive test coverage for clean_ws plugin
 *
 * This test file provides complete coverage for the clean_ws plugin:
 * - cleanWorkspace: Clean build products for workspace
 *
 * Tests follow the canonical testing patterns from CLAUDE.md with deterministic
 * response validation and comprehensive parameter testing.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  createMockExecutor,
  createMockFileSystemExecutor,
  createNoopExecutor,
} from '../../../utils/command.js';
import cleanWs from '../clean_ws.ts';

describe('clean_ws plugin tests', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name field', () => {
      expect(cleanWs.name).toBe('clean_ws');
    });

    it('should have correct description field', () => {
      expect(cleanWs.description).toBe(
        "Cleans build products for a specific workspace using xcodebuild. IMPORTANT: Requires workspacePath. Scheme/Configuration are optional. Example: clean_ws({ workspacePath: '/path/to/MyProject.xcworkspace', scheme: 'MyScheme' })",
      );
    });

    it('should have handler as function', () => {
      expect(typeof cleanWs.handler).toBe('function');
    });

    it('should have valid schema with required fields', () => {
      const schema = z.object(cleanWs.schema);

      // Test valid input
      expect(
        schema.safeParse({
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
          configuration: 'Debug',
          derivedDataPath: '/path/to/derived/data',
          extraArgs: ['--verbose'],
        }).success,
      ).toBe(true);

      // Test minimal valid input
      expect(
        schema.safeParse({
          workspacePath: '/path/to/MyProject.xcworkspace',
        }).success,
      ).toBe(true);

      // Test invalid input - missing workspacePath
      expect(
        schema.safeParse({
          scheme: 'MyScheme',
        }).success,
      ).toBe(false);

      // Test invalid input - wrong type for workspacePath
      expect(
        schema.safeParse({
          workspacePath: 123,
        }).success,
      ).toBe(false);

      // Test invalid input - wrong type for extraArgs
      expect(
        schema.safeParse({
          workspacePath: '/path/to/MyProject.xcworkspace',
          extraArgs: 'not-an-array',
        }).success,
      ).toBe(false);
    });
  });

  describe('Command Generation', () => {
    it('should generate correct xcodebuild command for basic clean', async () => {
      let capturedCommand: string[] = [];
      const trackingExecutor = async (command: string[]) => {
        capturedCommand = command;
        return {
          success: true,
          output: 'Clean succeeded',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      await cleanWs.handler(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
        },
        trackingExecutor,
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
        'platform=macOS',
        'clean',
      ]);
    });

    it('should generate correct xcodebuild command with configuration', async () => {
      let capturedCommand: string[] = [];
      const trackingExecutor = async (command: string[]) => {
        capturedCommand = command;
        return {
          success: true,
          output: 'Clean succeeded',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      await cleanWs.handler(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
          configuration: 'Release',
        },
        trackingExecutor,
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
        'platform=macOS',
        'clean',
      ]);
    });

    it('should generate correct xcodebuild command with derived data path', async () => {
      let capturedCommand: string[] = [];
      const trackingExecutor = async (command: string[]) => {
        capturedCommand = command;
        return {
          success: true,
          output: 'Clean succeeded',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      await cleanWs.handler(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
          derivedDataPath: '/custom/derived/data',
        },
        trackingExecutor,
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
        'platform=macOS',
        '-derivedDataPath',
        '/custom/derived/data',
        'clean',
      ]);
    });

    it('should generate correct xcodebuild command with extra args', async () => {
      let capturedCommand: string[] = [];
      const trackingExecutor = async (command: string[]) => {
        capturedCommand = command;
        return {
          success: true,
          output: 'Clean succeeded',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      await cleanWs.handler(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
          extraArgs: ['--verbose', '--jobs', '4'],
        },
        trackingExecutor,
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
        'platform=macOS',
        '--verbose',
        '--jobs',
        '4',
        'clean',
      ]);
    });

    it('should generate correct xcodebuild command with all parameters', async () => {
      let capturedCommand: string[] = [];
      const trackingExecutor = async (command: string[]) => {
        capturedCommand = command;
        return {
          success: true,
          output: 'Clean succeeded',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      await cleanWs.handler(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
          configuration: 'Release',
          derivedDataPath: '/custom/derived/data',
          extraArgs: ['--verbose'],
        },
        trackingExecutor,
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
        'platform=macOS',
        '-derivedDataPath',
        '/custom/derived/data',
        '--verbose',
        'clean',
      ]);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return success response for valid clean workspace request', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Clean succeeded',
        error: undefined,
        process: { pid: 12345 },
      });

      const result = await cleanWs.handler(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
        },
        mockExecutor,
        createMockFileSystemExecutor(),
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ Clean clean succeeded for scheme MyScheme.',
          },
        ],
      });
    });

    it('should return success response with all optional parameters', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Clean succeeded',
        error: undefined,
        process: { pid: 12345 },
      });

      const result = await cleanWs.handler(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
          configuration: 'Release',
          derivedDataPath: '/path/to/derived/data',
          extraArgs: ['--verbose'],
        },
        mockExecutor,
        createMockFileSystemExecutor(),
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ Clean clean succeeded for scheme MyScheme.',
          },
        ],
      });
    });

    it('should return success response with minimal parameters and defaults', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Clean succeeded',
        error: undefined,
        process: { pid: 12345 },
      });

      const result = await cleanWs.handler(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
        },
        mockExecutor,
        createMockFileSystemExecutor(),
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ Clean clean succeeded for scheme .',
          },
        ],
      });
    });

    it('should return error response for command failure', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Clean failed',
      });

      const result = await cleanWs.handler(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
        },
        mockExecutor,
        createMockFileSystemExecutor(),
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ [stderr] Clean failed',
          },
          {
            type: 'text',
            text: '❌ Clean clean failed for scheme MyScheme.',
          },
        ],
        isError: true,
      });
    });

    it('should return error response for validation failure', async () => {
      const result = await cleanWs.handler(
        {
          workspacePath: null,
        },
        createNoopExecutor(),
        createMockFileSystemExecutor(),
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Expected string, received null at path 'workspacePath'",
          },
        ],
        isError: true,
      });
    });

    it('should handle spawn process error', async () => {
      const mockExecutor = createMockExecutor(new Error('spawn failed'));

      const result = await cleanWs.handler(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
        },
        mockExecutor,
        createMockFileSystemExecutor(),
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error during Clean clean: spawn failed',
          },
        ],
        isError: true,
      });
    });

    it('should handle invalid schema with zod validation', async () => {
      const result = await cleanWs.handler(
        {
          workspacePath: 123, // Invalid type
        },
        createNoopExecutor(),
        createMockFileSystemExecutor(),
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe(
        "Expected string, received number at path 'workspacePath'",
      );
    });
  });
});
