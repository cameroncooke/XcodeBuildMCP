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
  createMockCommandResponse,
} from '../../../../test-utils/mock-executors.ts';
import swiftPackageClean, { swift_package_cleanLogic } from '../swift_package_clean.ts';
import type { CommandExecutor } from '../../../../utils/execution/index.ts';

describe('swift_package_clean plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(swiftPackageClean.name).toBe('swift_package_clean');
    });

    it('should have correct description', () => {
      expect(swiftPackageClean.description).toBe('swift package clean.');
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
        description?: string;
        useShell?: boolean;
        opts?: { env?: Record<string, string>; cwd?: string };
      }> = [];

      const mockExecutor: CommandExecutor = async (command, description, useShell, opts) => {
        calls.push({ command, description, useShell, opts });
        return createMockCommandResponse({
          success: true,
          output: 'Clean succeeded',
          error: undefined,
        });
      };

      await swift_package_cleanLogic(
        {
          packagePath: '/test/package',
        },
        mockExecutor,
      );

      expect(calls).toHaveLength(1);
      expect(calls[0]).toEqual({
        command: ['swift', 'package', '--package-path', '/test/package', 'clean'],
        description: 'Swift Package Clean',
        useShell: false,
        opts: undefined,
      });
    });
  });

  describe('Response Logic Testing', () => {
    it('should handle valid params without validation errors in logic function', async () => {
      // Note: The logic function assumes valid params since createTypedTool handles validation
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Package cleaned successfully',
      });

      const result = await swift_package_cleanLogic(
        {
          packagePath: '/test/package',
        },
        mockExecutor,
      );

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toBe('✅ Swift package cleaned successfully.');
    });

    it('should return successful clean response', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Package cleaned successfully',
      });

      const result = await swift_package_cleanLogic(
        {
          packagePath: '/test/package',
        },
        mockExecutor,
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
        isError: false,
      });
    });

    it('should return successful clean response with no output', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: '',
      });

      const result = await swift_package_cleanLogic(
        {
          packagePath: '/test/package',
        },
        mockExecutor,
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
        isError: false,
      });
    });

    it('should return error response for clean failure', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Permission denied',
      });

      const result = await swift_package_cleanLogic(
        {
          packagePath: '/test/package',
        },
        mockExecutor,
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

      const result = await swift_package_cleanLogic(
        {
          packagePath: '/test/package',
        },
        mockExecutor,
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
