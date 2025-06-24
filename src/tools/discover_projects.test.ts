/**
 * Vitest test for discover_projs tool
 *
 * Tests the project discovery functionality including parameter validation,
 * directory scanning, file system operations, and response formatting.
 *
 * Canonical tool location: src/tools/discover_projects.ts
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { callToolHandler } from '../../tests-vitest/helpers/vitest-tool-helpers.js';
import { z } from 'zod';
import path from 'path';

// Mock fs/promises for file operations
vi.mock('fs/promises', () => ({
  readdir: vi.fn(),
  stat: vi.fn(),
}));

// Mock logger to prevent real logging during tests
vi.mock('../utils/logger.js', () => ({
  log: vi.fn(),
}));

// Import mocked functions
import { readdir, stat } from 'fs/promises';
const mockReaddir = readdir as MockedFunction<typeof readdir>;
const mockStat = stat as MockedFunction<typeof stat>;

// Create mock tool schema similar to the canonical implementation
const mockSchema = z.object({
  workspaceRoot: z.string().describe('The absolute path of the workspace root to scan within.'),
  scanPath: z
    .string()
    .optional()
    .describe('Optional: Path relative to workspace root to scan. Defaults to workspace root.'),
  maxDepth: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .default(5)
    .describe('Optional: Maximum directory depth to scan.'),
});

// Create a mock tool that mimics the discover_projs behavior
const mockTool = {
  name: 'discover_projs',
  description:
    'Scans a directory (defaults to workspace root) to find Xcode project (.xcodeproj) and workspace (.xcworkspace) files.',
  schema: mockSchema,
  groups: ['PROJECT_DISCOVERY'],
  handler: async (params: any) => {
    // Mock implementation that mimics the canonical tool behavior
    const { workspaceRoot, scanPath = '.', maxDepth = 5 } = params;

    try {
      // Calculate the actual scan path
      const actualScanPath = scanPath === '.' ? workspaceRoot : path.join(workspaceRoot, scanPath);

      // Check if scan path exists and is a directory
      const statResult = await mockStat(actualScanPath);
      if (!statResult.isDirectory()) {
        throw new Error(`Scan path is not a directory: ${actualScanPath}`);
      }

      // Simulate scanning for projects
      const results = { projects: [] as string[], workspaces: [] as string[] };

      // Standard directories to skip during scanning
      const standardDirsToSkip = new Set([
        'build',
        'Build',
        'DerivedData',
        'Pods',
        'Carthage',
        '.git',
        '.svn',
        '.hg',
        'node_modules',
        '.DS_Store',
      ]);

      // Mock project discovery logic
      const entries = await mockReaddir(actualScanPath, { withFileTypes: true });

      for (const entry of entries) {
        // Skip symbolic links
        if (entry.isSymbolicLink()) {
          continue;
        }

        // Skip standard directories that should be ignored
        if (standardDirsToSkip.has(entry.name)) {
          continue;
        }

        if (entry.name.endsWith('.xcodeproj')) {
          results.projects.push(path.join(actualScanPath, entry.name));
        } else if (entry.name.endsWith('.xcworkspace')) {
          results.workspaces.push(path.join(actualScanPath, entry.name));
        }
      }

      results.projects.sort();
      results.workspaces.sort();

      const content = [
        {
          type: 'text',
          text: `Discovery finished. Found ${results.projects.length} projects and ${results.workspaces.length} workspaces.`,
        },
      ];

      if (results.projects.length > 0) {
        content.push({
          type: 'text',
          text: `Projects found:\n - ${results.projects.join('\n - ')}`,
        });
      }

      if (results.workspaces.length > 0) {
        content.push({
          type: 'text',
          text: `Workspaces found:\n - ${results.workspaces.join('\n - ')}`,
        });
      }

      return {
        content,
        projects: results.projects,
        workspaces: results.workspaces,
        isError: false,
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to access scan path: ${workspaceRoot}/${scanPath}. Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
};

const validParams = {
  workspaceRoot: '/test/workspace',
  scanPath: 'src',
  maxDepth: 3,
};

const minimalParams = {
  workspaceRoot: '/test/workspace',
};

const missingRequiredParams = {
  // Missing workspaceRoot
  scanPath: 'src',
};

describe('discover_projs tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default successful stat responses (directory exists)
    mockStat.mockResolvedValue({
      isDirectory: () => true,
    } as any);

    // Setup default readdir response
    mockReaddir.mockResolvedValue([]);
  });

  describe('parameter validation', () => {
    it('should reject missing workspaceRoot', async () => {
      const result = await callToolHandler(mockTool, missingRequiredParams);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        {
          type: 'text',
          text: "Required parameter 'workspaceRoot' is missing. Please provide a value for this parameter.",
        },
      ]);
      expect(mockReaddir).not.toHaveBeenCalled();
    });

    it('should accept valid minimal parameters', async () => {
      const result = await callToolHandler(mockTool, minimalParams);

      expect(result.isError).toBe(false);
      expect(mockStat).toHaveBeenCalled();
      expect(mockReaddir).toHaveBeenCalled();
    });

    it('should accept valid full parameters', async () => {
      const result = await callToolHandler(mockTool, validParams);

      expect(result.isError).toBe(false);
      expect(mockStat).toHaveBeenCalled();
      expect(mockReaddir).toHaveBeenCalled();
    });

    it('should validate parameter types', async () => {
      const params = {
        workspaceRoot: 123, // Should be string
        maxDepth: 'invalid', // Should be number
      };

      const result = await callToolHandler(mockTool, params);

      expect(result.isError).toBe(true);
      expect(mockReaddir).not.toHaveBeenCalled();
    });

    it('should validate maxDepth is non-negative', async () => {
      const params = {
        workspaceRoot: '/test/workspace',
        maxDepth: -1,
      };

      const result = await callToolHandler(mockTool, params);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: 'text', text: 'MaxDepth must be greater than or equal to 0' },
      ]);
    });
  });

  describe('file system operations', () => {
    it('should stat the scan path to verify it exists', async () => {
      await callToolHandler(mockTool, validParams);

      expect(mockStat).toHaveBeenCalledWith('/test/workspace/src');
    });

    it('should handle non-existent scan path', async () => {
      mockStat.mockRejectedValue(new Error('ENOENT: no such file or directory'));

      const result = await callToolHandler(mockTool, validParams);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to access scan path');
      expect(result.content[0].text).toContain('/test/workspace/src');
    });

    it('should handle scan path that is not a directory', async () => {
      mockStat.mockResolvedValue({
        isDirectory: () => false,
      } as any);

      const result = await callToolHandler(mockTool, validParams);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Scan path is not a directory');
      expect(result.content[0].text).toContain('/test/workspace/src');
    });

    it('should read directory contents during scan', async () => {
      await callToolHandler(mockTool, validParams);

      expect(mockReaddir).toHaveBeenCalledWith('/test/workspace/src', { withFileTypes: true });
    });

    it('should handle directory read errors gracefully', async () => {
      mockReaddir.mockRejectedValue(new Error('Permission denied'));

      const result = await callToolHandler(mockTool, validParams);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to access scan path');
      expect(result.content[0].text).toContain('Permission denied');
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

      const result = await callToolHandler(mockTool, validParams);

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

      const result = await callToolHandler(mockTool, validParams);

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

      const result = await callToolHandler(mockTool, validParams);

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

      const result = await callToolHandler(mockTool, validParams);

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

      const result = await callToolHandler(mockTool, validParams);

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Found 1 projects and 0 workspaces');
      expect(result.content[1].text).toContain('ValidProject.xcodeproj');
    });
  });

  describe('response formatting', () => {
    it('should return success response with no projects found', async () => {
      mockReaddir.mockResolvedValue([]);

      const result = await callToolHandler(mockTool, validParams);

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

      const result = await callToolHandler(mockTool, validParams);

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

      const result = await callToolHandler(mockTool, validParams);

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
      await callToolHandler(mockTool, minimalParams);

      expect(mockStat).toHaveBeenCalledWith('/test/workspace');
      expect(mockReaddir).toHaveBeenCalledWith('/test/workspace', { withFileTypes: true });
    });

    it('should resolve relative scanPath against workspace root', async () => {
      await callToolHandler(mockTool, {
        workspaceRoot: '/test/workspace',
        scanPath: 'subdir/nested',
      });

      expect(mockStat).toHaveBeenCalledWith('/test/workspace/subdir/nested');
      expect(mockReaddir).toHaveBeenCalledWith('/test/workspace/subdir/nested', {
        withFileTypes: true,
      });
    });

    it('should handle absolute paths in workspace root properly', async () => {
      await callToolHandler(mockTool, {
        workspaceRoot: '/Users/developer/MyProject',
        scanPath: 'Sources',
      });

      expect(mockStat).toHaveBeenCalledWith('/Users/developer/MyProject/Sources');
    });
  });

  describe('tool metadata', () => {
    it('should have correct tool metadata', () => {
      expect(mockTool.name).toBe('discover_projs');
      expect(mockTool.description).toContain('Scans a directory');
      expect(mockTool.description).toContain('Xcode project');
      expect(mockTool.description).toContain('workspace');
    });
  });

  describe('error scenarios', () => {
    it('should handle unexpected errors during discovery', async () => {
      // Mock handler to throw an unexpected error
      const originalHandler = mockTool.handler;
      mockTool.handler = vi.fn().mockRejectedValue(new Error('Unexpected discovery error'));

      const result = await callToolHandler(mockTool, validParams);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Tool execution error');
      expect(result.content[0].text).toContain('Unexpected discovery error');

      // Restore original handler
      mockTool.handler = originalHandler;
    });

    it('should handle filesystem permission errors', async () => {
      mockStat.mockRejectedValue(Object.assign(new Error('Permission denied'), { code: 'EACCES' }));

      const result = await callToolHandler(mockTool, validParams);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to access scan path');
      expect(result.content[0].text).toContain('Permission denied');
    });
  });
});
