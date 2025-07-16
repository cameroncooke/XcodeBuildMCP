/**
 * Pure dependency injection test for discover_projs plugin
 *
 * Tests the plugin structure and project discovery functionality
 * including parameter validation, file system operations, and response formatting.
 *
 * Uses createMockFileSystemExecutor for file system operations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import plugin from '../discover_projs.ts';
import { createMockFileSystemExecutor } from '../../../utils/index.js';

describe('discover_projs plugin', () => {
  let mockFileSystemExecutor: any;

  // Create mock file system executor
  mockFileSystemExecutor = createMockFileSystemExecutor({
    stat: async () => ({ isDirectory: () => true }),
    readdir: async () => [],
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(plugin.name).toBe('discover_projs');
    });

    it('should have correct description', () => {
      expect(plugin.description).toBe(
        'Scans a directory (defaults to workspace root) to find Xcode project (.xcodeproj) and workspace (.xcworkspace) files.',
      );
    });

    it('should have handler function', () => {
      expect(typeof plugin.handler).toBe('function');
    });

    it('should validate schema with valid inputs', () => {
      expect(plugin.schema.safeParse({ workspaceRoot: '/path/to/workspace' }).success).toBe(true);
      expect(
        plugin.schema.safeParse({ workspaceRoot: '/path/to/workspace', scanPath: 'subdir' })
          .success,
      ).toBe(true);
      expect(
        plugin.schema.safeParse({ workspaceRoot: '/path/to/workspace', maxDepth: 3 }).success,
      ).toBe(true);
      expect(
        plugin.schema.safeParse({
          workspaceRoot: '/path/to/workspace',
          scanPath: 'subdir',
          maxDepth: 5,
        }).success,
      ).toBe(true);
    });

    it('should validate schema with invalid inputs', () => {
      expect(plugin.schema.safeParse({}).success).toBe(false);
      expect(plugin.schema.safeParse({ workspaceRoot: 123 }).success).toBe(false);
      expect(plugin.schema.safeParse({ workspaceRoot: '/path', scanPath: 123 }).success).toBe(
        false,
      );
      expect(plugin.schema.safeParse({ workspaceRoot: '/path', maxDepth: 'invalid' }).success).toBe(
        false,
      );
      expect(plugin.schema.safeParse({ workspaceRoot: '/path', maxDepth: -1 }).success).toBe(false);
      expect(plugin.schema.safeParse({ workspaceRoot: '/path', maxDepth: 1.5 }).success).toBe(
        false,
      );
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return error when workspaceRoot validation fails', async () => {
      const result = await plugin.handler({ workspaceRoot: null }, mockFileSystemExecutor);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'workspaceRoot' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should return error when scan path does not exist', async () => {
      mockFileSystemExecutor.stat = async () => {
        throw new Error('ENOENT: no such file or directory');
      };

      const result = await plugin.handler(
        {
          workspaceRoot: '/workspace',
          scanPath: '.',
        },
        mockFileSystemExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to access scan path: /workspace. Error: ENOENT: no such file or directory',
          },
        ],
        isError: true,
      });
    });

    it('should return error when scan path is not a directory', async () => {
      mockFileSystemExecutor.stat = async () => ({ isDirectory: () => false });

      const result = await plugin.handler(
        {
          workspaceRoot: '/workspace',
          scanPath: '.',
        },
        mockFileSystemExecutor,
      );

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Scan path is not a directory: /workspace' }],
        isError: true,
      });
    });

    it('should return success with no projects found', async () => {
      mockFileSystemExecutor.stat = async () => ({ isDirectory: () => true });
      mockFileSystemExecutor.readdir = async () => [];

      const result = await plugin.handler(
        {
          workspaceRoot: '/workspace',
          scanPath: '.',
        },
        mockFileSystemExecutor,
      );

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Discovery finished. Found 0 projects and 0 workspaces.' }],
        projects: [],
        workspaces: [],
        isError: false,
      });
    });

    it('should return success with projects found', async () => {
      mockFileSystemExecutor.stat = async () => ({ isDirectory: () => true });
      mockFileSystemExecutor.readdir = async () => [
        { name: 'MyApp.xcodeproj', isDirectory: () => true, isSymbolicLink: () => false },
        { name: 'MyWorkspace.xcworkspace', isDirectory: () => true, isSymbolicLink: () => false },
      ];

      const result = await plugin.handler(
        {
          workspaceRoot: '/workspace',
          scanPath: '.',
        },
        mockFileSystemExecutor,
      );

      expect(result).toEqual({
        content: [
          { type: 'text', text: 'Discovery finished. Found 1 projects and 1 workspaces.' },
          { type: 'text', text: 'Projects found:\n - /workspace/MyApp.xcodeproj' },
          { type: 'text', text: 'Workspaces found:\n - /workspace/MyWorkspace.xcworkspace' },
        ],
        projects: ['/workspace/MyApp.xcodeproj'],
        workspaces: ['/workspace/MyWorkspace.xcworkspace'],
        isError: false,
      });
    });

    it('should handle fs error with code', async () => {
      const error = new Error('Permission denied');
      (error as any).code = 'EACCES';
      mockFileSystemExecutor.stat = async () => {
        throw error;
      };

      const result = await plugin.handler(
        {
          workspaceRoot: '/workspace',
          scanPath: '.',
        },
        mockFileSystemExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to access scan path: /workspace. Error: Permission denied',
          },
        ],
        isError: true,
      });
    });

    it('should handle string error', async () => {
      mockFileSystemExecutor.stat = async () => {
        throw 'String error';
      };

      const result = await plugin.handler(
        {
          workspaceRoot: '/workspace',
          scanPath: '.',
        },
        mockFileSystemExecutor,
      );

      expect(result).toEqual({
        content: [
          { type: 'text', text: 'Failed to access scan path: /workspace. Error: String error' },
        ],
        isError: true,
      });
    });

    it('should handle validation error when workspaceRoot is null', async () => {
      const result = await plugin.handler(
        {
          workspaceRoot: null,
        },
        mockFileSystemExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'workspaceRoot' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should handle scan path outside workspace root', async () => {
      // Mock path normalization to simulate path outside workspace root
      mockFileSystemExecutor.stat = async () => ({ isDirectory: () => true });
      mockFileSystemExecutor.readdir = async () => [];

      const result = await plugin.handler(
        {
          workspaceRoot: '/workspace',
          scanPath: '../outside',
        },
        mockFileSystemExecutor,
      );

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Discovery finished. Found 0 projects and 0 workspaces.' }],
        projects: [],
        workspaces: [],
        isError: false,
      });
    });

    it('should handle error with object containing message and code properties', async () => {
      const errorObject = {
        message: 'Access denied',
        code: 'EACCES',
      };
      mockFileSystemExecutor.stat = async () => {
        throw errorObject;
      };

      const result = await plugin.handler(
        {
          workspaceRoot: '/workspace',
          scanPath: '.',
        },
        mockFileSystemExecutor,
      );

      expect(result).toEqual({
        content: [
          { type: 'text', text: 'Failed to access scan path: /workspace. Error: Access denied' },
        ],
        isError: true,
      });
    });

    it('should handle max depth reached during recursive scan', async () => {
      let readdirCallCount = 0;

      mockFileSystemExecutor.stat = async () => ({ isDirectory: () => true });
      mockFileSystemExecutor.readdir = async () => {
        readdirCallCount++;
        if (readdirCallCount <= 3) {
          return [
            {
              name: `subdir${readdirCallCount}`,
              isDirectory: () => true,
              isSymbolicLink: () => false,
            },
          ];
        }
        return [];
      };

      const result = await plugin.handler(
        {
          workspaceRoot: '/workspace',
          scanPath: '.',
          maxDepth: 3,
        },
        mockFileSystemExecutor,
      );

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Discovery finished. Found 0 projects and 0 workspaces.' }],
        projects: [],
        workspaces: [],
        isError: false,
      });
    });

    it('should handle skipped directory types during scan', async () => {
      mockFileSystemExecutor.stat = async () => ({ isDirectory: () => true });
      mockFileSystemExecutor.readdir = async () => [
        { name: 'build', isDirectory: () => true, isSymbolicLink: () => false },
        { name: 'DerivedData', isDirectory: () => true, isSymbolicLink: () => false },
        { name: 'symlink', isDirectory: () => true, isSymbolicLink: () => true },
        { name: 'regular.txt', isDirectory: () => false, isSymbolicLink: () => false },
      ];

      const result = await plugin.handler(
        {
          workspaceRoot: '/workspace',
          scanPath: '.',
        },
        mockFileSystemExecutor,
      );

      // Test that skipped directories and files are correctly filtered out
      expect(result).toEqual({
        content: [{ type: 'text', text: 'Discovery finished. Found 0 projects and 0 workspaces.' }],
        projects: [],
        workspaces: [],
        isError: false,
      });
    });

    it('should handle error during recursive directory reading', async () => {
      mockFileSystemExecutor.stat = async () => ({ isDirectory: () => true });
      mockFileSystemExecutor.readdir = async () => {
        const readError = new Error('Permission denied');
        (readError as any).code = 'EACCES';
        throw readError;
      };

      const result = await plugin.handler(
        {
          workspaceRoot: '/workspace',
          scanPath: '.',
        },
        mockFileSystemExecutor,
      );

      // The function should handle the error gracefully and continue
      expect(result).toEqual({
        content: [{ type: 'text', text: 'Discovery finished. Found 0 projects and 0 workspaces.' }],
        projects: [],
        workspaces: [],
        isError: false,
      });
    });
  });
});
