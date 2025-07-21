/**
 * Tests for screenshot plugin
 * Following CLAUDE.md testing standards with literal validation
 * Using pure dependency injection for deterministic testing
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { createMockExecutor, createMockFileSystemExecutor } from '../../../utils/command.js';
import screenshotPlugin, { screenshotLogic } from '../../ui-testing/screenshot.ts';

describe('screenshot plugin', () => {
  // No mocks to clear since we use pure dependency injection

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name field', () => {
      expect(screenshotPlugin.name).toBe('screenshot');
    });

    it('should have correct description field', () => {
      expect(screenshotPlugin.description).toBe(
        "Captures screenshot for visual verification. For UI coordinates, use describe_ui instead (don't determine coordinates from screenshots).",
      );
    });

    it('should have handler function', () => {
      expect(typeof screenshotPlugin.handler).toBe('function');
    });

    it('should have correct schema validation', () => {
      const schema = z.object(screenshotPlugin.schema);

      expect(
        schema.safeParse({
          simulatorUuid: '550e8400-e29b-41d4-a716-446655440000',
        }).success,
      ).toBe(true);

      expect(
        schema.safeParse({
          simulatorUuid: 123,
        }).success,
      ).toBe(false);

      expect(schema.safeParse({}).success).toBe(false);
    });
  });

  describe('Command Generation', () => {
    it('should generate correct simctl command', async () => {
      let capturedCommand: string[] = [];

      const mockExecutor = async (command: string[]) => {
        capturedCommand = command;
        return {
          success: true,
          output: '',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      const mockFileSystemExecutor = createMockFileSystemExecutor({
        readFile: async () => 'fake-image-data',
      });

      const mockPathDeps = {
        tmpdir: () => '/tmp',
        join: (...paths: string[]) => paths.join('/'),
      };

      const mockUuidDeps = {
        v4: () => 'mock-uuid-123',
      };

      await screenshotLogic(
        {
          simulatorUuid: 'test-uuid',
        },
        mockExecutor,
        mockFileSystemExecutor,
        mockPathDeps,
        mockUuidDeps,
      );

      expect(capturedCommand).toEqual([
        'xcrun',
        'simctl',
        'io',
        'test-uuid',
        'screenshot',
        '/tmp/screenshot_mock-uuid-123.png',
      ]);
    });

    it('should generate correct path with different uuid', async () => {
      let capturedCommand: string[] = [];

      const mockExecutor = async (command: string[]) => {
        capturedCommand = command;
        return {
          success: true,
          output: '',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      const mockFileSystemExecutor = createMockFileSystemExecutor({
        readFile: async () => 'fake-image-data',
      });

      const mockPathDeps = {
        tmpdir: () => '/tmp',
        join: (...paths: string[]) => paths.join('/'),
      };

      const mockUuidDeps = {
        v4: () => 'different-uuid-456',
      };

      await screenshotLogic(
        {
          simulatorUuid: 'another-uuid',
        },
        mockExecutor,
        mockFileSystemExecutor,
        mockPathDeps,
        mockUuidDeps,
      );

      expect(capturedCommand).toEqual([
        'xcrun',
        'simctl',
        'io',
        'another-uuid',
        'screenshot',
        '/tmp/screenshot_different-uuid-456.png',
      ]);
    });

    it('should use default dependencies when not provided', async () => {
      let capturedCommand: string[] = [];

      const mockExecutor = async (command: string[]) => {
        capturedCommand = command;
        return {
          success: true,
          output: '',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      const mockFileSystemExecutor = createMockFileSystemExecutor({
        readFile: async () => 'fake-image-data',
      });

      await screenshotLogic(
        {
          simulatorUuid: 'test-uuid',
        },
        mockExecutor,
        mockFileSystemExecutor,
      );

      // Command should be generated with real os.tmpdir, path.join, and uuidv4
      expect(capturedCommand).toHaveLength(6);
      expect(capturedCommand[0]).toBe('xcrun');
      expect(capturedCommand[1]).toBe('simctl');
      expect(capturedCommand[2]).toBe('io');
      expect(capturedCommand[3]).toBe('test-uuid');
      expect(capturedCommand[4]).toBe('screenshot');
      expect(capturedCommand[5]).toMatch(/\/.*\/screenshot_.*\.png/);
    });
  });

  describe('Response Processing', () => {
    it('should capture screenshot successfully', async () => {
      const mockImageBuffer = Buffer.from('fake-image-data');

      const mockExecutor = createMockExecutor({
        success: true,
        output: '',
        error: undefined,
      });

      const mockFileSystemExecutor = createMockFileSystemExecutor({
        readFile: async () => mockImageBuffer.toString('utf8'),
      });

      const mockPathDeps = {
        tmpdir: () => '/tmp',
        join: (...paths: string[]) => paths.join('/'),
      };

      const mockUuidDeps = {
        v4: () => 'mock-uuid-123',
      };

      const result = await screenshotLogic(
        {
          simulatorUuid: 'test-uuid',
        },
        mockExecutor,
        mockFileSystemExecutor,
        mockPathDeps,
        mockUuidDeps,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'image',
            data: mockImageBuffer.toString('base64'),
            mimeType: 'image/png',
          },
        ],
      });
    });

    it('should handle missing simulatorUuid', async () => {
      const result = await screenshotLogic(
        {},
        createMockExecutor({ success: true }),
        createMockFileSystemExecutor(),
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'simulatorUuid' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should handle command failure', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'Command failed',
      });

      const mockPathDeps = {
        tmpdir: () => '/tmp',
        join: (...paths: string[]) => paths.join('/'),
      };

      const mockUuidDeps = {
        v4: () => 'mock-uuid-123',
      };

      const result = await screenshotLogic(
        {
          simulatorUuid: 'test-uuid',
        },
        mockExecutor,
        createMockFileSystemExecutor(),
        mockPathDeps,
        mockUuidDeps,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: System error executing screenshot: Failed to capture screenshot: Command failed',
          },
        ],
        isError: true,
      });
    });

    it('should handle file read failure', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: '',
        error: undefined,
      });

      const mockFileSystemExecutor = createMockFileSystemExecutor({
        readFile: async () => {
          throw new Error('File not found');
        },
      });

      const mockPathDeps = {
        tmpdir: () => '/tmp',
        join: (...paths: string[]) => paths.join('/'),
      };

      const mockUuidDeps = {
        v4: () => 'mock-uuid-123',
      };

      const result = await screenshotLogic(
        {
          simulatorUuid: 'test-uuid',
        },
        mockExecutor,
        mockFileSystemExecutor,
        mockPathDeps,
        mockUuidDeps,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Screenshot captured but failed to process image file: File not found',
          },
        ],
        isError: true,
      });
    });

    it('should call correct command with direct execution', async () => {
      let capturedArgs: any[] = [];

      const mockExecutor = async (...args: any[]) => {
        capturedArgs = args;
        return {
          success: true,
          output: '',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      const mockFileSystemExecutor = createMockFileSystemExecutor({
        readFile: async () => 'fake-image-data',
      });

      const mockPathDeps = {
        tmpdir: () => '/tmp',
        join: (...paths: string[]) => paths.join('/'),
      };

      const mockUuidDeps = {
        v4: () => 'mock-uuid-123',
      };

      await screenshotLogic(
        {
          simulatorUuid: 'test-uuid',
        },
        mockExecutor,
        mockFileSystemExecutor,
        mockPathDeps,
        mockUuidDeps,
      );

      expect(capturedArgs).toEqual([
        ['xcrun', 'simctl', 'io', 'test-uuid', 'screenshot', '/tmp/screenshot_mock-uuid-123.png'],
        '[Screenshot]: screenshot',
        false,
        undefined,
      ]);
    });

    it('should handle SystemError exceptions', async () => {
      const mockExecutor = async () => {
        const { SystemError } = await import('../../../utils/index.js');
        throw new SystemError('System error occurred');
      };

      const mockPathDeps = {
        tmpdir: () => '/tmp',
        join: (...paths: string[]) => paths.join('/'),
      };

      const mockUuidDeps = {
        v4: () => 'mock-uuid-123',
      };

      const result = await screenshotLogic(
        {
          simulatorUuid: 'test-uuid',
        },
        mockExecutor,
        createMockFileSystemExecutor(),
        mockPathDeps,
        mockUuidDeps,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: System error executing screenshot: System error occurred',
          },
        ],
        isError: true,
      });
    });

    it('should handle unexpected Error objects', async () => {
      const mockExecutor = async () => {
        throw new Error('Unexpected error');
      };

      const mockPathDeps = {
        tmpdir: () => '/tmp',
        join: (...paths: string[]) => paths.join('/'),
      };

      const mockUuidDeps = {
        v4: () => 'mock-uuid-123',
      };

      const result = await screenshotLogic(
        {
          simulatorUuid: 'test-uuid',
        },
        mockExecutor,
        createMockFileSystemExecutor(),
        mockPathDeps,
        mockUuidDeps,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: An unexpected error occurred: Unexpected error',
          },
        ],
        isError: true,
      });
    });

    it('should handle unexpected string errors', async () => {
      const mockExecutor = async () => {
        throw 'String error';
      };

      const mockPathDeps = {
        tmpdir: () => '/tmp',
        join: (...paths: string[]) => paths.join('/'),
      };

      const mockUuidDeps = {
        v4: () => 'mock-uuid-123',
      };

      const result = await screenshotLogic(
        {
          simulatorUuid: 'test-uuid',
        },
        mockExecutor,
        createMockFileSystemExecutor(),
        mockPathDeps,
        mockUuidDeps,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: An unexpected error occurred: String error',
          },
        ],
        isError: true,
      });
    });

    it('should handle file read error with fileSystemExecutor', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: '',
        error: undefined,
      });

      const mockFileSystemExecutor = createMockFileSystemExecutor({
        readFile: async () => {
          throw 'File system error';
        },
      });

      const mockPathDeps = {
        tmpdir: () => '/tmp',
        join: (...paths: string[]) => paths.join('/'),
      };

      const mockUuidDeps = {
        v4: () => 'mock-uuid-123',
      };

      const result = await screenshotLogic(
        {
          simulatorUuid: 'test-uuid',
        },
        mockExecutor,
        mockFileSystemExecutor,
        mockPathDeps,
        mockUuidDeps,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Screenshot captured but failed to process image file: File system error',
          },
        ],
        isError: true,
      });
    });
  });
});
