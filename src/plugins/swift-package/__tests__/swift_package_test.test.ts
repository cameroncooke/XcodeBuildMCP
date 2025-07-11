/**
 * Tests for swift_package_test plugin
 * Following CLAUDE.md testing standards with literal validation
 * Integration tests that mock only the lowest-level spawn calls
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { EventEmitter } from 'events';
import { z } from 'zod';
import swiftPackageTest from '../swift_package_test.ts';

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

describe('swift_package_test plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(swiftPackageTest.name).toBe('swift_package_test');
    });

    it('should have correct description', () => {
      expect(swiftPackageTest.description).toBe('Runs tests for a Swift Package with swift test');
    });

    it('should have handler function', () => {
      expect(typeof swiftPackageTest.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Test required fields
      expect(swiftPackageTest.schema.packagePath.safeParse('/test/package').success).toBe(true);
      expect(swiftPackageTest.schema.packagePath.safeParse('').success).toBe(true);

      // Test optional fields
      expect(swiftPackageTest.schema.testProduct.safeParse('MyTests').success).toBe(true);
      expect(swiftPackageTest.schema.testProduct.safeParse(undefined).success).toBe(true);
      expect(swiftPackageTest.schema.filter.safeParse('Test.*').success).toBe(true);
      expect(swiftPackageTest.schema.filter.safeParse(undefined).success).toBe(true);
      expect(swiftPackageTest.schema.configuration.safeParse('debug').success).toBe(true);
      expect(swiftPackageTest.schema.configuration.safeParse('release').success).toBe(true);
      expect(swiftPackageTest.schema.configuration.safeParse(undefined).success).toBe(true);
      expect(swiftPackageTest.schema.parallel.safeParse(true).success).toBe(true);
      expect(swiftPackageTest.schema.parallel.safeParse(undefined).success).toBe(true);
      expect(swiftPackageTest.schema.showCodecov.safeParse(true).success).toBe(true);
      expect(swiftPackageTest.schema.showCodecov.safeParse(undefined).success).toBe(true);
      expect(swiftPackageTest.schema.parseAsLibrary.safeParse(true).success).toBe(true);
      expect(swiftPackageTest.schema.parseAsLibrary.safeParse(undefined).success).toBe(true);

      // Test invalid inputs
      expect(swiftPackageTest.schema.packagePath.safeParse(null).success).toBe(false);
      expect(swiftPackageTest.schema.configuration.safeParse('invalid').success).toBe(false);
      expect(swiftPackageTest.schema.parallel.safeParse('yes').success).toBe(false);
      expect(swiftPackageTest.schema.showCodecov.safeParse('yes').success).toBe(false);
      expect(swiftPackageTest.schema.parseAsLibrary.safeParse('yes').success).toBe(false);
    });
  });

  let mockSpawn: MockedFunction<any>;

  beforeEach(async () => {
    const { spawn } = await import('child_process');
    mockSpawn = spawn as MockedFunction<any>;
    vi.clearAllMocks();
  });

  describe('Command Generation Testing', () => {
    it('should build correct command for basic test', async () => {
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      const handlerPromise = swiftPackageTest.handler({
        packagePath: '/test/package',
      });

      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Test Passed');
        mockProcess.emit('close', 0);
      }, 0);

      await handlerPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        'sh',
        ['-c', 'swift test --package-path /test/package'],
        expect.any(Object),
      );
    });

    it('should build correct command with all parameters', async () => {
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      const handlerPromise = swiftPackageTest.handler({
        packagePath: '/test/package',
        testProduct: 'MyTests',
        filter: 'Test.*',
        configuration: 'release',
        parallel: false,
        showCodecov: true,
        parseAsLibrary: true,
      });

      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Tests completed');
        mockProcess.emit('close', 0);
      }, 0);

      await handlerPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        'sh',
        [
          '-c',
          'swift test --package-path /test/package -c release --test-product MyTests --filter Test.* --no-parallel --show-code-coverage -Xswiftc -parse-as-library',
        ],
        expect.any(Object),
      );
    });
  });

  describe('Response Logic Testing', () => {
    it('should return validation error for missing packagePath', async () => {
      const result = await swiftPackageTest.handler({});

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

    it('should return successful test response', async () => {
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      const handlerPromise = swiftPackageTest.handler({
        packagePath: '/test/package',
      });

      setTimeout(() => {
        mockProcess.stdout.emit('data', 'All tests passed.');
        mockProcess.emit('close', 0);
      }, 0);

      const result = await handlerPromise;

      expect(result).toEqual({
        content: [
          { type: 'text', text: '✅ Swift package tests completed.' },
          {
            type: 'text',
            text: '💡 Next: Execute your app with swift_package_run if tests passed',
          },
          { type: 'text', text: 'All tests passed.' },
        ],
      });
    });

    it('should return error response for test failure', async () => {
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      const handlerPromise = swiftPackageTest.handler({
        packagePath: '/test/package',
      });

      setTimeout(() => {
        mockProcess.stderr.emit('data', '2 tests failed');
        mockProcess.emit('close', 1);
      }, 0);

      const result = await handlerPromise;

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Swift package tests failed\nDetails: 2 tests failed',
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

      const result = await swiftPackageTest.handler({
        packagePath: '/test/package',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Failed to execute swift test\nDetails: spawn ENOENT',
          },
        ],
        isError: true,
      });
    });

    it('should handle successful test with parameters', async () => {
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      const handlerPromise = swiftPackageTest.handler({
        packagePath: '/test/package',
        testProduct: 'MyTests',
        filter: 'Test.*',
        configuration: 'release',
        parallel: false,
        showCodecov: true,
        parseAsLibrary: true,
      });

      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Tests completed.');
        mockProcess.emit('close', 0);
      }, 0);

      const result = await handlerPromise;

      expect(result).toEqual({
        content: [
          { type: 'text', text: '✅ Swift package tests completed.' },
          {
            type: 'text',
            text: '💡 Next: Execute your app with swift_package_run if tests passed',
          },
          { type: 'text', text: 'Tests completed.' },
        ],
      });
    });
  });
});
