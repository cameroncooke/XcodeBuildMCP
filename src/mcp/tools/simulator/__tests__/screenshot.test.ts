/**
 * Tests for screenshot plugin
 * Following CLAUDE.md testing standards with literal validation
 * Using pure dependency injection for deterministic testing
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  createMockExecutor,
  createMockFileSystemExecutor,
  createCommandMatchingMockExecutor,
} from '../../../../test-utils/mock-executors.js';
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
    it('should generate correct simctl and sips commands', async () => {
      const capturedCommands: string[][] = [];

      const mockExecutor = createCommandMatchingMockExecutor({
        'xcrun simctl': { success: true, output: 'Screenshot saved' },
        sips: { success: true, output: 'Image optimized' },
      });

      // Wrap to capture both commands
      const capturingExecutor = async (command: string[], ...args: any[]) => {
        capturedCommands.push(command);
        return mockExecutor(command, ...args);
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
        capturingExecutor,
        mockFileSystemExecutor,
        mockPathDeps,
        mockUuidDeps,
      );

      // Should execute both commands in sequence
      expect(capturedCommands).toHaveLength(2);

      // First command: xcrun simctl screenshot
      expect(capturedCommands[0]).toEqual([
        'xcrun',
        'simctl',
        'io',
        'test-uuid',
        'screenshot',
        '/tmp/screenshot_mock-uuid-123.png',
      ]);

      // Second command: sips optimization
      expect(capturedCommands[1]).toEqual([
        'sips',
        '-Z',
        '800',
        '-s',
        'format',
        'jpeg',
        '-s',
        'formatOptions',
        '75',
        '/tmp/screenshot_mock-uuid-123.png',
        '--out',
        '/tmp/screenshot_optimized_mock-uuid-123.jpg',
      ]);
    });

    it('should generate correct path with different uuid', async () => {
      const capturedCommands: string[][] = [];

      const mockExecutor = createCommandMatchingMockExecutor({
        'xcrun simctl': { success: true, output: 'Screenshot saved' },
        sips: { success: true, output: 'Image optimized' },
      });

      // Wrap to capture both commands
      const capturingExecutor = async (command: string[], ...args: any[]) => {
        capturedCommands.push(command);
        return mockExecutor(command, ...args);
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
        capturingExecutor,
        mockFileSystemExecutor,
        mockPathDeps,
        mockUuidDeps,
      );

      // Should execute both commands in sequence
      expect(capturedCommands).toHaveLength(2);

      // First command: xcrun simctl screenshot
      expect(capturedCommands[0]).toEqual([
        'xcrun',
        'simctl',
        'io',
        'another-uuid',
        'screenshot',
        '/tmp/screenshot_different-uuid-456.png',
      ]);

      // Second command: sips optimization
      expect(capturedCommands[1]).toEqual([
        'sips',
        '-Z',
        '800',
        '-s',
        'format',
        'jpeg',
        '-s',
        'formatOptions',
        '75',
        '/tmp/screenshot_different-uuid-456.png',
        '--out',
        '/tmp/screenshot_optimized_different-uuid-456.jpg',
      ]);
    });

    it('should use default dependencies when not provided', async () => {
      const capturedCommands: string[][] = [];

      const mockExecutor = createCommandMatchingMockExecutor({
        'xcrun simctl': { success: true, output: 'Screenshot saved' },
        sips: { success: true, output: 'Image optimized' },
      });

      // Wrap to capture both commands
      const capturingExecutor = async (command: string[], ...args: any[]) => {
        capturedCommands.push(command);
        return mockExecutor(command, ...args);
      };

      const mockFileSystemExecutor = createMockFileSystemExecutor({
        readFile: async () => 'fake-image-data',
      });

      await screenshotLogic(
        {
          simulatorUuid: 'test-uuid',
        },
        capturingExecutor,
        mockFileSystemExecutor,
      );

      // Should execute both commands in sequence
      expect(capturedCommands).toHaveLength(2);

      // First command should be generated with real os.tmpdir, path.join, and uuidv4
      const firstCommand = capturedCommands[0];
      expect(firstCommand).toHaveLength(6);
      expect(firstCommand[0]).toBe('xcrun');
      expect(firstCommand[1]).toBe('simctl');
      expect(firstCommand[2]).toBe('io');
      expect(firstCommand[3]).toBe('test-uuid');
      expect(firstCommand[4]).toBe('screenshot');
      expect(firstCommand[5]).toMatch(/\/.*\/screenshot_.*\.png/);

      // Second command should be sips optimization
      const secondCommand = capturedCommands[1];
      expect(secondCommand[0]).toBe('sips');
      expect(secondCommand[1]).toBe('-Z');
      expect(secondCommand[2]).toBe('800');
      // Should have proper PNG input and JPG output paths
      expect(secondCommand[secondCommand.length - 3]).toMatch(/\/.*\/screenshot_.*\.png/);
      expect(secondCommand[secondCommand.length - 1]).toMatch(/\/.*\/screenshot_optimized_.*\.jpg/);
    });
  });

  describe('Response Processing', () => {
    it('should capture screenshot successfully', async () => {
      const mockImageBuffer = Buffer.from('fake-image-data');

      // Mock both commands: screenshot + optimization
      const mockExecutor = createCommandMatchingMockExecutor({
        'xcrun simctl': { success: true, output: 'Screenshot saved' },
        sips: { success: true, output: 'Image optimized' },
      });

      const mockFileSystemExecutor = createMockFileSystemExecutor({
        readFile: async () => mockImageBuffer.toString('base64'), // Return base64 directly
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
            mimeType: 'image/jpeg', // Now JPEG after optimization
          },
        ],
        isError: false,
      });
    });

    it('should handle missing simulatorUuid via handler', async () => {
      // Test Zod validation by calling the handler with invalid params
      const result = await screenshotPlugin.handler({});

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Parameter validation failed\nDetails: Invalid parameters:\nsimulatorUuid: Required',
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
      const capturedArgs: any[][] = [];

      const mockExecutor = createCommandMatchingMockExecutor({
        'xcrun simctl': { success: true, output: 'Screenshot saved' },
        sips: { success: true, output: 'Image optimized' },
      });

      // Wrap to capture both command executions
      const capturingExecutor = async (...args: any[]) => {
        capturedArgs.push(args);
        return mockExecutor(...args);
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
        capturingExecutor,
        mockFileSystemExecutor,
        mockPathDeps,
        mockUuidDeps,
      );

      // Should capture both command executions
      expect(capturedArgs).toHaveLength(2);

      // First call: xcrun simctl screenshot (3 args: command, logPrefix, useShell)
      expect(capturedArgs[0]).toEqual([
        ['xcrun', 'simctl', 'io', 'test-uuid', 'screenshot', '/tmp/screenshot_mock-uuid-123.png'],
        '[Screenshot]: screenshot',
        false,
      ]);

      // Second call: sips optimization (3 args: command, logPrefix, useShell)
      expect(capturedArgs[1]).toEqual([
        [
          'sips',
          '-Z',
          '800',
          '-s',
          'format',
          'jpeg',
          '-s',
          'formatOptions',
          '75',
          '/tmp/screenshot_mock-uuid-123.png',
          '--out',
          '/tmp/screenshot_optimized_mock-uuid-123.jpg',
        ],
        '[Screenshot]: optimize image',
        false,
      ]);
    });

    it('should handle SystemError exceptions', async () => {
      const { SystemError } = await import('../../../../utils/index.js');
      const mockExecutor = createMockExecutor(new SystemError('System error occurred'));

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
      const mockExecutor = createMockExecutor(new Error('Unexpected error'));

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
      const mockExecutor = createMockExecutor('String error');

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
