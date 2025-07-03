/**
 * Clean Project Plugin Tests - Test coverage for clean_proj tool
 *
 * This test file provides complete coverage for the clean_proj plugin tool:
 * - cleanProject: Clean build products for project
 *
 * Tests follow the canonical testing patterns from CLAUDE.md with deterministic
 * response validation and comprehensive parameter testing.
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import cleanProj from './clean_proj.ts';
import { executeXcodeBuildCommand } from '../../src/utils/build-utils.ts';
import { XcodePlatform } from '../../src/utils/xcode.ts';

// Mock child_process to prevent real command execution
vi.mock('child_process', () => ({ spawn: vi.fn() }));

// Mock fs to prevent file system access during tests
vi.mock('fs', () => ({
  existsSync: vi.fn(() => true),
}));

// Mock the build utilities
vi.mock('../../src/utils/build-utils.ts', () => ({
  executeXcodeBuildCommand: vi.fn(),
}));

// Mock the logger to prevent logging during tests
vi.mock('../../src/utils/logger.ts', () => ({
  log: vi.fn(),
}));

describe('clean_proj plugin tests', () => {
  let mockExecuteXcodeBuildCommand: MockedFunction<typeof executeXcodeBuildCommand>;

  beforeEach(() => {
    vi.clearAllMocks();
    
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
  });

  describe('plugin structure', () => {
    it('should have correct plugin structure', () => {
      expect(cleanProj).toHaveProperty('name');
      expect(cleanProj).toHaveProperty('description');
      expect(cleanProj).toHaveProperty('schema');
      expect(cleanProj).toHaveProperty('handler');
      expect(cleanProj.name).toBe('clean_proj');
      expect(typeof cleanProj.handler).toBe('function');
    });
  });

  describe('cleanProject parameter validation', () => {
    it('should reject missing projectPath parameter', async () => {
      await expect(cleanProj.handler({})).rejects.toThrow();
    });

    it('should reject undefined projectPath parameter', async () => {
      await expect(cleanProj.handler({ projectPath: undefined as any })).rejects.toThrow();
    });

    it('should reject null projectPath parameter', async () => {
      await expect(cleanProj.handler({ projectPath: null as any })).rejects.toThrow();
    });

    it('should reject non-string projectPath parameter', async () => {
      await expect(cleanProj.handler({ projectPath: 123 as any })).rejects.toThrow();
    });

    it('should accept valid projectPath without optional parameters', async () => {
      const result = await cleanProj.handler({
        projectPath: '/path/to/MyProject.xcodeproj',
      });
      expect(result.isError).toBe(false);
    });

    it('should accept all optional parameters', async () => {
      const result = await cleanProj.handler({
        projectPath: '/path/to/MyProject.xcodeproj',
        scheme: 'MyScheme',
        configuration: 'Release',
        derivedDataPath: '/path/to/derived/data',
        extraArgs: ['--verbose'],
      });
      expect(result.isError).toBe(false);
    });
  });

  describe('cleanProject success scenarios', () => {
    it('should clean project successfully with minimal parameters', async () => {
      const result = await cleanProj.handler({
        projectPath: '/path/to/MyProject.xcodeproj',
      });

      expect(result.content).toEqual([
        { type: 'text', text: '✅ Clean succeeded for scheme MyScheme.' },
      ]);
      expect(result.isError).toBe(false);

      expect(mockExecuteXcodeBuildCommand).toHaveBeenCalledWith(
        {
          projectPath: '/path/to/MyProject.xcodeproj',
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

    it('should clean project successfully with all parameters', async () => {
      const result = await cleanProj.handler({
        projectPath: '/path/to/MyProject.xcodeproj',
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
          projectPath: '/path/to/MyProject.xcodeproj',
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

    it('should handle command failure for project clean', async () => {
      // Mock command failure
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: '❌ Clean failed for scheme MyScheme.' }],
        isError: true,
      });

      const result = await cleanProj.handler({
        projectPath: '/path/to/MyProject.xcodeproj',
        scheme: 'MyScheme',
      });

      expect(result.content).toEqual([
        { type: 'text', text: '❌ Clean failed for scheme MyScheme.' },
      ]);
      expect(result.isError).toBe(true);
    });
  });

  describe('error handling edge cases', () => {
    it('should handle executeXcodeBuildCommand throwing an exception for project', async () => {
      // Mock executeXcodeBuildCommand to throw an error
      mockExecuteXcodeBuildCommand.mockRejectedValue(new Error('Build utils execution failed'));

      await expect(
        cleanProj.handler({
          projectPath: '/path/to/MyProject.xcodeproj',
          scheme: 'MyScheme',
        }),
      ).rejects.toThrow('Build utils execution failed');
    });

    it('should handle default scheme and configuration correctly for project', async () => {
      await cleanProj.handler({
        projectPath: '/path/to/MyProject.xcodeproj',
      });

      // Verify that empty scheme and Debug configuration are used as defaults
      expect(mockExecuteXcodeBuildCommand).toHaveBeenCalledWith(
        {
          projectPath: '/path/to/MyProject.xcodeproj',
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