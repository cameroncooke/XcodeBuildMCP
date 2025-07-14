/**
 * Tests for swift_package_run plugin
 * Following CLAUDE.md testing standards with literal validation
 * Integration tests using dependency injection for deterministic testing
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import swiftPackageRun from '../swift_package_run.ts';

describe('swift_package_run plugin', () => {
  let mockSpawn: ReturnType<typeof vi.fn>;
  let mockProcess: any;

  beforeEach(() => {
    mockProcess = {
      pid: 12345,
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn(),
    };
    mockSpawn = vi.fn().mockReturnValue(mockProcess);
    vi.clearAllMocks();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(swiftPackageRun.name).toBe('swift_package_run');
    });

    it('should have correct description', () => {
      expect(swiftPackageRun.description).toBe(
        'Runs an executable target from a Swift Package with swift run',
      );
    });

    it('should have handler function', () => {
      expect(typeof swiftPackageRun.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Test packagePath (required string)
      expect(swiftPackageRun.schema.packagePath.safeParse('valid/path').success).toBe(true);
      expect(swiftPackageRun.schema.packagePath.safeParse(null).success).toBe(false);

      // Test executableName (optional string)
      expect(swiftPackageRun.schema.executableName.safeParse('MyExecutable').success).toBe(true);
      expect(swiftPackageRun.schema.executableName.safeParse(undefined).success).toBe(true);
      expect(swiftPackageRun.schema.executableName.safeParse(123).success).toBe(false);

      // Test arguments (optional array of strings)
      expect(swiftPackageRun.schema.arguments.safeParse(['arg1', 'arg2']).success).toBe(true);
      expect(swiftPackageRun.schema.arguments.safeParse(undefined).success).toBe(true);
      expect(swiftPackageRun.schema.arguments.safeParse(['arg1', 123]).success).toBe(false);

      // Test configuration (optional enum)
      expect(swiftPackageRun.schema.configuration.safeParse('debug').success).toBe(true);
      expect(swiftPackageRun.schema.configuration.safeParse('release').success).toBe(true);
      expect(swiftPackageRun.schema.configuration.safeParse(undefined).success).toBe(true);
      expect(swiftPackageRun.schema.configuration.safeParse('invalid').success).toBe(false);

      // Test timeout (optional number)
      expect(swiftPackageRun.schema.timeout.safeParse(30).success).toBe(true);
      expect(swiftPackageRun.schema.timeout.safeParse(undefined).success).toBe(true);
      expect(swiftPackageRun.schema.timeout.safeParse('30').success).toBe(false);

      // Test background (optional boolean)
      expect(swiftPackageRun.schema.background.safeParse(true).success).toBe(true);
      expect(swiftPackageRun.schema.background.safeParse(false).success).toBe(true);
      expect(swiftPackageRun.schema.background.safeParse(undefined).success).toBe(true);
      expect(swiftPackageRun.schema.background.safeParse('true').success).toBe(false);

      // Test parseAsLibrary (optional boolean)
      expect(swiftPackageRun.schema.parseAsLibrary.safeParse(true).success).toBe(true);
      expect(swiftPackageRun.schema.parseAsLibrary.safeParse(false).success).toBe(true);
      expect(swiftPackageRun.schema.parseAsLibrary.safeParse(undefined).success).toBe(true);
      expect(swiftPackageRun.schema.parseAsLibrary.safeParse('true').success).toBe(false);
    });
  });

  describe('Command Generation Testing', () => {
    it('should build correct command for basic run', () => {
      swiftPackageRun.handler(
        {
          packagePath: '/test/package',
        },
        mockSpawn,
      );

      expect(mockSpawn).toHaveBeenCalledWith(
        'swift',
        ['run', '--package-path', '/test/package'],
        expect.objectContaining({
          cwd: '/test/package',
          env: expect.any(Object),
        }),
      );
    });

    it('should build correct command with release configuration', () => {
      swiftPackageRun.handler(
        {
          packagePath: '/test/package',
          configuration: 'release',
        },
        mockSpawn,
      );

      expect(mockSpawn).toHaveBeenCalledWith(
        'swift',
        ['run', '--package-path', '/test/package', '-c', 'release'],
        expect.objectContaining({
          cwd: '/test/package',
        }),
      );
    });

    it('should build correct command with executable name', () => {
      swiftPackageRun.handler(
        {
          packagePath: '/test/package',
          executableName: 'MyApp',
        },
        mockSpawn,
      );

      expect(mockSpawn).toHaveBeenCalledWith(
        'swift',
        ['run', '--package-path', '/test/package', 'MyApp'],
        expect.objectContaining({
          cwd: '/test/package',
        }),
      );
    });

    it('should build correct command with arguments', () => {
      swiftPackageRun.handler(
        {
          packagePath: '/test/package',
          arguments: ['arg1', 'arg2'],
        },
        mockSpawn,
      );

      expect(mockSpawn).toHaveBeenCalledWith(
        'swift',
        ['run', '--package-path', '/test/package', '--', 'arg1', 'arg2'],
        expect.objectContaining({
          cwd: '/test/package',
        }),
      );
    });

    it('should build correct command with parseAsLibrary flag', () => {
      swiftPackageRun.handler(
        {
          packagePath: '/test/package',
          parseAsLibrary: true,
        },
        mockSpawn,
      );

      expect(mockSpawn).toHaveBeenCalledWith(
        'swift',
        ['run', '--package-path', '/test/package', '-Xswiftc', '-parse-as-library'],
        expect.objectContaining({
          cwd: '/test/package',
        }),
      );
    });

    it('should build correct command with all parameters', () => {
      swiftPackageRun.handler(
        {
          packagePath: '/test/package',
          executableName: 'MyApp',
          configuration: 'release',
          arguments: ['arg1'],
          parseAsLibrary: true,
        },
        mockSpawn,
      );

      expect(mockSpawn).toHaveBeenCalledWith(
        'swift',
        [
          'run',
          '--package-path',
          '/test/package',
          '-c',
          'release',
          '-Xswiftc',
          '-parse-as-library',
          'MyApp',
          '--',
          'arg1',
        ],
        expect.objectContaining({
          cwd: '/test/package',
        }),
      );
    });
  });

  describe('Response Logic Testing', () => {
    it('should return validation error for missing packagePath', async () => {
      const result = await swiftPackageRun.handler({}, mockSpawn);

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

    it('should return success response for background mode', async () => {
      const result = await swiftPackageRun.handler(
        {
          packagePath: '/test/package',
          background: true,
        },
        mockSpawn,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '🚀 Started executable in background (PID: 12345)\n💡 Process is running independently. Use swift_package_stop with PID 12345 to terminate when needed.',
          },
        ],
      });
    });

    it('should return success response for successful execution', async () => {
      const mockExitPromise = Promise.resolve();
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'exit') {
          mockExitPromise.then(() => callback(0, null));
        } else if (event === 'error') {
          // Do nothing for error in success case
        }
      });
      mockProcess.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          mockExitPromise.then(() => callback('Hello, World!'));
        }
      });
      mockProcess.stderr.on.mockImplementation(() => {});

      const result = await swiftPackageRun.handler(
        {
          packagePath: '/test/package',
        },
        mockSpawn,
      );

      expect(result).toEqual({
        content: [
          { type: 'text', text: '✅ Swift executable completed successfully.' },
          { type: 'text', text: '💡 Process finished cleanly. Check output for results.' },
          { type: 'text', text: 'Hello, World!' },
        ],
      });
    });

    it('should return error response for failed execution', async () => {
      const mockExitPromise = Promise.resolve();
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'exit') {
          mockExitPromise.then(() => callback(1, null));
        } else if (event === 'error') {
          // Do nothing for error in failure case
        }
      });
      mockProcess.stdout.on.mockImplementation(() => {});
      mockProcess.stderr.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          mockExitPromise.then(() => callback('Compilation failed'));
        }
      });

      const result = await swiftPackageRun.handler(
        {
          packagePath: '/test/package',
        },
        mockSpawn,
      );

      expect(result).toEqual({
        content: [
          { type: 'text', text: '❌ Swift executable exited with code 1.' },
          { type: 'text', text: '(no output)' },
          { type: 'text', text: 'Errors:\nCompilation failed' },
        ],
      });
    });

    it('should handle spawn process error', async () => {
      const mockExitPromise = Promise.resolve();
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'exit') {
          mockExitPromise.then(() => callback(1, null));
        } else if (event === 'error') {
          mockExitPromise.then(() => callback(new Error('Command not found')));
        }
      });
      mockProcess.stdout.on.mockImplementation(() => {});
      mockProcess.stderr.on.mockImplementation(() => {});

      const result = await swiftPackageRun.handler(
        {
          packagePath: '/test/package',
        },
        mockSpawn,
      );

      expect(result).toEqual({
        content: [
          { type: 'text', text: '❌ Swift executable exited with code 1.' },
          { type: 'text', text: '(no output)' },
          { type: 'text', text: 'Errors:\n\nProcess error: Command not found' },
        ],
      });
    });
  });
});
