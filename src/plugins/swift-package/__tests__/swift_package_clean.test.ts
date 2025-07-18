/**
 * Tests for swift_package_clean plugin
 * Following CLAUDE.md testing standards with literal validation
 * Using dependency injection for deterministic testing
 */

import { describe, it, expect } from 'vitest';
import {
  createMockExecutor,
  createMockFileSystemExecutor,
  createNoopExecutor,
} from '../../../utils/command.js';
import swiftPackageClean from '../swift_package_clean.ts';

describe('swift_package_clean plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(swiftPackageClean.name).toBe('swift_package_clean');
    });

    it('should have correct description', () => {
      expect(swiftPackageClean.description).toBe(
        'Cleans Swift Package build artifacts and derived data',
      );
    });

    it('should have handler function', () => {
      expect(typeof swiftPackageClean.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Test required fields
      expect(swiftPackageClean.schema.packagePath.safeParse('/test/package').success).toBe(true);
      expect(swiftPackageClean.schema.packagePath.safeParse('').success).toBe(true);

      // Test invalid inputs
      expect(swiftPackageClean.schema.packagePath.safeParse(null).success).toBe(false);
      expect(swiftPackageClean.schema.packagePath.safeParse(undefined).success).toBe(false);
    });
  });

  describe('Command Generation Testing', () => {
    it('should build correct command for clean', async () => {
      const calls: Array<{
        command: string[];
        description: string;
        showOutput: boolean;
        workingDirectory: string | undefined;
      }> = [];

      const mockExecutor = async (
        command: string[],
        description: string,
        showOutput: boolean,
        workingDirectory?: string,
      ) => {
        calls.push({ command, description, showOutput, workingDirectory });
        return {
          success: true,
          output: 'Clean succeeded',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      await swiftPackageClean.handler(
        {
          packagePath: '/test/package',
        },
        mockExecutor,
        createMockFileSystemExecutor(),
      );

      expect(calls).toHaveLength(1);
      expect(calls[0]).toEqual({
        command: ['swift', 'package', '--package-path', '/test/package', 'clean'],
        description: 'Swift Package Clean',
        showOutput: true,
        workingDirectory: undefined,
      });
    });
  });

  describe('Response Logic Testing', () => {
    it('should return validation error for missing packagePath', async () => {
      const result = await swiftPackageClean.handler(
        {},
        createNoopExecutor(),
        createMockFileSystemExecutor(),
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'packagePath' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should return successful clean response', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Package cleaned successfully',
      });

      const result = await swiftPackageClean.handler(
        {
          packagePath: '/test/package',
        },
        mockExecutor,
        createMockFileSystemExecutor(),
      );

      expect(result).toEqual({
        content: [
          { type: 'text', text: '✅ Swift package cleaned successfully.' },
          {
            type: 'text',
            text: '💡 Build artifacts and derived data removed. Ready for fresh build.',
          },
          { type: 'text', text: 'Package cleaned successfully' },
        ],
      });
    });

    it('should return successful clean response with no output', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: '',
      });

      const result = await swiftPackageClean.handler(
        {
          packagePath: '/test/package',
        },
        mockExecutor,
        createMockFileSystemExecutor(),
      );

      expect(result).toEqual({
        content: [
          { type: 'text', text: '✅ Swift package cleaned successfully.' },
          {
            type: 'text',
            text: '💡 Build artifacts and derived data removed. Ready for fresh build.',
          },
          { type: 'text', text: '(clean completed silently)' },
        ],
      });
    });

    it('should return error response for clean failure', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Permission denied',
      });

      const result = await swiftPackageClean.handler(
        {
          packagePath: '/test/package',
        },
        mockExecutor,
        createMockFileSystemExecutor(),
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Swift package clean failed\nDetails: Permission denied',
          },
        ],
        isError: true,
      });
    });

    it('should handle spawn error', async () => {
      const mockExecutor = async () => {
        throw new Error('spawn ENOENT');
      };

      const result = await swiftPackageClean.handler(
        {
          packagePath: '/test/package',
        },
        mockExecutor,
        createMockFileSystemExecutor(),
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Failed to execute swift package clean\nDetails: spawn ENOENT',
          },
        ],
        isError: true,
      });
    });
  });
});
