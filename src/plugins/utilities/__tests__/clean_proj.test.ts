/**
 * Clean Project Plugin Tests - Test coverage for clean_proj tool
 *
 * This test file provides complete coverage for the clean_proj plugin tool:
 * - cleanProject: Clean build products for project
 *
 * Tests follow the canonical testing patterns from CLAUDE.md with deterministic
 * response validation and comprehensive parameter testing.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  createMockExecutor,
  createMockFileSystemExecutor,
  createNoopExecutor,
} from '../../../utils/command.js';
import cleanProj, { clean_projLogic } from '../clean_proj.ts';

describe('clean_proj plugin tests', () => {
  let executorCalls: Array<{
    command: string[];
    logPrefix?: string;
    useShell?: boolean;
    env?: Record<string, string>;
  }>;

  beforeEach(() => {
    executorCalls = [];
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name field', () => {
      expect(cleanProj.name).toBe('clean_proj');
    });

    it('should have correct description field', () => {
      expect(cleanProj.description).toBe(
        "Cleans build products and intermediate files from a project. IMPORTANT: Requires projectPath. Example: clean_proj({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme' })",
      );
    });

    it('should have handler as function', () => {
      expect(typeof cleanProj.handler).toBe('function');
    });

    it('should have valid schema with required fields', () => {
      const schema = z.object(cleanProj.schema);

      // Test valid input
      expect(
        schema.safeParse({
          projectPath: '/path/to/MyProject.xcodeproj',
          scheme: 'MyScheme',
          configuration: 'Debug',
          derivedDataPath: '/path/to/derived/data',
          extraArgs: ['--verbose'],
          preferXcodebuild: true,
        }).success,
      ).toBe(true);

      // Test minimal valid input
      expect(
        schema.safeParse({
          projectPath: '/path/to/MyProject.xcodeproj',
        }).success,
      ).toBe(true);

      // Test invalid input - missing projectPath
      expect(
        schema.safeParse({
          scheme: 'MyScheme',
        }).success,
      ).toBe(false);

      // Test invalid input - wrong type for projectPath
      expect(
        schema.safeParse({
          projectPath: 123,
        }).success,
      ).toBe(false);

      // Test invalid input - wrong type for extraArgs
      expect(
        schema.safeParse({
          projectPath: '/path/to/MyProject.xcodeproj',
          extraArgs: 'not-an-array',
        }).success,
      ).toBe(false);

      // Test invalid input - wrong type for preferXcodebuild
      expect(
        schema.safeParse({
          projectPath: '/path/to/MyProject.xcodeproj',
          preferXcodebuild: 'not-a-boolean',
        }).success,
      ).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return success response for valid clean project request', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Clean succeeded',
        error: undefined,
        process: { pid: 12345 },
      });

      // Manual call tracking
      const trackingExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        executorCalls.push({ command, logPrefix, useShell, env });
        return await mockExecutor(command, logPrefix, useShell, env);
      };

      const result = await clean_projLogic(
        {
          projectPath: '/path/to/MyProject.xcodeproj',
          scheme: 'MyScheme',
        },
        trackingExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ Clean clean succeeded for scheme MyScheme.',
          },
        ],
      });

      expect(executorCalls).toEqual([
        {
          command: [
            'xcodebuild',
            '-project',
            '/path/to/MyProject.xcodeproj',
            '-scheme',
            'MyScheme',
            '-configuration',
            'Debug',
            '-skipMacroValidation',
            '-destination',
            'platform=macOS',
            'clean',
          ],
          logPrefix: 'Clean',
          useShell: true,
          env: undefined,
        },
      ]);
    });

    it('should return success response with all optional parameters', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Clean succeeded',
        error: undefined,
        process: { pid: 12345 },
      });

      // Manual call tracking
      const trackingExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        executorCalls.push({ command, logPrefix, useShell, env });
        return await mockExecutor(command, logPrefix, useShell, env);
      };

      const result = await clean_projLogic(
        {
          projectPath: '/path/to/MyProject.xcodeproj',
          scheme: 'MyScheme',
          configuration: 'Release',
          derivedDataPath: '/path/to/derived/data',
          extraArgs: ['--verbose'],
          preferXcodebuild: true,
        },
        trackingExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ Clean clean succeeded for scheme MyScheme.',
          },
        ],
      });

      expect(executorCalls).toEqual([
        {
          command: [
            'xcodebuild',
            '-project',
            '/path/to/MyProject.xcodeproj',
            '-scheme',
            'MyScheme',
            '-configuration',
            'Release',
            '-skipMacroValidation',
            '-destination',
            'platform=macOS',
            '-derivedDataPath',
            '/path/to/derived/data',
            '--verbose',
            'clean',
          ],
          logPrefix: 'Clean',
          useShell: true,
          env: undefined,
        },
      ]);
    });

    it('should return success response with minimal parameters and defaults', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Clean succeeded',
        error: undefined,
        process: { pid: 12345 },
      });

      // Manual call tracking
      const trackingExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        executorCalls.push({ command, logPrefix, useShell, env });
        return await mockExecutor(command, logPrefix, useShell, env);
      };

      const result = await clean_projLogic(
        {
          projectPath: '/path/to/MyProject.xcodeproj',
        },
        trackingExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ Clean clean succeeded for scheme .',
          },
        ],
      });

      expect(executorCalls).toEqual([
        {
          command: [
            'xcodebuild',
            '-project',
            '/path/to/MyProject.xcodeproj',
            '-scheme',
            '',
            '-configuration',
            'Debug',
            '-skipMacroValidation',
            '-destination',
            'platform=macOS',
            'clean',
          ],
          logPrefix: 'Clean',
          useShell: true,
          env: undefined,
        },
      ]);
    });

    it('should return error response for command failure', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'Clean failed',
        process: { pid: 12345 },
      });

      const result = await clean_projLogic(
        {
          projectPath: '/path/to/MyProject.xcodeproj',
          scheme: 'MyScheme',
        },
        mockExecutor,
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
      const result = await clean_projLogic(
        {
          projectPath: null,
        },
        createNoopExecutor(),
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Expected string, received null at path 'projectPath'",
          },
        ],
        isError: true,
      });
    });

    it('should handle spawn process error', async () => {
      const mockExecutor = createMockExecutor(new Error('spawn failed'));

      const result = await clean_projLogic(
        {
          projectPath: '/path/to/MyProject.xcodeproj',
          scheme: 'MyScheme',
        },
        mockExecutor,
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
      const result = await clean_projLogic(
        {
          projectPath: 123, // Invalid type
        },
        createNoopExecutor(),
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe("Expected string, received number at path 'projectPath'");
    });
  });
});
