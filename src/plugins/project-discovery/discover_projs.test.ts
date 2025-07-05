import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';
import plugin from './discover_projs.ts';
import { validateRequiredParam } from '../../utils/index.js';
import * as fs from 'node:fs/promises';

// Mock dependencies
vi.mock('../../src/utils/index.js', () => ({
  log: vi.fn(),
  validateRequiredParam: vi.fn(),
}));

vi.mock('node:fs/promises', () => {
  const mockFunctions = {
    readdir: vi.fn(),
    stat: vi.fn(),
  };
  return {
    default: mockFunctions,
    ...mockFunctions,
  };
});

vi.mock('node:path', () => {
  const actualPath = {
    join: (...parts: string[]) => parts.join('/'),
    resolve: (base: string, rel: string = '.') => (rel === '.' ? base : `${base}/${rel}`),
    relative: (from: string, to: string) => to.replace(from, '').replace(/^\//, ''),
    normalize: (p: string) => p,
  };
  return {
    default: actualPath,
    ...actualPath,
  };
});

const mockValidateRequiredParam = validateRequiredParam as MockedFunction<
  typeof validateRequiredParam
>;
const mockStat = fs.stat as MockedFunction<typeof fs.stat>;
const mockReaddir = fs.readdir as MockedFunction<typeof fs.readdir>;

describe('discover_projs plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      mockValidateRequiredParam.mockReturnValueOnce({
        isValid: false,
        errorResponse: {
          content: [{ type: 'text', text: 'workspaceRoot is required' }],
          isError: true,
        },
      });

      const result = await plugin.handler({ workspaceRoot: '' });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'workspaceRoot is required' }],
        isError: true,
      });
    });

    it('should return error when scan path does not exist', async () => {
      mockValidateRequiredParam.mockReturnValueOnce({ isValid: true });
      mockStat.mockRejectedValueOnce(new Error('ENOENT: no such file or directory'));

      const result = await plugin.handler({
        workspaceRoot: '/workspace',
        scanPath: '.',
      });

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
      mockValidateRequiredParam.mockReturnValueOnce({ isValid: true });
      mockStat.mockResolvedValueOnce({ isDirectory: () => false } as any);

      const result = await plugin.handler({
        workspaceRoot: '/workspace',
        scanPath: '.',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Scan path is not a directory: /workspace' }],
        isError: true,
      });
    });

    it('should return success with no projects found', async () => {
      mockValidateRequiredParam.mockReturnValueOnce({ isValid: true });
      mockStat.mockResolvedValueOnce({ isDirectory: () => true } as any);
      mockReaddir.mockResolvedValueOnce([]);

      const result = await plugin.handler({
        workspaceRoot: '/workspace',
        scanPath: '.',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Discovery finished. Found 0 projects and 0 workspaces.' }],
        projects: [],
        workspaces: [],
        isError: false,
      });
    });

    it('should return success with projects found', async () => {
      mockValidateRequiredParam.mockReturnValueOnce({ isValid: true });
      mockStat.mockResolvedValueOnce({ isDirectory: () => true } as any);
      mockReaddir.mockResolvedValueOnce([
        { name: 'MyApp.xcodeproj', isDirectory: () => true, isSymbolicLink: () => false },
        { name: 'MyWorkspace.xcworkspace', isDirectory: () => true, isSymbolicLink: () => false },
      ] as any);

      const result = await plugin.handler({
        workspaceRoot: '/workspace',
        scanPath: '.',
      });

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
      mockValidateRequiredParam.mockReturnValueOnce({ isValid: true });
      const error = new Error('Permission denied');
      (error as any).code = 'EACCES';
      mockStat.mockRejectedValueOnce(error);

      const result = await plugin.handler({
        workspaceRoot: '/workspace',
        scanPath: '.',
      });

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
      mockValidateRequiredParam.mockReturnValueOnce({ isValid: true });
      mockStat.mockRejectedValueOnce('String error');

      const result = await plugin.handler({
        workspaceRoot: '/workspace',
        scanPath: '.',
      });

      expect(result).toEqual({
        content: [
          { type: 'text', text: 'Failed to access scan path: /workspace. Error: String error' },
        ],
        isError: true,
      });
    });

    it('should handle exception during validation', async () => {
      mockValidateRequiredParam.mockReturnValueOnce({
        isValid: false,
        errorResponse: {
          content: [{ type: 'text', text: 'Validation failed: Unexpected error' }],
          isError: true,
        },
      });

      const result = await plugin.handler({
        workspaceRoot: '/workspace',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Validation failed: Unexpected error' }],
        isError: true,
      });
    });

    it('should handle scan path outside workspace root', async () => {
      // Mock path.normalize to make paths fall outside workspace root
      const mockPath = await import('node:path');
      vi.spyOn(mockPath, 'normalize').mockImplementation((p: string) => {
        if (p.includes('outside')) return '/outside/path';
        return '/workspace';
      });

      mockValidateRequiredParam.mockReturnValueOnce({ isValid: true });
      mockStat.mockResolvedValueOnce({ isDirectory: () => true } as any);
      mockReaddir.mockResolvedValueOnce([]);

      const result = await plugin.handler({
        workspaceRoot: '/workspace',
        scanPath: '../outside',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Discovery finished. Found 0 projects and 0 workspaces.' }],
        projects: [],
        workspaces: [],
        isError: false,
      });
    });

    it('should handle error with object containing message and code properties', async () => {
      mockValidateRequiredParam.mockReturnValueOnce({ isValid: true });
      const errorObject = {
        message: 'Access denied',
        code: 'EACCES',
      };
      mockStat.mockRejectedValueOnce(errorObject);

      const result = await plugin.handler({
        workspaceRoot: '/workspace',
        scanPath: '.',
      });

      expect(result).toEqual({
        content: [
          { type: 'text', text: 'Failed to access scan path: /workspace. Error: Access denied' },
        ],
        isError: true,
      });
    });

    it('should handle max depth reached during recursive scan', async () => {
      mockValidateRequiredParam.mockReturnValueOnce({ isValid: true });
      mockStat.mockResolvedValueOnce({ isDirectory: () => true } as any);

      // Mock nested directory structure that exceeds max depth
      mockReaddir
        .mockResolvedValueOnce([
          { name: 'subdir', isDirectory: () => true, isSymbolicLink: () => false },
        ] as any)
        .mockResolvedValueOnce([
          { name: 'subdir2', isDirectory: () => true, isSymbolicLink: () => false },
        ] as any)
        .mockResolvedValueOnce([
          { name: 'subdir3', isDirectory: () => true, isSymbolicLink: () => false },
        ] as any)
        .mockResolvedValueOnce([
          { name: 'subdir4', isDirectory: () => true, isSymbolicLink: () => false },
        ] as any)
        .mockResolvedValueOnce([
          { name: 'subdir5', isDirectory: () => true, isSymbolicLink: () => false },
        ] as any)
        .mockResolvedValueOnce([]); // This should not be reached due to max depth

      const result = await plugin.handler({
        workspaceRoot: '/workspace',
        scanPath: '.',
        maxDepth: 3,
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Discovery finished. Found 0 projects and 0 workspaces.' }],
        projects: [],
        workspaces: [],
        isError: false,
      });
    });

    it('should handle skipped directory types during scan', async () => {
      mockValidateRequiredParam.mockReturnValueOnce({ isValid: true });
      mockStat.mockResolvedValueOnce({ isDirectory: () => true } as any);

      // Mock directory entries including skipped directories and symbolic links
      mockReaddir.mockResolvedValueOnce([
        { name: 'build', isDirectory: () => true, isSymbolicLink: () => false },
        { name: 'DerivedData', isDirectory: () => true, isSymbolicLink: () => false },
        { name: 'symlink', isDirectory: () => true, isSymbolicLink: () => true },
        { name: 'regular.txt', isDirectory: () => false, isSymbolicLink: () => false },
      ] as any);

      const result = await plugin.handler({
        workspaceRoot: '/workspace',
        scanPath: '.',
      });

      // Test that skipped directories and files are correctly filtered out
      expect(result).toEqual({
        content: [{ type: 'text', text: 'Discovery finished. Found 0 projects and 0 workspaces.' }],
        projects: [],
        workspaces: [],
        isError: false,
      });
    });

    it('should handle error during recursive directory reading', async () => {
      mockValidateRequiredParam.mockReturnValueOnce({ isValid: true });
      mockStat.mockResolvedValueOnce({ isDirectory: () => true } as any);

      // Mock readdir to fail during recursive scan
      const readError = new Error('Permission denied');
      (readError as any).code = 'EACCES';
      mockReaddir.mockRejectedValueOnce(readError);

      const result = await plugin.handler({
        workspaceRoot: '/workspace',
        scanPath: '.',
      });

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
