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
import { EventEmitter } from 'events';
import cleanWs from '../clean_ws.ts';

// Mock only child_process.spawn at the lowest level
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

describe('clean_ws plugin tests', () => {
  // Mock child process for command execution
  class MockChildProcess extends EventEmitter {
    stdout = new EventEmitter();
    stderr = new EventEmitter();
    pid = 12345;
  }

  let mockSpawn: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Get the mocked spawn function
    const { spawn } = await import('child_process');
    mockSpawn = vi.mocked(spawn);
  });

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

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return success response for valid clean workspace request', async () => {
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      // Simulate successful command execution
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Clean succeeded');
        mockProcess.emit('close', 0);
      }, 0);

      const result = await cleanWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
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
          'xcodebuild -workspace /path/to/MyProject.xcworkspace -scheme MyScheme -configuration Debug -skipMacroValidation -destination "platform=macOS" clean',
        ],
        expect.any(Object),
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

      const result = await cleanWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
        configuration: 'Release',
        derivedDataPath: '/path/to/derived/data',
        extraArgs: ['--verbose'],
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
          'xcodebuild -workspace /path/to/MyProject.xcworkspace -scheme MyScheme -configuration Release -skipMacroValidation -destination "platform=macOS" -derivedDataPath /path/to/derived/data --verbose clean',
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

      const result = await cleanWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
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
          'xcodebuild -workspace /path/to/MyProject.xcworkspace -scheme  -configuration Debug -skipMacroValidation -destination "platform=macOS" clean',
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

      const result = await cleanWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
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
      const result = await cleanWs.handler({
        workspacePath: null,
      });

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
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      // Simulate process error
      setTimeout(() => {
        mockProcess.emit('error', new Error('spawn failed'));
      }, 0);

      const result = await cleanWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
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
      const result = await cleanWs.handler({
        workspacePath: 123, // Invalid type
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe(
        "Expected string, received number at path 'workspacePath'",
      );
    });
  });
});
