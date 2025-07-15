/**
 * Tests for swift_package_run plugin
 * Following CLAUDE.md testing standards with literal validation
 * Integration tests using dependency injection for deterministic testing
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import swiftPackageRun from '../swift_package_run.ts';

// Pure dependency injection mock for spawn
function createMockSpawn() {
  const calls: any[] = [];
  const mockProcess = {
    pid: 12345,
    stdout: { on: (event: string, callback: (data: any) => void) => {} },
    stderr: { on: (event: string, callback: (data: any) => void) => {} },
    on: (event: string, callback: (code?: number, signal?: string) => void) => {},
  };

  const mockSpawn = (...args: any[]) => {
    calls.push(args);
    return mockProcess;
  };

  return { mockSpawn, mockProcess, calls };
}

describe('swift_package_run plugin', () => {
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
      const { mockSpawn, calls } = createMockSpawn();

      swiftPackageRun.handler(
        {
          packagePath: '/test/package',
        },
        mockSpawn,
      );

      expect(calls[0]).toEqual([
        'swift',
        ['run', '--package-path', '/test/package'],
        {
          cwd: '/test/package',
          env: process.env,
        },
      ]);
    });

    it('should build correct command with release configuration', () => {
      const { mockSpawn, calls } = createMockSpawn();

      swiftPackageRun.handler(
        {
          packagePath: '/test/package',
          configuration: 'release',
        },
        mockSpawn,
      );

      expect(calls[0]).toEqual([
        'swift',
        ['run', '--package-path', '/test/package', '-c', 'release'],
        {
          cwd: '/test/package',
          env: process.env,
        },
      ]);
    });

    it('should build correct command with executable name', () => {
      const { mockSpawn, calls } = createMockSpawn();

      swiftPackageRun.handler(
        {
          packagePath: '/test/package',
          executableName: 'MyApp',
        },
        mockSpawn,
      );

      expect(calls[0]).toEqual([
        'swift',
        ['run', '--package-path', '/test/package', 'MyApp'],
        {
          cwd: '/test/package',
          env: process.env,
        },
      ]);
    });

    it('should build correct command with arguments', () => {
      const { mockSpawn, calls } = createMockSpawn();

      swiftPackageRun.handler(
        {
          packagePath: '/test/package',
          arguments: ['arg1', 'arg2'],
        },
        mockSpawn,
      );

      expect(calls[0]).toEqual([
        'swift',
        ['run', '--package-path', '/test/package', '--', 'arg1', 'arg2'],
        {
          cwd: '/test/package',
          env: process.env,
        },
      ]);
    });

    it('should build correct command with parseAsLibrary flag', () => {
      const { mockSpawn, calls } = createMockSpawn();

      swiftPackageRun.handler(
        {
          packagePath: '/test/package',
          parseAsLibrary: true,
        },
        mockSpawn,
      );

      expect(calls[0]).toEqual([
        'swift',
        ['run', '--package-path', '/test/package', '-Xswiftc', '-parse-as-library'],
        {
          cwd: '/test/package',
          env: process.env,
        },
      ]);
    });

    it('should build correct command with all parameters', () => {
      const { mockSpawn, calls } = createMockSpawn();

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

      expect(calls[0]).toEqual([
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
        {
          cwd: '/test/package',
          env: process.env,
        },
      ]);
    });
  });

  describe('Response Logic Testing', () => {
    it('should return validation error for missing packagePath', async () => {
      const { mockSpawn } = createMockSpawn();
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
      const { mockSpawn } = createMockSpawn();
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
      // Create custom process with success behavior - immediate resolution
      const mockProcess = {
        pid: 12345,
        stdout: {
          on: (event: string, callback: (data: any) => void) => {
            if (event === 'data') {
              // Immediate callback, no setTimeout
              callback('Hello, World!');
            }
          },
        },
        stderr: {
          on: (event: string, callback: (data: any) => void) => {},
        },
        on: (event: string, callback: (code?: number, signal?: string) => void) => {
          if (event === 'exit') {
            // Use setImmediate for next tick, no setTimeout
            setImmediate(() => callback(0, null));
          }
        },
      };

      const customMockSpawn = () => mockProcess;

      const result = await swiftPackageRun.handler(
        {
          packagePath: '/test/package',
        },
        customMockSpawn,
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
      // Create custom process with failure behavior - immediate resolution
      const mockProcess = {
        pid: 12345,
        stdout: {
          on: (event: string, callback: (data: any) => void) => {},
        },
        stderr: {
          on: (event: string, callback: (data: any) => void) => {
            if (event === 'data') {
              // Immediate callback, no setTimeout
              callback('Compilation failed');
            }
          },
        },
        on: (event: string, callback: (code?: number, signal?: string) => void) => {
          if (event === 'exit') {
            // Use setImmediate for next tick, no setTimeout
            setImmediate(() => callback(1, null));
          }
        },
      };

      const customMockSpawn = () => mockProcess;

      const result = await swiftPackageRun.handler(
        {
          packagePath: '/test/package',
        },
        customMockSpawn,
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
      // Create custom process with error behavior - immediate resolution
      const mockProcess = {
        pid: 12345,
        stdout: {
          on: (event: string, callback: (data: any) => void) => {},
        },
        stderr: {
          on: (event: string, callback: (data: any) => void) => {},
        },
        on: (event: string, callback: (code?: number, signal?: string, error?: Error) => void) => {
          if (event === 'exit') {
            // Use setImmediate for next tick, no setTimeout
            setImmediate(() => callback(1, null));
          } else if (event === 'error') {
            // Use setImmediate for next tick, no setTimeout
            setImmediate(() => callback(new Error('Command not found')));
          }
        },
      };

      const customMockSpawn = () => mockProcess;

      const result = await swiftPackageRun.handler(
        {
          packagePath: '/test/package',
        },
        customMockSpawn,
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
