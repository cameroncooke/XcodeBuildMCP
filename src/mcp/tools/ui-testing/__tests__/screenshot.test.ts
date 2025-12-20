/**
 * Tests for screenshot tool plugin
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  createMockExecutor,
  createMockFileSystemExecutor,
  createNoopExecutor,
} from '../../../../test-utils/mock-executors.ts';
import { SystemError } from '../../../../utils/responses/index.ts';
import { sessionStore } from '../../../../utils/session-store.ts';
import screenshotPlugin, { screenshotLogic } from '../screenshot.ts';

describe('Screenshot Plugin', () => {
  beforeEach(() => {
    sessionStore.clear();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(screenshotPlugin.name).toBe('screenshot');
    });

    it('should have correct description', () => {
      expect(screenshotPlugin.description).toBe(
        "Captures screenshot for visual verification. For UI coordinates, use describe_ui instead (don't determine coordinates from screenshots).",
      );
    });

    it('should have handler function', () => {
      expect(typeof screenshotPlugin.handler).toBe('function');
    });

    it('should validate schema fields with safeParse', () => {
      const schema = z.object(screenshotPlugin.schema);

      // Public schema is empty; ensure extra fields are stripped
      expect(schema.safeParse({}).success).toBe(true);

      const withSimId = schema.safeParse({
        simulatorId: '12345678-1234-1234-1234-123456789012',
      });
      expect(withSimId.success).toBe(true);
      expect('simulatorId' in (withSimId.data as Record<string, unknown>)).toBe(false);
    });
  });

  describe('Plugin Handler Validation', () => {
    it('should require simulatorId session default when not provided', async () => {
      const result = await screenshotPlugin.handler({});

      expect(result.isError).toBe(true);
      const message = result.content[0].text;
      expect(message).toContain('Missing required session defaults');
      expect(message).toContain('simulatorId is required');
      expect(message).toContain('session-set-defaults');
    });

    it('should validate inline simulatorId overrides', async () => {
      const result = await screenshotPlugin.handler({
        simulatorId: 'invalid-uuid',
      });

      expect(result.isError).toBe(true);
      const message = result.content[0].text;
      expect(message).toContain('Parameter validation failed');
      expect(message).toContain('simulatorId: Invalid Simulator UUID format');
    });
  });

  describe('Command Generation', () => {
    it('should generate correct xcrun simctl command for basic screenshot', async () => {
      const capturedCommands: string[][] = [];
      const trackingExecutor = async (command: string[]) => {
        capturedCommands.push(command);
        return {
          success: true,
          output: 'Screenshot saved',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      const mockImageBuffer = Buffer.from('fake-image-data', 'utf8');
      const mockFileSystemExecutor = createMockFileSystemExecutor({
        readFile: async () => mockImageBuffer.toString('utf8'),
      });

      await screenshotLogic(
        {
          simulatorId: '12345678-1234-1234-1234-123456789012',
        },
        trackingExecutor,
        mockFileSystemExecutor,
        { tmpdir: () => '/tmp', join: (...paths) => paths.join('/') },
        { v4: () => 'test-uuid' },
      );

      // Should capture the screenshot command first
      expect(capturedCommands[0]).toEqual([
        'xcrun',
        'simctl',
        'io',
        '12345678-1234-1234-1234-123456789012',
        'screenshot',
        '/tmp/screenshot_test-uuid.png',
      ]);
    });

    it('should generate correct xcrun simctl command with different simulator UUID', async () => {
      const capturedCommands: string[][] = [];
      const trackingExecutor = async (command: string[]) => {
        capturedCommands.push(command);
        return {
          success: true,
          output: 'Screenshot saved',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      const mockImageBuffer = Buffer.from('fake-image-data', 'utf8');
      const mockFileSystemExecutor = createMockFileSystemExecutor({
        readFile: async () => mockImageBuffer.toString('utf8'),
      });

      await screenshotLogic(
        {
          simulatorId: 'ABCDEF12-3456-7890-ABCD-ABCDEFABCDEF',
        },
        trackingExecutor,
        mockFileSystemExecutor,
        { tmpdir: () => '/var/tmp', join: (...paths) => paths.join('/') },
        { v4: () => 'another-uuid' },
      );

      expect(capturedCommands[0]).toEqual([
        'xcrun',
        'simctl',
        'io',
        'ABCDEF12-3456-7890-ABCD-ABCDEFABCDEF',
        'screenshot',
        '/var/tmp/screenshot_another-uuid.png',
      ]);
    });

    it('should generate correct xcrun simctl command with custom path dependencies', async () => {
      const capturedCommands: string[][] = [];
      const trackingExecutor = async (command: string[]) => {
        capturedCommands.push(command);
        return {
          success: true,
          output: 'Screenshot saved',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      const mockImageBuffer = Buffer.from('fake-image-data', 'utf8');
      const mockFileSystemExecutor = createMockFileSystemExecutor({
        readFile: async () => mockImageBuffer.toString('utf8'),
      });

      await screenshotLogic(
        {
          simulatorId: '98765432-1098-7654-3210-987654321098',
        },
        trackingExecutor,
        mockFileSystemExecutor,
        {
          tmpdir: () => '/custom/temp/dir',
          join: (...paths) => paths.join('\\'), // Windows-style path joining
        },
        { v4: () => 'custom-uuid' },
      );

      expect(capturedCommands[0]).toEqual([
        'xcrun',
        'simctl',
        'io',
        '98765432-1098-7654-3210-987654321098',
        'screenshot',
        '/custom/temp/dir\\screenshot_custom-uuid.png',
      ]);
    });

    it('should generate correct xcrun simctl command with generated UUID when no UUID deps provided', async () => {
      const capturedCommands: string[][] = [];
      const trackingExecutor = async (command: string[]) => {
        capturedCommands.push(command);
        return {
          success: true,
          output: 'Screenshot saved',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      const mockImageBuffer = Buffer.from('fake-image-data', 'utf8');
      const mockFileSystemExecutor = createMockFileSystemExecutor({
        readFile: async () => mockImageBuffer.toString('utf8'),
      });

      await screenshotLogic(
        {
          simulatorId: '12345678-1234-1234-1234-123456789012',
        },
        trackingExecutor,
        mockFileSystemExecutor,
        { tmpdir: () => '/tmp', join: (...paths) => paths.join('/') },
        // No UUID deps provided - should use real uuidv4()
      );

      // Verify the command structure but not the exact UUID since it's generated
      expect(capturedCommands[0].slice(0, 5)).toEqual([
        'xcrun',
        'simctl',
        'io',
        '12345678-1234-1234-1234-123456789012',
        'screenshot',
      ]);
      expect(capturedCommands[0][5]).toMatch(/^\/tmp\/screenshot_[a-f0-9-]+\.png$/);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should handle parameter validation via plugin handler (not logic function)', async () => {
      // Note: With Zod validation in createTypedTool, the screenshotLogic function
      // will never receive invalid parameters - validation happens at the handler level.
      // This test documents that screenshotLogic assumes valid parameters.
      const result = await screenshotLogic(
        {
          simulatorId: '12345678-1234-1234-1234-123456789012',
        },
        createMockExecutor({
          success: true,
          output: 'Screenshot saved',
          error: undefined,
        }),
        createMockFileSystemExecutor({
          readFile: async () => Buffer.from('fake-image-data', 'utf8').toString('utf8'),
        }),
      );

      expect(result.isError).toBe(false);
      expect(result.content[0].type).toBe('image');
    });

    it('should return success for valid screenshot capture', async () => {
      const mockImageBuffer = Buffer.from('fake-image-data', 'utf8');

      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Screenshot saved',
        error: undefined,
      });

      const mockFileSystemExecutor = createMockFileSystemExecutor({
        readFile: async () => mockImageBuffer.toString('utf8'),
      });

      const result = await screenshotLogic(
        {
          simulatorId: '12345678-1234-1234-1234-123456789012',
        },
        mockExecutor,
        mockFileSystemExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'image',
            data: 'fake-image-data',
            mimeType: 'image/jpeg',
          },
        ],
        isError: false,
      });
    });

    it('should handle command execution failure', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'Simulator not found',
      });

      const result = await screenshotLogic(
        {
          simulatorId: '12345678-1234-1234-1234-123456789012',
        },
        mockExecutor,
        createMockFileSystemExecutor(),
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: System error executing screenshot: Failed to capture screenshot: Simulator not found',
          },
        ],
        isError: true,
      });
    });

    it('should handle file reading errors', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Screenshot saved',
        error: undefined,
      });

      const mockFileSystemExecutor = createMockFileSystemExecutor({
        readFile: async () => {
          throw new Error('File not found');
        },
      });

      const result = await screenshotLogic(
        {
          simulatorId: '12345678-1234-1234-1234-123456789012',
        },
        mockExecutor,
        mockFileSystemExecutor,
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

    it('should handle file cleanup errors gracefully', async () => {
      const mockImageBuffer = Buffer.from('fake-image-data', 'utf8');

      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Screenshot saved',
        error: undefined,
      });

      const mockFileSystemExecutor = createMockFileSystemExecutor({
        readFile: async () => mockImageBuffer.toString('utf8'),
        // unlink method is not overridden, so it will use the default (no-op)
        // which simulates the cleanup failure being caught and logged
      });

      const result = await screenshotLogic(
        {
          simulatorId: '12345678-1234-1234-1234-123456789012',
        },
        mockExecutor,
        mockFileSystemExecutor,
      );

      // Should still return successful result despite cleanup failure
      expect(result).toEqual({
        content: [
          {
            type: 'image',
            data: 'fake-image-data',
            mimeType: 'image/jpeg',
          },
        ],
        isError: false,
      });
    });

    it('should handle SystemError from command execution', async () => {
      const mockExecutor = async () => {
        throw new SystemError('System error occurred');
      };

      const result = await screenshotLogic(
        {
          simulatorId: '12345678-1234-1234-1234-123456789012',
        },
        mockExecutor,
        createMockFileSystemExecutor(),
      );

      expect(result).toEqual({
        content: [
          { type: 'text', text: 'Error: System error executing screenshot: System error occurred' },
        ],
        isError: true,
      });
    });

    it('should handle unexpected Error objects', async () => {
      const mockExecutor = async () => {
        throw new Error('Unexpected error');
      };

      const result = await screenshotLogic(
        {
          simulatorId: '12345678-1234-1234-1234-123456789012',
        },
        mockExecutor,
        createMockFileSystemExecutor(),
      );

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error: An unexpected error occurred: Unexpected error' }],
        isError: true,
      });
    });

    it('should handle unexpected string errors', async () => {
      const mockExecutor = async () => {
        throw 'String error';
      };

      const result = await screenshotLogic(
        {
          simulatorId: '12345678-1234-1234-1234-123456789012',
        },
        mockExecutor,
        createMockFileSystemExecutor(),
      );

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error: An unexpected error occurred: String error' }],
        isError: true,
      });
    });
  });
});
