import { vi, describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { EventEmitter } from 'events';
import screenshotPlugin from '../../simulator-workspace/screenshot.ts';

// Mock only child_process at the lowest level
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

// Mock file system operations
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  unlink: vi.fn(),
}));

vi.mock('os', () => ({
  tmpdir: vi.fn(() => '/tmp'),
}));

vi.mock('path', () => ({
  join: vi.fn((...args: string[]) => args.join('/')),
  dirname: vi.fn((path: string) => path.split('/').slice(0, -1).join('/')),
}));

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid-123'),
}));

// Mock child process class
class MockChildProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  pid = 12345;
}

describe('screenshot plugin', () => {
  let mockSpawn: any;
  let mockProcess: MockChildProcess;
  let mockReadFile: any;
  let mockUnlink: any;

  beforeEach(async () => {
    const { spawn } = await import('child_process');
    const fs = await import('fs/promises');

    mockSpawn = vi.mocked(spawn);
    mockReadFile = vi.mocked(fs.readFile);
    mockUnlink = vi.mocked(fs.unlink);

    mockProcess = new MockChildProcess();
    mockSpawn.mockReturnValue(mockProcess);

    vi.clearAllMocks();
  });

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

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should capture screenshot successfully', async () => {
      // Set up successful command execution
      setTimeout(() => {
        mockProcess.stdout.emit('data', '');
        mockProcess.emit('close', 0);
      }, 0);

      const mockImageBuffer = Buffer.from('fake-image-data');
      mockReadFile.mockResolvedValue(mockImageBuffer);
      mockUnlink.mockResolvedValue(undefined);

      const result = await screenshotPlugin.handler({
        simulatorUuid: 'test-uuid',
      });

      // Verify command was called correctly (direct execution, not shell)
      expect(mockSpawn).toHaveBeenCalledWith(
        'xcrun',
        ['simctl', 'io', 'test-uuid', 'screenshot', '/tmp/screenshot_mock-uuid-123.png'],
        expect.any(Object),
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
      const result = await screenshotPlugin.handler({});

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
      // Set up command failure
      setTimeout(() => {
        mockProcess.stderr.emit('data', 'Command failed');
        mockProcess.emit('close', 1);
      }, 0);

      const result = await screenshotPlugin.handler({
        simulatorUuid: 'test-uuid',
      });

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
      // Set up successful command execution
      setTimeout(() => {
        mockProcess.stdout.emit('data', '');
        mockProcess.emit('close', 0);
      }, 0);

      mockReadFile.mockRejectedValue(new Error('File not found'));

      const result = await screenshotPlugin.handler({
        simulatorUuid: 'test-uuid',
      });

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

    it('should call correct command', async () => {
      // Set up successful command execution
      setTimeout(() => {
        mockProcess.stdout.emit('data', '');
        mockProcess.emit('close', 0);
      }, 0);

      const mockImageBuffer = Buffer.from('fake-image-data');
      mockReadFile.mockResolvedValue(mockImageBuffer);
      mockUnlink.mockResolvedValue(undefined);

      await screenshotPlugin.handler({
        simulatorUuid: 'test-uuid',
      });

      expect(mockSpawn).toHaveBeenCalledWith(
        'xcrun',
        ['simctl', 'io', 'test-uuid', 'screenshot', '/tmp/screenshot_mock-uuid-123.png'],
        expect.any(Object),
      );
    });
  });
});
