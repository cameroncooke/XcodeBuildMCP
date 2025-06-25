/**
 * Clean Tools Tests - Comprehensive test coverage for clean build products tools
 *
 * This test file provides complete coverage for the clean.ts tools:
 * - cleanWorkspace: Clean build products for workspace
 * - cleanProject: Clean build products for project
 *
 * Tests follow the canonical testing patterns from CLAUDE.md with deterministic
 * response validation and comprehensive parameter testing.
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { cleanWorkspace, cleanProject } from './index.js';
import { executeXcodeBuildCommand } from '../../utils/build-utils.js';
import { XcodePlatform } from '../../utils/xcode.js';

// Mock child_process to prevent real command execution
vi.mock('child_process', () => ({ spawn: vi.fn() }));

// Mock fs to prevent file system access during tests
vi.mock('fs', () => ({
  existsSync: vi.fn(() => true),
}));

// Mock the build utilities
vi.mock('../../utils/build-utils.js', () => ({
  executeXcodeBuildCommand: vi.fn(),
}));

// Mock the logger to prevent logging during tests
vi.mock('../../utils/logger.js', () => ({
  log: vi.fn(),
}));

describe('clean tests', () => {
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

  describe('cleanWorkspace parameter validation', () => {
    it('should reject missing workspacePath parameter', async () => {
      await expect(cleanWorkspace({})).rejects.toThrow();
    });

    it('should reject undefined workspacePath parameter', async () => {
      await expect(cleanWorkspace({ workspacePath: undefined as any })).rejects.toThrow();
    });

    it('should reject null workspacePath parameter', async () => {
      await expect(cleanWorkspace({ workspacePath: null as any })).rejects.toThrow();
    });

    it('should reject non-string workspacePath parameter', async () => {
      await expect(cleanWorkspace({ workspacePath: 123 as any })).rejects.toThrow();
    });

    it('should accept valid workspacePath without optional parameters', async () => {
      const result = await cleanWorkspace({
        workspacePath: '/path/to/MyProject.xcworkspace',
      });
      expect(result.isError).toBe(false);
    });

    it('should accept all optional parameters', async () => {
      const result = await cleanWorkspace({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
        configuration: 'Release',
        derivedDataPath: '/path/to/derived/data',
        extraArgs: ['--verbose'],
      });
      expect(result.isError).toBe(false);
    });
  });

  describe('cleanProject parameter validation', () => {
    it('should reject missing projectPath parameter', async () => {
      await expect(cleanProject({})).rejects.toThrow();
    });

    it('should reject undefined projectPath parameter', async () => {
      await expect(cleanProject({ projectPath: undefined as any })).rejects.toThrow();
    });

    it('should reject null projectPath parameter', async () => {
      await expect(cleanProject({ projectPath: null as any })).rejects.toThrow();
    });

    it('should reject non-string projectPath parameter', async () => {
      await expect(cleanProject({ projectPath: 123 as any })).rejects.toThrow();
    });

    it('should accept valid projectPath without optional parameters', async () => {
      const result = await cleanProject({
        projectPath: '/path/to/MyProject.xcodeproj',
      });
      expect(result.isError).toBe(false);
    });

    it('should accept all optional parameters', async () => {
      const result = await cleanProject({
        projectPath: '/path/to/MyProject.xcodeproj',
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
      const result = await cleanWorkspace({
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
      const result = await cleanWorkspace({
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

      const result = await cleanWorkspace({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
      });

      expect(result.content).toEqual([
        { type: 'text', text: '❌ Clean failed for scheme MyScheme.' },
      ]);
      expect(result.isError).toBe(true);
    });
  });

  describe('cleanProject success scenarios', () => {
    it('should clean project successfully with minimal parameters', async () => {
      const result = await cleanProject({
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
      const result = await cleanProject({
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

      const result = await cleanProject({
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
    it('should handle executeXcodeBuildCommand throwing an exception for workspace', async () => {
      // Mock executeXcodeBuildCommand to throw an error
      mockExecuteXcodeBuildCommand.mockRejectedValue(new Error('Build utils execution failed'));

      await expect(
        cleanWorkspace({
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
        }),
      ).rejects.toThrow('Build utils execution failed');
    });

    it('should handle executeXcodeBuildCommand throwing an exception for project', async () => {
      // Mock executeXcodeBuildCommand to throw an error
      mockExecuteXcodeBuildCommand.mockRejectedValue(new Error('Build utils execution failed'));

      await expect(
        cleanProject({
          projectPath: '/path/to/MyProject.xcodeproj',
          scheme: 'MyScheme',
        }),
      ).rejects.toThrow('Build utils execution failed');
    });

    it('should handle default scheme and configuration correctly for workspace', async () => {
      await cleanWorkspace({
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

    it('should handle default scheme and configuration correctly for project', async () => {
      await cleanProject({
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
