/**
 * Discover Projects Tests - Comprehensive test coverage for project discovery tools
 *
 * This test file provides complete coverage for the discover_projects.ts tools:
 * - discoverProjects: Find Xcode projects and workspaces in a directory
 *
 * Tests follow the canonical testing patterns from CLAUDE.md with deterministic
 * response validation and comprehensive parameter testing.
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { discoverProjects } from './index.js';

// Mock fs/promises for file operations
vi.mock('node:fs/promises', () => ({
  default: {
    readdir: vi.fn(),
    stat: vi.fn(),
  },
}));

// Mock logger to prevent real logging during tests
vi.mock('../../utils/logger.js', () => ({
  log: vi.fn(),
}));

describe('discover_projects tests', () => {
  let mockReaddir: MockedFunction<any>;
  let mockStat: MockedFunction<any>;

  beforeEach(async () => {
    // Get the mocked fs module
    const fs = await import('node:fs/promises');
    mockReaddir = vi.mocked(fs.default.readdir);
    mockStat = vi.mocked(fs.default.stat);

    // Setup default successful stat responses (directory exists)
    mockStat.mockResolvedValue({
      isDirectory: () => true,
    } as any);

    // Setup default readdir response
    mockReaddir.mockResolvedValue([]);

    vi.clearAllMocks();
  });

  describe('discoverProjects parameter validation', () => {
    it('should reject missing workspaceRoot parameter', async () => {
      await expect(discoverProjects({})).rejects.toThrow();
    });

    it('should reject undefined workspaceRoot parameter', async () => {
      await expect(discoverProjects({ workspaceRoot: undefined as any })).rejects.toThrow();
    });

    it('should reject null workspaceRoot parameter', async () => {
      await expect(discoverProjects({ workspaceRoot: null as any })).rejects.toThrow();
    });

    it('should reject non-string workspaceRoot parameter', async () => {
      await expect(discoverProjects({ workspaceRoot: 123 as any })).rejects.toThrow();
    });

    it('should accept valid minimal parameters', async () => {
      const result = await discoverProjects({
        workspaceRoot: '/test/workspace',
      });

      expect(result.isError).toBe(false);
      expect(mockStat).toHaveBeenCalled();
      expect(mockReaddir).toHaveBeenCalled();
    });

    it('should accept valid full parameters', async () => {
      const result = await discoverProjects({
        workspaceRoot: '/test/workspace',
        scanPath: 'src',
        maxDepth: 3,
      });

      expect(result.isError).toBe(false);
      expect(mockStat).toHaveBeenCalled();
      expect(mockReaddir).toHaveBeenCalled();
    });

    it('should validate maxDepth is non-negative', async () => {
      await expect(
        discoverProjects({
          workspaceRoot: '/test/workspace',
          maxDepth: -1,
        }),
      ).rejects.toThrow();
    });
  });

  describe('file system operations', () => {
    it('should stat the scan path to verify it exists', async () => {
      await discoverProjects({
        workspaceRoot: '/test/workspace',
        scanPath: 'src',
      });

      expect(mockStat).toHaveBeenCalledWith('/test/workspace/src');
    });

    it('should handle non-existent scan path', async () => {
      mockStat.mockRejectedValue(new Error('ENOENT: no such file or directory'));

      const result = await discoverProjects({
        workspaceRoot: '/test/workspace',
        scanPath: 'src',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to access scan path');
      expect(result.content[0].text).toContain('/test/workspace/src');
    });

    it('should handle scan path that is not a directory', async () => {
      mockStat.mockResolvedValue({
        isDirectory: () => false,
      } as any);

      const result = await discoverProjects({
        workspaceRoot: '/test/workspace',
        scanPath: 'src',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Scan path is not a directory');
      expect(result.content[0].text).toContain('/test/workspace/src');
    });

    it('should read directory contents during scan', async () => {
      await discoverProjects({
        workspaceRoot: '/test/workspace',
        scanPath: 'src',
      });

      expect(mockReaddir).toHaveBeenCalledWith('/test/workspace/src', { withFileTypes: true });
    });

    it('should handle directory read errors gracefully', async () => {
      mockReaddir.mockRejectedValue(new Error('Permission denied'));

      const result = await discoverProjects({
        workspaceRoot: '/test/workspace',
        scanPath: 'src',
      });

      expect(result.isError).toBe(false); // The tool continues despite read errors
      expect(result.content[0].text).toContain(
        'Discovery finished. Found 0 projects and 0 workspaces.',
      );
    });
  });

  describe('project discovery', () => {
    it('should find .xcodeproj files', async () => {
      mockReaddir.mockResolvedValue([
        {
          name: 'MyApp.xcodeproj',
          isDirectory: () => true,
          isSymbolicLink: () => false,
        },
        {
          name: 'SomeFile.swift',
          isDirectory: () => false,
          isSymbolicLink: () => false,
        },
      ] as any);

      const result = await discoverProjects({
        workspaceRoot: '/test/workspace',
        scanPath: 'src',
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Found 1 projects and 0 workspaces');
      expect(result.content[1].text).toContain('Projects found:');
      expect(result.content[1].text).toContain('/test/workspace/src/MyApp.xcodeproj');
    });

    it('should find .xcworkspace files', async () => {
      mockReaddir.mockResolvedValue([
        {
          name: 'MyApp.xcworkspace',
          isDirectory: () => true,
          isSymbolicLink: () => false,
        },
      ] as any);

      const result = await discoverProjects({
        workspaceRoot: '/test/workspace',
        scanPath: 'src',
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Found 0 projects and 1 workspaces');
      expect(result.content[1].text).toContain('Workspaces found:');
      expect(result.content[1].text).toContain('/test/workspace/src/MyApp.xcworkspace');
    });

    it('should find both projects and workspaces', async () => {
      mockReaddir.mockResolvedValue([
        {
          name: 'MyApp.xcodeproj',
          isDirectory: () => true,
          isSymbolicLink: () => false,
        },
        {
          name: 'MyWorkspace.xcworkspace',
          isDirectory: () => true,
          isSymbolicLink: () => false,
        },
      ] as any);

      const result = await discoverProjects({
        workspaceRoot: '/test/workspace',
        scanPath: 'src',
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Found 1 projects and 1 workspaces');
      expect(result.content[1].text).toContain('Projects found:');
      expect(result.content[1].text).toContain('/test/workspace/src/MyApp.xcodeproj');
      expect(result.content[2].text).toContain('Workspaces found:');
      expect(result.content[2].text).toContain('/test/workspace/src/MyWorkspace.xcworkspace');
    });

    it('should skip symbolic links', async () => {
      mockReaddir.mockResolvedValue([
        {
          name: 'MyApp.xcodeproj',
          isDirectory: () => true,
          isSymbolicLink: () => true, // Should be skipped
        },
        {
          name: 'RealApp.xcodeproj',
          isDirectory: () => true,
          isSymbolicLink: () => false,
        },
      ] as any);

      const result = await discoverProjects({
        workspaceRoot: '/test/workspace',
        scanPath: 'src',
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Found 1 projects and 0 workspaces');
      expect(result.content[1].text).not.toContain('MyApp.xcodeproj');
      expect(result.content[1].text).toContain('RealApp.xcodeproj');
    });

    it('should skip standard directories', async () => {
      mockReaddir.mockResolvedValue([
        {
          name: 'build',
          isDirectory: () => true,
          isSymbolicLink: () => false,
        },
        {
          name: 'DerivedData',
          isDirectory: () => true,
          isSymbolicLink: () => false,
        },
        {
          name: 'Pods',
          isDirectory: () => true,
          isSymbolicLink: () => false,
        },
        {
          name: '.git',
          isDirectory: () => true,
          isSymbolicLink: () => false,
        },
        {
          name: 'node_modules',
          isDirectory: () => true,
          isSymbolicLink: () => false,
        },
        {
          name: 'ValidProject.xcodeproj',
          isDirectory: () => true,
          isSymbolicLink: () => false,
        },
      ] as any);

      const result = await discoverProjects({
        workspaceRoot: '/test/workspace',
        scanPath: 'src',
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Found 1 projects and 0 workspaces');
      expect(result.content[1].text).toContain('ValidProject.xcodeproj');
    });
  });

  describe('response formatting', () => {
    it('should return success response with no projects found', async () => {
      mockReaddir.mockResolvedValue([]);

      const result = await discoverProjects({
        workspaceRoot: '/test/workspace',
        scanPath: 'src',
      });

      expect(result.isError).toBe(false);
      expect(result.content).toEqual([
        { type: 'text', text: 'Discovery finished. Found 0 projects and 0 workspaces.' },
      ]);
      expect(result.projects).toEqual([]);
      expect(result.workspaces).toEqual([]);
    });

    it('should include project and workspace arrays in response', async () => {
      mockReaddir.mockResolvedValue([
        {
          name: 'App.xcodeproj',
          isDirectory: () => true,
          isSymbolicLink: () => false,
        },
        {
          name: 'Workspace.xcworkspace',
          isDirectory: () => true,
          isSymbolicLink: () => false,
        },
      ] as any);

      const result = await discoverProjects({
        workspaceRoot: '/test/workspace',
        scanPath: 'src',
      });

      expect(result.isError).toBe(false);
      expect(result.projects).toEqual(['/test/workspace/src/App.xcodeproj']);
      expect(result.workspaces).toEqual(['/test/workspace/src/Workspace.xcworkspace']);
    });

    it('should sort results consistently', async () => {
      mockReaddir.mockResolvedValue([
        {
          name: 'ZApp.xcodeproj',
          isDirectory: () => true,
          isSymbolicLink: () => false,
        },
        {
          name: 'AApp.xcodeproj',
          isDirectory: () => true,
          isSymbolicLink: () => false,
        },
        {
          name: 'ZWorkspace.xcworkspace',
          isDirectory: () => true,
          isSymbolicLink: () => false,
        },
        {
          name: 'AWorkspace.xcworkspace',
          isDirectory: () => true,
          isSymbolicLink: () => false,
        },
      ] as any);

      const result = await discoverProjects({
        workspaceRoot: '/test/workspace',
        scanPath: 'src',
      });

      expect(result.isError).toBe(false);
      expect(result.projects).toEqual([
        '/test/workspace/src/AApp.xcodeproj',
        '/test/workspace/src/ZApp.xcodeproj',
      ]);
      expect(result.workspaces).toEqual([
        '/test/workspace/src/AWorkspace.xcworkspace',
        '/test/workspace/src/ZWorkspace.xcworkspace',
      ]);
    });
  });

  describe('path handling', () => {
    it('should default to workspace root when scanPath is not provided', async () => {
      await discoverProjects({
        workspaceRoot: '/test/workspace',
      });

      expect(mockStat).toHaveBeenCalledWith('/test/workspace');
      expect(mockReaddir).toHaveBeenCalledWith('/test/workspace', { withFileTypes: true });
    });

    it('should resolve relative scanPath against workspace root', async () => {
      await discoverProjects({
        workspaceRoot: '/test/workspace',
        scanPath: 'subdir/nested',
      });

      expect(mockStat).toHaveBeenCalledWith('/test/workspace/subdir/nested');
      expect(mockReaddir).toHaveBeenCalledWith('/test/workspace/subdir/nested', {
        withFileTypes: true,
      });
    });

    it('should handle absolute paths in workspace root properly', async () => {
      await discoverProjects({
        workspaceRoot: '/Users/developer/MyProject',
        scanPath: 'Sources',
      });

      expect(mockStat).toHaveBeenCalledWith('/Users/developer/MyProject/Sources');
    });
  });

  describe('error scenarios', () => {
    it('should handle filesystem permission errors', async () => {
      mockStat.mockRejectedValue(Object.assign(new Error('Permission denied'), { code: 'EACCES' }));

      const result = await discoverProjects({
        workspaceRoot: '/test/workspace',
        scanPath: 'src',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to access scan path');
      expect(result.content[0].text).toContain('Permission denied');
    });
  });
});
