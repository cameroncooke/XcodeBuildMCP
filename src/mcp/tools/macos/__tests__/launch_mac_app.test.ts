/**
 * Pure dependency injection test for launch_mac_app plugin
 *
 * Tests plugin structure and macOS app launching functionality including parameter validation,
 * command generation, file validation, and response formatting.
 *
 * Uses manual call tracking and createMockFileSystemExecutor for file operations.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createMockFileSystemExecutor } from '../../../../test-utils/mock-executors.js';
import launchMacApp, { launch_mac_appLogic } from '../launch_mac_app.ts';

describe('launch_mac_app plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(launchMacApp.name).toBe('launch_mac_app');
    });

    it('should have correct description', () => {
      expect(launchMacApp.description).toBe(
        "Launches a macOS application. IMPORTANT: You MUST provide the appPath parameter. Example: launch_mac_app({ appPath: '/path/to/your/app.app' }) Note: In some environments, this tool may be prefixed as mcp0_launch_macos_app.",
      );
    });

    it('should have handler function', () => {
      expect(typeof launchMacApp.handler).toBe('function');
    });

    it('should validate schema with valid inputs', () => {
      const schema = z.object(launchMacApp.schema);
      expect(
        schema.safeParse({
          appPath: '/path/to/MyApp.app',
        }).success,
      ).toBe(true);
      expect(
        schema.safeParse({
          appPath: '/Applications/Calculator.app',
          args: ['--debug'],
        }).success,
      ).toBe(true);
      expect(
        schema.safeParse({
          appPath: '/path/to/MyApp.app',
          args: ['--debug', '--verbose'],
        }).success,
      ).toBe(true);
    });

    it('should validate schema with invalid inputs', () => {
      const schema = z.object(launchMacApp.schema);
      expect(schema.safeParse({}).success).toBe(false);
      expect(schema.safeParse({ appPath: null }).success).toBe(false);
      expect(schema.safeParse({ appPath: 123 }).success).toBe(false);
      expect(schema.safeParse({ appPath: '/path/to/MyApp.app', args: 'not-array' }).success).toBe(
        false,
      );
    });
  });

  describe('Input Validation', () => {
    it('should handle non-existent app path', async () => {
      const mockExecutor = async () => Promise.resolve({ stdout: '', stderr: '' });
      const mockFileSystem = createMockFileSystemExecutor({
        existsSync: () => false,
      });

      const result = await launch_mac_appLogic(
        {
          appPath: '/path/to/NonExistent.app',
        },
        mockExecutor,
        mockFileSystem,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "File not found: '/path/to/NonExistent.app'. Please check the path and try again.",
          },
        ],
        isError: true,
      });
    });
  });

  describe('Command Generation', () => {
    it('should generate correct command with minimal parameters', async () => {
      const calls: any[] = [];
      const mockExecutor = async (command: string[]) => {
        calls.push({ command });
        return { stdout: '', stderr: '' };
      };

      const mockFileSystem = createMockFileSystemExecutor({
        existsSync: () => true,
      });

      await launch_mac_appLogic(
        {
          appPath: '/path/to/MyApp.app',
        },
        mockExecutor,
        mockFileSystem,
      );

      expect(calls).toHaveLength(1);
      expect(calls[0].command).toEqual(['open', '/path/to/MyApp.app']);
    });

    it('should generate correct command with args parameter', async () => {
      const calls: any[] = [];
      const mockExecutor = async (command: string[]) => {
        calls.push({ command });
        return { stdout: '', stderr: '' };
      };

      const mockFileSystem = createMockFileSystemExecutor({
        existsSync: () => true,
      });

      await launch_mac_appLogic(
        {
          appPath: '/path/to/MyApp.app',
          args: ['--debug', '--verbose'],
        },
        mockExecutor,
        mockFileSystem,
      );

      expect(calls).toHaveLength(1);
      expect(calls[0].command).toEqual([
        'open',
        '/path/to/MyApp.app',
        '--args',
        '--debug',
        '--verbose',
      ]);
    });

    it('should generate correct command with empty args array', async () => {
      const calls: any[] = [];
      const mockExecutor = async (command: string[]) => {
        calls.push({ command });
        return { stdout: '', stderr: '' };
      };

      const mockFileSystem = createMockFileSystemExecutor({
        existsSync: () => true,
      });

      await launch_mac_appLogic(
        {
          appPath: '/path/to/MyApp.app',
          args: [],
        },
        mockExecutor,
        mockFileSystem,
      );

      expect(calls).toHaveLength(1);
      expect(calls[0].command).toEqual(['open', '/path/to/MyApp.app']);
    });

    it('should handle paths with spaces correctly', async () => {
      const calls: any[] = [];
      const mockExecutor = async (command: string[]) => {
        calls.push({ command });
        return { stdout: '', stderr: '' };
      };

      const mockFileSystem = createMockFileSystemExecutor({
        existsSync: () => true,
      });

      await launch_mac_appLogic(
        {
          appPath: '/Applications/My App.app',
        },
        mockExecutor,
        mockFileSystem,
      );

      expect(calls).toHaveLength(1);
      expect(calls[0].command).toEqual(['open', '/Applications/My App.app']);
    });
  });

  describe('Response Processing', () => {
    it('should return successful launch response', async () => {
      const mockExecutor = async () => Promise.resolve({ stdout: '', stderr: '' });

      const mockFileSystem = createMockFileSystemExecutor({
        existsSync: () => true,
      });

      const result = await launch_mac_appLogic(
        {
          appPath: '/path/to/MyApp.app',
        },
        mockExecutor,
        mockFileSystem,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ macOS app launched successfully: /path/to/MyApp.app',
          },
        ],
      });
    });

    it('should return successful launch response with args', async () => {
      const mockExecutor = async () => Promise.resolve({ stdout: '', stderr: '' });

      const mockFileSystem = createMockFileSystemExecutor({
        existsSync: () => true,
      });

      const result = await launch_mac_appLogic(
        {
          appPath: '/path/to/MyApp.app',
          args: ['--debug', '--verbose'],
        },
        mockExecutor,
        mockFileSystem,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ macOS app launched successfully: /path/to/MyApp.app',
          },
        ],
      });
    });

    it('should handle launch failure with Error object', async () => {
      const mockExecutor = async () => {
        throw new Error('App not found');
      };

      const mockFileSystem = createMockFileSystemExecutor({
        existsSync: () => true,
      });

      const result = await launch_mac_appLogic(
        {
          appPath: '/path/to/MyApp.app',
        },
        mockExecutor,
        mockFileSystem,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ Launch macOS app operation failed: App not found',
          },
        ],
        isError: true,
      });
    });

    it('should handle launch failure with string error', async () => {
      const mockExecutor = async () => {
        throw 'Permission denied';
      };

      const mockFileSystem = createMockFileSystemExecutor({
        existsSync: () => true,
      });

      const result = await launch_mac_appLogic(
        {
          appPath: '/path/to/MyApp.app',
        },
        mockExecutor,
        mockFileSystem,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ Launch macOS app operation failed: Permission denied',
          },
        ],
        isError: true,
      });
    });

    it('should handle launch failure with unknown error type', async () => {
      const mockExecutor = async () => {
        throw 123;
      };

      const mockFileSystem = createMockFileSystemExecutor({
        existsSync: () => true,
      });

      const result = await launch_mac_appLogic(
        {
          appPath: '/path/to/MyApp.app',
        },
        mockExecutor,
        mockFileSystem,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ Launch macOS app operation failed: 123',
          },
        ],
        isError: true,
      });
    });
  });
});
