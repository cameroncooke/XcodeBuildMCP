/**
 * Tests for swift_package_list plugin
 * Following CLAUDE.md testing standards with literal validation
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import swiftPackageList from '../swift_package_list.js';

describe('swift_package_list plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(swiftPackageList.name).toBe('swift_package_list');
    });

    it('should have correct description', () => {
      expect(swiftPackageList.description).toBe('Lists currently running Swift Package processes');
    });

    it('should have handler function', () => {
      expect(typeof swiftPackageList.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // The schema is an empty object, so any input should be valid
      expect(typeof swiftPackageList.schema).toBe('object');
      expect(Object.keys(swiftPackageList.schema)).toEqual([]);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return empty list when no processes are running', async () => {
      // Mock Array.from to return empty array (no processes)
      const originalArrayFrom = Array.from;
      vi.spyOn(Array, 'from').mockReturnValue([]);

      const result = await swiftPackageList.handler({});

      expect(result).toEqual({
        content: [
          { type: 'text', text: 'ℹ️ No Swift Package processes currently running.' },
          { type: 'text', text: '💡 Use swift_package_run to start an executable.' },
        ],
      });

      Array.from = originalArrayFrom;
    });

    it('should handle empty args object', async () => {
      // Mock Array.from to return empty array (no processes)
      const originalArrayFrom = Array.from;
      vi.spyOn(Array, 'from').mockReturnValue([]);

      const result = await swiftPackageList.handler({});

      expect(result).toEqual({
        content: [
          { type: 'text', text: 'ℹ️ No Swift Package processes currently running.' },
          { type: 'text', text: '💡 Use swift_package_run to start an executable.' },
        ],
      });

      Array.from = originalArrayFrom;
    });

    it('should handle null args', async () => {
      // Mock Array.from to return empty array (no processes)
      const originalArrayFrom = Array.from;
      vi.spyOn(Array, 'from').mockReturnValue([]);

      const result = await swiftPackageList.handler(null);

      expect(result).toEqual({
        content: [
          { type: 'text', text: 'ℹ️ No Swift Package processes currently running.' },
          { type: 'text', text: '💡 Use swift_package_run to start an executable.' },
        ],
      });

      Array.from = originalArrayFrom;
    });

    it('should handle undefined args', async () => {
      // Mock Array.from to return empty array (no processes)
      const originalArrayFrom = Array.from;
      vi.spyOn(Array, 'from').mockReturnValue([]);

      const result = await swiftPackageList.handler(undefined);

      expect(result).toEqual({
        content: [
          { type: 'text', text: 'ℹ️ No Swift Package processes currently running.' },
          { type: 'text', text: '💡 Use swift_package_run to start an executable.' },
        ],
      });

      Array.from = originalArrayFrom;
    });

    it('should handle args with extra properties', async () => {
      // Mock Array.from to return empty array (no processes)
      const originalArrayFrom = Array.from;
      vi.spyOn(Array, 'from').mockReturnValue([]);

      const result = await swiftPackageList.handler({
        extraProperty: 'value',
        anotherProperty: 123,
      });

      expect(result).toEqual({
        content: [
          { type: 'text', text: 'ℹ️ No Swift Package processes currently running.' },
          { type: 'text', text: '💡 Use swift_package_run to start an executable.' },
        ],
      });

      Array.from = originalArrayFrom;
    });

    it('should return single process when one process is running', async () => {
      const startedAt = new Date('2023-01-01T10:00:00.000Z');
      const mockProcess = {
        executableName: 'MyApp',
        packagePath: '/test/package',
        startedAt: startedAt,
      };

      // Mock Array.from to return one process entry
      const originalArrayFrom = Array.from;
      vi.spyOn(Array, 'from').mockReturnValue([[12345, mockProcess]]);

      // Mock Date.now to return a specific time (5 seconds after startedAt)
      const originalDateNow = Date.now;
      vi.spyOn(Date, 'now').mockReturnValue(startedAt.getTime() + 5000);

      const result = await swiftPackageList.handler({});

      expect(result).toEqual({
        content: [
          { type: 'text', text: '📋 Active Swift Package processes (1):' },
          { type: 'text', text: '  • PID 12345: MyApp (/test/package) - running 5s' },
          { type: 'text', text: '💡 Use swift_package_stop with a PID to terminate a process.' },
        ],
      });

      Array.from = originalArrayFrom;
      Date.now = originalDateNow;
    });

    it('should return multiple processes when several are running', async () => {
      const startedAt1 = new Date('2023-01-01T10:00:00.000Z');
      const startedAt2 = new Date('2023-01-01T10:00:07.000Z');

      const mockProcess1 = {
        executableName: 'MyApp',
        packagePath: '/test/package1',
        startedAt: startedAt1,
      };

      const mockProcess2 = {
        executableName: undefined, // Test default executable name
        packagePath: '/test/package2',
        startedAt: startedAt2,
      };

      // Mock Array.from to return multiple process entries
      const originalArrayFrom = Array.from;
      vi.spyOn(Array, 'from').mockReturnValue([
        [12345, mockProcess1],
        [12346, mockProcess2],
      ]);

      // Mock Date.now to return a specific time (10 seconds after first start, 3 seconds after second)
      const originalDateNow = Date.now;
      vi.spyOn(Date, 'now').mockReturnValue(startedAt1.getTime() + 10000);

      const result = await swiftPackageList.handler({});

      expect(result).toEqual({
        content: [
          { type: 'text', text: '📋 Active Swift Package processes (2):' },
          { type: 'text', text: '  • PID 12345: MyApp (/test/package1) - running 10s' },
          { type: 'text', text: '  • PID 12346: default (/test/package2) - running 3s' },
          { type: 'text', text: '💡 Use swift_package_stop with a PID to terminate a process.' },
        ],
      });

      Array.from = originalArrayFrom;
      Date.now = originalDateNow;
    });

    it('should handle process with null executableName', async () => {
      const startedAt = new Date('2023-01-01T10:00:00.000Z');
      const mockProcess = {
        executableName: null, // Test null executable name
        packagePath: '/test/package',
        startedAt: startedAt,
      };

      // Mock Array.from to return one process entry
      const originalArrayFrom = Array.from;
      vi.spyOn(Array, 'from').mockReturnValue([[12345, mockProcess]]);

      // Mock Date.now to return a specific time (1 second after startedAt)
      const originalDateNow = Date.now;
      vi.spyOn(Date, 'now').mockReturnValue(startedAt.getTime() + 1000);

      const result = await swiftPackageList.handler({});

      expect(result).toEqual({
        content: [
          { type: 'text', text: '📋 Active Swift Package processes (1):' },
          { type: 'text', text: '  • PID 12345: default (/test/package) - running 1s' },
          { type: 'text', text: '💡 Use swift_package_stop with a PID to terminate a process.' },
        ],
      });

      Array.from = originalArrayFrom;
      Date.now = originalDateNow;
    });

    it('should handle process with empty string executableName', async () => {
      const startedAt = new Date('2023-01-01T10:00:00.000Z');
      const mockProcess = {
        executableName: '', // Test empty string executable name
        packagePath: '/test/package',
        startedAt: startedAt,
      };

      // Mock Array.from to return one process entry
      const originalArrayFrom = Array.from;
      vi.spyOn(Array, 'from').mockReturnValue([[12345, mockProcess]]);

      // Mock Date.now to return a specific time (2 seconds after startedAt)
      const originalDateNow = Date.now;
      vi.spyOn(Date, 'now').mockReturnValue(startedAt.getTime() + 2000);

      const result = await swiftPackageList.handler({});

      expect(result).toEqual({
        content: [
          { type: 'text', text: '📋 Active Swift Package processes (1):' },
          { type: 'text', text: '  • PID 12345: default (/test/package) - running 2s' },
          { type: 'text', text: '💡 Use swift_package_stop with a PID to terminate a process.' },
        ],
      });

      Array.from = originalArrayFrom;
      Date.now = originalDateNow;
    });

    it('should handle very recent process (less than 1 second)', async () => {
      const startedAt = new Date('2023-01-01T10:00:00.000Z');
      const mockProcess = {
        executableName: 'FastApp',
        packagePath: '/test/package',
        startedAt: startedAt,
      };

      // Mock Array.from to return one process entry
      const originalArrayFrom = Array.from;
      vi.spyOn(Array, 'from').mockReturnValue([[12345, mockProcess]]);

      // Mock Date.now to return a time 500ms after startedAt (should round to 0s)
      const originalDateNow = Date.now;
      vi.spyOn(Date, 'now').mockReturnValue(startedAt.getTime() + 500);

      const result = await swiftPackageList.handler({});

      expect(result).toEqual({
        content: [
          { type: 'text', text: '📋 Active Swift Package processes (1):' },
          { type: 'text', text: '  • PID 12345: FastApp (/test/package) - running 1s' },
          { type: 'text', text: '💡 Use swift_package_stop with a PID to terminate a process.' },
        ],
      });

      Array.from = originalArrayFrom;
      Date.now = originalDateNow;
    });

    it('should handle process running for exactly 0 milliseconds', async () => {
      const startedAt = new Date('2023-01-01T10:00:00.000Z');
      const mockProcess = {
        executableName: 'InstantApp',
        packagePath: '/test/package',
        startedAt: startedAt,
      };

      // Mock Array.from to return one process entry
      const originalArrayFrom = Array.from;
      vi.spyOn(Array, 'from').mockReturnValue([[12345, mockProcess]]);

      // Mock Date.now to return exact same time as startedAt (0ms difference)
      const originalDateNow = Date.now;
      vi.spyOn(Date, 'now').mockReturnValue(startedAt.getTime());

      const result = await swiftPackageList.handler({});

      expect(result).toEqual({
        content: [
          { type: 'text', text: '📋 Active Swift Package processes (1):' },
          { type: 'text', text: '  • PID 12345: InstantApp (/test/package) - running 0s' },
          { type: 'text', text: '💡 Use swift_package_stop with a PID to terminate a process.' },
        ],
      });

      Array.from = originalArrayFrom;
      Date.now = originalDateNow;
    });

    it('should handle process running for a long time', async () => {
      const startedAt = new Date('2023-01-01T10:00:00.000Z');
      const mockProcess = {
        executableName: 'LongRunningApp',
        packagePath: '/test/package',
        startedAt: startedAt,
      };

      // Mock Array.from to return one process entry
      const originalArrayFrom = Array.from;
      vi.spyOn(Array, 'from').mockReturnValue([[12345, mockProcess]]);

      // Mock Date.now to return time 2 hours later (7200 seconds)
      const originalDateNow = Date.now;
      vi.spyOn(Date, 'now').mockReturnValue(startedAt.getTime() + 7200000);

      const result = await swiftPackageList.handler({});

      expect(result).toEqual({
        content: [
          { type: 'text', text: '📋 Active Swift Package processes (1):' },
          { type: 'text', text: '  • PID 12345: LongRunningApp (/test/package) - running 7200s' },
          { type: 'text', text: '💡 Use swift_package_stop with a PID to terminate a process.' },
        ],
      });

      Array.from = originalArrayFrom;
      Date.now = originalDateNow;
    });
  });
});
