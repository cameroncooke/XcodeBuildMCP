/**
 * Tests for swift_package_build plugin
 * Following CLAUDE.md testing standards with literal validation
 * Integration tests that mock only the lowest-level spawn calls
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { EventEmitter } from 'events';
import { z } from 'zod';
import swiftPackageBuild from '../swift_package_build.ts';

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

describe('swift_package_build plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(swiftPackageBuild.name).toBe('swift_package_build');
    });

    it('should have correct description', () => {
      expect(swiftPackageBuild.description).toBe('Builds a Swift Package with swift build');
    });

    it('should have handler function', () => {
      expect(typeof swiftPackageBuild.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Test required fields
      expect(swiftPackageBuild.schema.packagePath.safeParse('/test/package').success).toBe(true);
      expect(swiftPackageBuild.schema.packagePath.safeParse('').success).toBe(true);

      // Test optional fields
      expect(swiftPackageBuild.schema.targetName.safeParse('MyTarget').success).toBe(true);
      expect(swiftPackageBuild.schema.targetName.safeParse(undefined).success).toBe(true);
      expect(swiftPackageBuild.schema.configuration.safeParse('debug').success).toBe(true);
      expect(swiftPackageBuild.schema.configuration.safeParse('release').success).toBe(true);
      expect(swiftPackageBuild.schema.configuration.safeParse(undefined).success).toBe(true);
      expect(swiftPackageBuild.schema.architectures.safeParse(['arm64']).success).toBe(true);
      expect(swiftPackageBuild.schema.architectures.safeParse(undefined).success).toBe(true);
      expect(swiftPackageBuild.schema.parseAsLibrary.safeParse(true).success).toBe(true);
      expect(swiftPackageBuild.schema.parseAsLibrary.safeParse(undefined).success).toBe(true);

      // Test invalid inputs
      expect(swiftPackageBuild.schema.packagePath.safeParse(null).success).toBe(false);
      expect(swiftPackageBuild.schema.configuration.safeParse('invalid').success).toBe(false);
      expect(swiftPackageBuild.schema.architectures.safeParse('not-array').success).toBe(false);
      expect(swiftPackageBuild.schema.parseAsLibrary.safeParse('yes').success).toBe(false);
    });
  });

  let mockSpawn: MockedFunction<any>;

  beforeEach(async () => {
    const { spawn } = await import('child_process');
    mockSpawn = spawn as MockedFunction<any>;
    vi.clearAllMocks();
  });

  describe('Command Generation Testing', () => {
    it('should build correct command for basic build', async () => {
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      const handlerPromise = swiftPackageBuild.handler({
        packagePath: '/test/package',
      });

      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Build succeeded');
        mockProcess.emit('close', 0);
      }, 0);

      await handlerPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        'sh',
        ['-c', 'swift build --package-path /test/package'],
        expect.any(Object),
      );
    });

    it('should build correct command with release configuration', async () => {
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      const handlerPromise = swiftPackageBuild.handler({
        packagePath: '/test/package',
        configuration: 'release',
      });

      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Build succeeded');
        mockProcess.emit('close', 0);
      }, 0);

      await handlerPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        'sh',
        ['-c', 'swift build --package-path /test/package -c release'],
        expect.any(Object),
      );
    });

    it('should build correct command with all parameters', async () => {
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      const handlerPromise = swiftPackageBuild.handler({
        packagePath: '/test/package',
        targetName: 'MyTarget',
        configuration: 'release',
        architectures: ['arm64', 'x86_64'],
        parseAsLibrary: true,
      });

      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Build succeeded');
        mockProcess.emit('close', 0);
      }, 0);

      await handlerPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        'sh',
        [
          '-c',
          'swift build --package-path /test/package -c release --target MyTarget --arch arm64 --arch x86_64 -Xswiftc -parse-as-library',
        ],
        expect.any(Object),
      );
    });
  });

  describe('Response Logic Testing', () => {
    it('should return validation error for missing packagePath', async () => {
      const result = await swiftPackageBuild.handler({});

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

    it('should return successful build response', async () => {
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      const handlerPromise = swiftPackageBuild.handler({
        packagePath: '/test/package',
      });

      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Build complete.');
        mockProcess.emit('close', 0);
      }, 0);

      const result = await handlerPromise;

      expect(result).toEqual({
        content: [
          { type: 'text', text: '✅ Swift package build succeeded.' },
          {
            type: 'text',
            text: '💡 Next: Run tests with swift_package_test or execute with swift_package_run',
          },
          { type: 'text', text: 'Build complete.' },
        ],
        isError: false,
      });
    });

    it('should return error response for build failure', async () => {
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      const handlerPromise = swiftPackageBuild.handler({
        packagePath: '/test/package',
      });

      setTimeout(() => {
        mockProcess.stderr.emit('data', 'Compilation failed: error in main.swift');
        mockProcess.emit('close', 1);
      }, 0);

      const result = await handlerPromise;

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Swift package build failed\nDetails: Compilation failed: error in main.swift',
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

      const result = await swiftPackageBuild.handler({
        packagePath: '/test/package',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Failed to execute swift build\nDetails: spawn ENOENT',
          },
        ],
        isError: true,
      });
    });

    it('should handle successful build with parameters', async () => {
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      const handlerPromise = swiftPackageBuild.handler({
        packagePath: '/test/package',
        targetName: 'MyTarget',
        configuration: 'release',
        architectures: ['arm64', 'x86_64'],
        parseAsLibrary: true,
      });

      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Build complete.');
        mockProcess.emit('close', 0);
      }, 0);

      const result = await handlerPromise;

      expect(result).toEqual({
        content: [
          { type: 'text', text: '✅ Swift package build succeeded.' },
          {
            type: 'text',
            text: '💡 Next: Run tests with swift_package_test or execute with swift_package_run',
          },
          { type: 'text', text: 'Build complete.' },
        ],
        isError: false,
      });
    });
  });
});
