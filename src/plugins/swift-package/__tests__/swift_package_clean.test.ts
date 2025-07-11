/**
 * Tests for swift_package_clean plugin
 * Following CLAUDE.md testing standards with literal validation
 * Integration tests that mock only the lowest-level spawn calls
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { EventEmitter } from 'events';
import { z } from 'zod';
import swiftPackageClean from '../swift_package_clean.ts';

// Mock only child_process at the lowest system level
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

// Create a mock ChildProcess that extends EventEmitter
class MockChildProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  pid = 12345;

  constructor() {
    super();
  }
}

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

  let mockSpawn: MockedFunction<any>;

  beforeEach(async () => {
    const { spawn } = await import('child_process');
    mockSpawn = spawn as MockedFunction<any>;
    vi.clearAllMocks();
  });

  describe('Command Generation Testing', () => {
    it('should build correct command for clean', async () => {
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      const handlerPromise = swiftPackageClean.handler({
        packagePath: '/test/package',
      });

      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Clean succeeded');
        mockProcess.emit('close', 0);
      }, 0);

      await handlerPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        'sh',
        ['-c', 'swift package --package-path /test/package clean'],
        expect.any(Object),
      );
    });
  });

  describe('Response Logic Testing', () => {
    it('should return validation error for missing packagePath', async () => {
      const result = await swiftPackageClean.handler({});

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
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      const handlerPromise = swiftPackageClean.handler({
        packagePath: '/test/package',
      });

      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Package cleaned successfully');
        mockProcess.emit('close', 0);
      }, 0);

      const result = await handlerPromise;

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
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      const handlerPromise = swiftPackageClean.handler({
        packagePath: '/test/package',
      });

      setTimeout(() => {
        mockProcess.emit('close', 0);
      }, 0);

      const result = await handlerPromise;

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
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      const handlerPromise = swiftPackageClean.handler({
        packagePath: '/test/package',
      });

      setTimeout(() => {
        mockProcess.stderr.emit('data', 'Permission denied');
        mockProcess.emit('close', 1);
      }, 0);

      const result = await handlerPromise;

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
      const mockProcess = new MockChildProcess();
      mockSpawn.mockImplementation(() => {
        setTimeout(() => {
          mockProcess.emit('error', new Error('spawn ENOENT'));
        }, 0);
        return mockProcess;
      });

      const result = await swiftPackageClean.handler({
        packagePath: '/test/package',
      });

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
