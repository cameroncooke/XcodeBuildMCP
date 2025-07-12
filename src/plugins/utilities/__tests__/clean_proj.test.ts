/**
 * Clean Project Plugin Tests - Test coverage for clean_proj tool
 *
 * This test file provides complete coverage for the clean_proj plugin tool:
 * - cleanProject: Clean build products for project
 *
 * Tests follow the canonical testing patterns from CLAUDE.md with deterministic
 * response validation and comprehensive parameter testing.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../../utils/command.js';
import cleanProj from '../clean_proj.ts';

describe('clean_proj plugin tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      });

      const result = await cleanProj.handler(
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
            text: '✅ Clean clean succeeded for scheme MyScheme.',
          },
        ],
      });

      expect(mockExecutor).toHaveBeenCalledWith(
        [
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
        'Clean',
        true,
        undefined,
      );
    });

    it('should return success response with all optional parameters', async () => {
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      // Simulate successful command execution
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Clean succeeded');
        mockProcess.emit('close', 0);
      }, 0);

      const result = await cleanProj.handler({
        projectPath: '/path/to/MyProject.xcodeproj',
        scheme: 'MyScheme',
        configuration: 'Release',
        derivedDataPath: '/path/to/derived/data',
        extraArgs: ['--verbose'],
        preferXcodebuild: true,
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ Clean clean succeeded for scheme MyScheme.',
          },
        ],
      });

      expect(mockSpawn).toHaveBeenCalledWith(
        'sh',
        [
          '-c',
          'xcodebuild -project /path/to/MyProject.xcodeproj -scheme MyScheme -configuration Release -skipMacroValidation -destination "platform=macOS" -derivedDataPath /path/to/derived/data --verbose clean',
        ],
        expect.any(Object),
      );
    });

    it('should return success response with minimal parameters and defaults', async () => {
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      // Simulate successful command execution
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Clean succeeded');
        mockProcess.emit('close', 0);
      }, 0);

      const result = await cleanProj.handler({
        projectPath: '/path/to/MyProject.xcodeproj',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ Clean clean succeeded for scheme .',
          },
        ],
      });

      expect(mockSpawn).toHaveBeenCalledWith(
        'sh',
        [
          '-c',
          'xcodebuild -project /path/to/MyProject.xcodeproj -scheme  -configuration Debug -skipMacroValidation -destination "platform=macOS" clean',
        ],
        expect.any(Object),
      );
    });

    it('should return error response for command failure', async () => {
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      // Simulate command failure
      setTimeout(() => {
        mockProcess.stderr.emit('data', 'Clean failed');
        mockProcess.emit('close', 1);
      }, 0);

      const result = await cleanProj.handler({
        projectPath: '/path/to/MyProject.xcodeproj',
        scheme: 'MyScheme',
      });

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
      const result = await cleanProj.handler({
        projectPath: null,
      });

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
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      // Simulate process error
      setTimeout(() => {
        mockProcess.emit('error', new Error('spawn failed'));
      }, 0);

      const result = await cleanProj.handler({
        projectPath: '/path/to/MyProject.xcodeproj',
        scheme: 'MyScheme',
      });

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
      const result = await cleanProj.handler({
        projectPath: 123, // Invalid type
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe("Expected string, received number at path 'projectPath'");
    });
  });
});
