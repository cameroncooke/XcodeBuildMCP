/**
 * Clean Workspace Plugin Tests - Comprehensive test coverage for clean_ws plugin
 *
 * This test file provides complete coverage for the clean_ws plugin:
 * - cleanWorkspace: Clean build products for workspace
 *
 * Tests follow the canonical testing patterns from CLAUDE.md with deterministic
 * response validation and comprehensive parameter testing.
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import cleanWs from './clean_ws.js';
import { executeXcodeBuildCommand } from '../../src/utils/build-utils.js';
import { XcodePlatform } from '../../src/utils/xcode.js';

// Mock child_process to prevent real command execution
vi.mock('child_process', () => ({ spawn: vi.fn() }));

// Mock fs to prevent file system access during tests
vi.mock('fs', () => ({
  existsSync: vi.fn(() => true),
}));

// Mock the build utilities
vi.mock('../../src/utils/build-utils.js', () => ({
  executeXcodeBuildCommand: vi.fn(),
}));

// Mock the logger to prevent logging during tests
vi.mock('../../src/utils/logger.js', () => ({
  log: vi.fn(),
}));

describe('clean_ws plugin tests', () => {
  let mockExecuteXcodeBuildCommand: MockedFunction<typeof executeXcodeBuildCommand>;

  beforeEach(() => {
    mockExecuteXcodeBuildCommand = vi.mocked(executeXcodeBuildCommand);

    // Default success behavior for executeXcodeBuildCommand
    mockExecuteXcodeBuildCommand.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: '✅ Clean succeeded for scheme MyScheme.',
        },
      ],
      isError: false,
    });

    vi.clearAllMocks();
  });

  describe('plugin structure', () => {
    it('should have correct plugin structure', () => {
      expect(cleanWs).toHaveProperty('name');
      expect(cleanWs).toHaveProperty('description');
      expect(cleanWs).toHaveProperty('schema');
      expect(cleanWs).toHaveProperty('handler');
      expect(cleanWs.name).toBe('clean_ws');
      expect(typeof cleanWs.handler).toBe('function');
    });
  });

  describe('cleanWorkspace parameter validation', () => {
    it('should reject missing workspacePath parameter', async () => {
      await expect(cleanWs.handler({})).rejects.toThrow();
    });

    it('should reject undefined workspacePath parameter', async () => {
      await expect(cleanWs.handler({ workspacePath: undefined as any })).rejects.toThrow();
    });

    it('should reject null workspacePath parameter', async () => {
      await expect(cleanWs.handler({ workspacePath: null as any })).rejects.toThrow();
    });

    it('should reject non-string workspacePath parameter', async () => {
      await expect(cleanWs.handler({ workspacePath: 123 as any })).rejects.toThrow();
    });

    it('should accept valid workspacePath without optional parameters', async () => {
      const result = await cleanWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
      });
      expect(result.isError).toBe(false);
    });

    it('should accept all optional parameters', async () => {
      const result = await cleanWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
        configuration: 'Release',
        derivedDataPath: '/path/to/derived/data',
        extraArgs: ['--verbose'],
      });
      expect(result.isError).toBe(false);
    });
  });


  describe('cleanWorkspace success scenarios', () => {
    it('should clean workspace successfully with minimal parameters', async () => {
      const result = await cleanWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
      });

      expect(result.content).toEqual([
        { type: 'text', text: '✅ Clean succeeded for scheme MyScheme.' },
      ]);
      expect(result.isError).toBe(false);

      expect(mockExecuteXcodeBuildCommand).toHaveBeenCalledWith(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: '',
          configuration: 'Debug',
        },
        {
          platform: XcodePlatform.macOS,
          logPrefix: 'Clean',
        },
        false,
        'clean',
      );
    });

    it('should clean workspace successfully with all parameters', async () => {
      const result = await cleanWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
        configuration: 'Release',
        derivedDataPath: '/path/to/derived/data',
        extraArgs: ['--verbose'],
      });

      expect(result.content).toEqual([
        { type: 'text', text: '✅ Clean succeeded for scheme MyScheme.' },
      ]);
      expect(result.isError).toBe(false);

      expect(mockExecuteXcodeBuildCommand).toHaveBeenCalledWith(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
          configuration: 'Release',
          derivedDataPath: '/path/to/derived/data',
          extraArgs: ['--verbose'],
        },
        {
          platform: XcodePlatform.macOS,
          logPrefix: 'Clean',
        },
        false,
        'clean',
      );
    });

    it('should handle command failure for workspace clean', async () => {
      // Mock command failure
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: '❌ Clean failed for scheme MyScheme.' }],
        isError: true,
      });

      const result = await cleanWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
      });

      expect(result.content).toEqual([
        { type: 'text', text: '❌ Clean failed for scheme MyScheme.' },
      ]);
      expect(result.isError).toBe(true);
    });
  });


  describe('error handling edge cases', () => {
    it('should handle executeXcodeBuildCommand throwing an exception for workspace', async () => {
      // Mock executeXcodeBuildCommand to throw an error
      mockExecuteXcodeBuildCommand.mockRejectedValue(new Error('Build utils execution failed'));

      await expect(
        cleanWs.handler({
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
        }),
      ).rejects.toThrow('Build utils execution failed');
    });

    it('should handle default scheme and configuration correctly for workspace', async () => {
      await cleanWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
      });

      // Verify that empty scheme and Debug configuration are used as defaults
      expect(mockExecuteXcodeBuildCommand).toHaveBeenCalledWith(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: '',
          configuration: 'Debug',
        },
        {
          platform: XcodePlatform.macOS,
          logPrefix: 'Clean',
        },
        false,
        'clean',
      );
    });
  });
});
