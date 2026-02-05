/**
 * Tests for screenshot plugin
 * Following CLAUDE.md testing standards with literal validation
 * Using pure dependency injection for deterministic testing
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as z from 'zod';
import {
  createMockExecutor,
  createMockFileSystemExecutor,
  createCommandMatchingMockExecutor,
  mockProcess,
} from '../../../../test-utils/mock-executors.ts';
import type { CommandExecutor } from '../../../../utils/execution/index.ts';
import { SystemError } from '../../../../utils/responses/index.ts';
import { sessionStore } from '../../../../utils/session-store.ts';
import { schema, handler, screenshotLogic } from '../../ui-automation/screenshot.ts';

describe('screenshot plugin', () => {
  beforeEach(() => {
    sessionStore.clear();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have handler function', () => {
      expect(typeof handler).toBe('function');
    });

    it('should have correct schema validation', () => {
      const schemaObj = z.object(schema);

      expect(schemaObj.safeParse({}).success).toBe(true);

      const withSimId = schemaObj.safeParse({
        simulatorId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(withSimId.success).toBe(true);
      expect('simulatorId' in (withSimId.data as Record<string, unknown>)).toBe(false);
    });
  });

  describe('Command Generation', () => {
    // Mock device list JSON for proper device name lookup
    const mockDeviceListJson = JSON.stringify({
      devices: {
        'com.apple.CoreSimulator.SimRuntime.iOS-17-2': [
          { udid: 'test-uuid', name: 'iPhone 15 Pro', state: 'Booted' },
          { udid: 'another-uuid', name: 'iPhone 15', state: 'Booted' },
        ],
      },
    });

    it('should generate correct simctl and sips commands', async () => {
      const capturedCommands: string[][] = [];

      // Wrap to capture commands and return appropriate mock responses
      const capturingExecutor = async (command: string[], ...args: any[]) => {
        capturedCommands.push(command);
        const cmdStr = command.join(' ');
        // Return device list JSON for list command
        if (cmdStr.includes('simctl list devices')) {
          return {
            success: true,
            output: mockDeviceListJson,
            error: undefined,
            process: mockProcess,
          };
        }
        // Return success for all other commands
        return { success: true, output: '', error: undefined, process: mockProcess };
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
          simulatorId: 'test-uuid',
        },
        capturingExecutor,
        mockFileSystemExecutor,
        mockPathDeps,
        mockUuidDeps,
      );

      // Should execute all commands in sequence: screenshot, list devices, orientation detection, optimization
      expect(capturedCommands).toHaveLength(4);

      // First command: xcrun simctl screenshot
      expect(capturedCommands[0]).toEqual([
        'xcrun',
        'simctl',
        'io',
        'test-uuid',
        'screenshot',
        '/tmp/screenshot_mock-uuid-123.png',
      ]);

      // Second command: xcrun simctl list devices (to get device name)
      expect(capturedCommands[1][0]).toBe('xcrun');
      expect(capturedCommands[1][1]).toBe('simctl');
      expect(capturedCommands[1][2]).toBe('list');

      // Third command: swift orientation detection
      expect(capturedCommands[2][0]).toBe('swift');
      expect(capturedCommands[2][1]).toBe('-e');

      // Fourth command: sips optimization
      expect(capturedCommands[3]).toEqual([
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

      // Wrap to capture commands and return appropriate mock responses
      const capturingExecutor = async (command: string[], ...args: any[]) => {
        capturedCommands.push(command);
        const cmdStr = command.join(' ');
        // Return device list JSON for list command
        if (cmdStr.includes('simctl list devices')) {
          return {
            success: true,
            output: mockDeviceListJson,
            error: undefined,
            process: mockProcess,
          };
        }
        // Return success for all other commands
        return { success: true, output: '', error: undefined, process: mockProcess };
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
          simulatorId: 'another-uuid',
        },
        capturingExecutor,
        mockFileSystemExecutor,
        mockPathDeps,
        mockUuidDeps,
      );

      // Should execute all commands in sequence: screenshot, list devices, orientation detection, optimization
      expect(capturedCommands).toHaveLength(4);

      // First command: xcrun simctl screenshot
      expect(capturedCommands[0]).toEqual([
        'xcrun',
        'simctl',
        'io',
        'another-uuid',
        'screenshot',
        '/tmp/screenshot_different-uuid-456.png',
      ]);

      // Second command: xcrun simctl list devices (to get device name)
      expect(capturedCommands[1][0]).toBe('xcrun');
      expect(capturedCommands[1][1]).toBe('simctl');
      expect(capturedCommands[1][2]).toBe('list');

      // Third command: swift orientation detection
      expect(capturedCommands[2][0]).toBe('swift');
      expect(capturedCommands[2][1]).toBe('-e');

      // Fourth command: sips optimization
      expect(capturedCommands[3]).toEqual([
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

      // Wrap to capture commands and return appropriate mock responses
      const capturingExecutor = async (command: string[], ...args: any[]) => {
        capturedCommands.push(command);
        const cmdStr = command.join(' ');
        // Return device list JSON for list command
        if (cmdStr.includes('simctl list devices')) {
          return {
            success: true,
            output: mockDeviceListJson,
            error: undefined,
            process: mockProcess,
          };
        }
        // Return success for all other commands
        return { success: true, output: '', error: undefined, process: mockProcess };
      };

      const mockFileSystemExecutor = createMockFileSystemExecutor({
        readFile: async () => 'fake-image-data',
      });

      await screenshotLogic(
        {
          simulatorId: 'test-uuid',
        },
        capturingExecutor,
        mockFileSystemExecutor,
      );

      // Should execute all commands in sequence: screenshot, list devices, orientation detection, optimization
      expect(capturedCommands).toHaveLength(4);

      // First command should be generated with real os.tmpdir, path.join, and uuidv4
      const firstCommand = capturedCommands[0];
      expect(firstCommand).toHaveLength(6);
      expect(firstCommand[0]).toBe('xcrun');
      expect(firstCommand[1]).toBe('simctl');
      expect(firstCommand[2]).toBe('io');
      expect(firstCommand[3]).toBe('test-uuid');
      expect(firstCommand[4]).toBe('screenshot');
      expect(firstCommand[5]).toMatch(/\/.*\/screenshot_.*\.png/);

      // Second command should be xcrun simctl list devices
      expect(capturedCommands[1][0]).toBe('xcrun');
      expect(capturedCommands[1][1]).toBe('simctl');
      expect(capturedCommands[1][2]).toBe('list');

      // Third command should be swift orientation detection
      expect(capturedCommands[2][0]).toBe('swift');
      expect(capturedCommands[2][1]).toBe('-e');

      // Fourth command should be sips optimization
      const thirdCommand = capturedCommands[3];
      expect(thirdCommand[0]).toBe('sips');
      expect(thirdCommand[1]).toBe('-Z');
      expect(thirdCommand[2]).toBe('800');
      // Should have proper PNG input and JPG output paths
      expect(thirdCommand[thirdCommand.length - 3]).toMatch(/\/.*\/screenshot_.*\.png/);
      expect(thirdCommand[thirdCommand.length - 1]).toMatch(/\/.*\/screenshot_optimized_.*\.jpg/);
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
          simulatorId: 'test-uuid',
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

    it('should handle missing simulatorId via handler', async () => {
      const result = await handler({});

      expect(result.isError).toBe(true);
      const message = result.content[0].text;
      expect(message).toContain('Missing required session defaults');
      expect(message).toContain('simulatorId is required');
      expect(message).toContain('session-set-defaults');
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
          simulatorId: 'test-uuid',
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
          simulatorId: 'test-uuid',
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

      // Mock device list JSON for proper device name lookup
      const mockDeviceListJson = JSON.stringify({
        devices: {
          'com.apple.CoreSimulator.SimRuntime.iOS-17-2': [
            { udid: 'test-uuid', name: 'iPhone 15 Pro', state: 'Booted' },
          ],
        },
      });

      // Capture all command executions and return appropriate mock responses
      const capturingExecutor: CommandExecutor = async (...args) => {
        capturedArgs.push(args);
        const command = args[0] as string[];
        const cmdStr = command.join(' ');
        // Return device list JSON for list command
        if (cmdStr.includes('simctl list devices')) {
          return {
            success: true,
            output: mockDeviceListJson,
            error: undefined,
            process: mockProcess,
          };
        }
        // Return success for all other commands
        return { success: true, output: '', error: undefined, process: mockProcess };
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
          simulatorId: 'test-uuid',
        },
        capturingExecutor,
        mockFileSystemExecutor,
        mockPathDeps,
        mockUuidDeps,
      );

      // Should capture all command executions: screenshot, list devices, orientation detection, optimization
      expect(capturedArgs).toHaveLength(4);

      // First call: xcrun simctl screenshot (3 args: command, logPrefix, useShell)
      expect(capturedArgs[0]).toEqual([
        ['xcrun', 'simctl', 'io', 'test-uuid', 'screenshot', '/tmp/screenshot_mock-uuid-123.png'],
        '[Screenshot]: screenshot',
        false,
      ]);

      // Second call: xcrun simctl list devices (to get device name)
      expect(capturedArgs[1][0][0]).toBe('xcrun');
      expect(capturedArgs[1][0][1]).toBe('simctl');
      expect(capturedArgs[1][0][2]).toBe('list');
      expect(capturedArgs[1][1]).toBe('[Screenshot]: list devices');
      expect(capturedArgs[1][2]).toBe(false);

      // Third call: swift orientation detection
      expect(capturedArgs[2][0][0]).toBe('swift');
      expect(capturedArgs[2][0][1]).toBe('-e');
      expect(capturedArgs[2][1]).toBe('[Screenshot]: detect orientation');
      expect(capturedArgs[2][2]).toBe(false);

      // Fourth call: sips optimization (3 args: command, logPrefix, useShell)
      expect(capturedArgs[3]).toEqual([
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
          simulatorId: 'test-uuid',
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
          simulatorId: 'test-uuid',
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
          simulatorId: 'test-uuid',
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
          simulatorId: 'test-uuid',
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
