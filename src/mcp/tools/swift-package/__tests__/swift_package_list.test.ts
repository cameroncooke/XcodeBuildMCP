/**
 * Tests for swift_package_list plugin
 * Following CLAUDE.md testing standards with literal validation
 * Using pure dependency injection for deterministic testing
 */

import { describe, it, expect, beforeEach } from 'vitest';
import swiftPackageList, { swift_package_listLogic } from '../swift_package_list.ts';

describe('swift_package_list plugin', () => {
  // No mocks to clear with pure dependency injection

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(swiftPackageList.name).toBe('swift_package_list');
    });

    it('should have correct description', () => {
      expect(swiftPackageList.description).toBe('List SwiftPM processes.');
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
      // Create empty mock process map
      const mockProcessMap = new Map();

      // Use pure dependency injection with stub functions
      const mockArrayFrom = () => [];
      const mockDateNow = () => Date.now();

      const result = await swift_package_listLogic(
        {},
        {
          processMap: mockProcessMap,
          arrayFrom: mockArrayFrom,
          dateNow: mockDateNow,
        },
      );

      expect(result).toEqual({
        content: [
          { type: 'text', text: 'ℹ️ No Swift Package processes currently running.' },
          { type: 'text', text: '💡 Use swift_package_run to start an executable.' },
        ],
      });
    });

    it('should handle empty args object', async () => {
      // Create empty mock process map
      const mockProcessMap = new Map();

      // Use pure dependency injection with stub functions
      const mockArrayFrom = () => [];
      const mockDateNow = () => Date.now();

      const result = await swift_package_listLogic(
        {},
        {
          processMap: mockProcessMap,
          arrayFrom: mockArrayFrom,
          dateNow: mockDateNow,
        },
      );

      expect(result).toEqual({
        content: [
          { type: 'text', text: 'ℹ️ No Swift Package processes currently running.' },
          { type: 'text', text: '💡 Use swift_package_run to start an executable.' },
        ],
      });
    });

    it('should handle null args', async () => {
      // Create empty mock process map
      const mockProcessMap = new Map();

      // Use pure dependency injection with stub functions
      const mockArrayFrom = () => [];
      const mockDateNow = () => Date.now();

      const result = await swift_package_listLogic(null, {
        processMap: mockProcessMap,
        arrayFrom: mockArrayFrom,
        dateNow: mockDateNow,
      });

      expect(result).toEqual({
        content: [
          { type: 'text', text: 'ℹ️ No Swift Package processes currently running.' },
          { type: 'text', text: '💡 Use swift_package_run to start an executable.' },
        ],
      });
    });

    it('should handle undefined args', async () => {
      // Create empty mock process map
      const mockProcessMap = new Map();

      // Use pure dependency injection with stub functions
      const mockArrayFrom = () => [];
      const mockDateNow = () => Date.now();

      const result = await swift_package_listLogic(undefined, {
        processMap: mockProcessMap,
        arrayFrom: mockArrayFrom,
        dateNow: mockDateNow,
      });

      expect(result).toEqual({
        content: [
          { type: 'text', text: 'ℹ️ No Swift Package processes currently running.' },
          { type: 'text', text: '💡 Use swift_package_run to start an executable.' },
        ],
      });
    });

    it('should handle args with extra properties', async () => {
      // Create empty mock process map
      const mockProcessMap = new Map();

      // Use pure dependency injection with stub functions
      const mockArrayFrom = () => [];
      const mockDateNow = () => Date.now();

      const result = await swift_package_listLogic(
        {
          extraProperty: 'value',
          anotherProperty: 123,
        },
        {
          processMap: mockProcessMap,
          arrayFrom: mockArrayFrom,
          dateNow: mockDateNow,
        },
      );

      expect(result).toEqual({
        content: [
          { type: 'text', text: 'ℹ️ No Swift Package processes currently running.' },
          { type: 'text', text: '💡 Use swift_package_run to start an executable.' },
        ],
      });
    });

    it('should return single process when one process is running', async () => {
      const startedAt = new Date('2023-01-01T10:00:00.000Z');
      const mockProcess = {
        executableName: 'MyApp',
        packagePath: '/test/package',
        startedAt: startedAt,
      };

      // Create mock process map with one process
      const mockProcessMap = new Map([[12345, mockProcess]]);

      // Use pure dependency injection with stub functions
      const mockArrayFrom = (mapEntries: any) => Array.from(mapEntries);
      const mockDateNow = () => startedAt.getTime() + 5000; // 5 seconds after start

      const result = await swift_package_listLogic(
        {},
        {
          processMap: mockProcessMap,
          arrayFrom: mockArrayFrom,
          dateNow: mockDateNow,
        },
      );

      expect(result).toEqual({
        content: [
          { type: 'text', text: '📋 Active Swift Package processes (1):' },
          { type: 'text', text: '  • PID 12345: MyApp (/test/package) - running 5s' },
          { type: 'text', text: '💡 Use swift_package_stop with a PID to terminate a process.' },
        ],
      });
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

      // Create mock process map with multiple processes
      const mockProcessMap = new Map<
        number,
        { executableName?: string; packagePath: string; startedAt: Date }
      >([
        [12345, mockProcess1],
        [12346, mockProcess2],
      ]);

      // Use pure dependency injection with stub functions
      const mockArrayFrom = (mapEntries: any) => Array.from(mapEntries);
      const mockDateNow = () => startedAt1.getTime() + 10000; // 10 seconds after first start

      const result = await swift_package_listLogic(
        {},
        {
          processMap: mockProcessMap,
          arrayFrom: mockArrayFrom,
          dateNow: mockDateNow,
        },
      );

      expect(result).toEqual({
        content: [
          { type: 'text', text: '📋 Active Swift Package processes (2):' },
          { type: 'text', text: '  • PID 12345: MyApp (/test/package1) - running 10s' },
          { type: 'text', text: '  • PID 12346: default (/test/package2) - running 3s' },
          { type: 'text', text: '💡 Use swift_package_stop with a PID to terminate a process.' },
        ],
      });
    });

    it('should handle process with missing executableName', async () => {
      const startedAt = new Date('2023-01-01T10:00:00.000Z');
      const mockProcess = {
        executableName: undefined, // Test missing executable name
        packagePath: '/test/package',
        startedAt: startedAt,
      };

      // Create mock process map with one process
      const mockProcessMap = new Map<
        number,
        { executableName?: string; packagePath: string; startedAt: Date }
      >([[12345, mockProcess]]);

      // Use pure dependency injection with stub functions
      const mockArrayFrom = (mapEntries: any) => Array.from(mapEntries);
      const mockDateNow = () => startedAt.getTime() + 1000; // 1 second after start

      const result = await swift_package_listLogic(
        {},
        {
          processMap: mockProcessMap,
          arrayFrom: mockArrayFrom,
          dateNow: mockDateNow,
        },
      );

      expect(result).toEqual({
        content: [
          { type: 'text', text: '📋 Active Swift Package processes (1):' },
          { type: 'text', text: '  • PID 12345: default (/test/package) - running 1s' },
          { type: 'text', text: '💡 Use swift_package_stop with a PID to terminate a process.' },
        ],
      });
    });

    it('should handle process with empty string executableName', async () => {
      const startedAt = new Date('2023-01-01T10:00:00.000Z');
      const mockProcess = {
        executableName: '', // Test empty string executable name
        packagePath: '/test/package',
        startedAt: startedAt,
      };

      // Create mock process map with one process
      const mockProcessMap = new Map([[12345, mockProcess]]);

      // Use pure dependency injection with stub functions
      const mockArrayFrom = (mapEntries: any) => Array.from(mapEntries);
      const mockDateNow = () => startedAt.getTime() + 2000; // 2 seconds after start

      const result = await swift_package_listLogic(
        {},
        {
          processMap: mockProcessMap,
          arrayFrom: mockArrayFrom,
          dateNow: mockDateNow,
        },
      );

      expect(result).toEqual({
        content: [
          { type: 'text', text: '📋 Active Swift Package processes (1):' },
          { type: 'text', text: '  • PID 12345: default (/test/package) - running 2s' },
          { type: 'text', text: '💡 Use swift_package_stop with a PID to terminate a process.' },
        ],
      });
    });

    it('should handle very recent process (less than 1 second)', async () => {
      const startedAt = new Date('2023-01-01T10:00:00.000Z');
      const mockProcess = {
        executableName: 'FastApp',
        packagePath: '/test/package',
        startedAt: startedAt,
      };

      // Create mock process map with one process
      const mockProcessMap = new Map([[12345, mockProcess]]);

      // Use pure dependency injection with stub functions
      const mockArrayFrom = (mapEntries: any) => Array.from(mapEntries);
      const mockDateNow = () => startedAt.getTime() + 500; // 500ms after start

      const result = await swift_package_listLogic(
        {},
        {
          processMap: mockProcessMap,
          arrayFrom: mockArrayFrom,
          dateNow: mockDateNow,
        },
      );

      expect(result).toEqual({
        content: [
          { type: 'text', text: '📋 Active Swift Package processes (1):' },
          { type: 'text', text: '  • PID 12345: FastApp (/test/package) - running 1s' },
          { type: 'text', text: '💡 Use swift_package_stop with a PID to terminate a process.' },
        ],
      });
    });

    it('should handle process running for exactly 0 milliseconds', async () => {
      const startedAt = new Date('2023-01-01T10:00:00.000Z');
      const mockProcess = {
        executableName: 'InstantApp',
        packagePath: '/test/package',
        startedAt: startedAt,
      };

      // Create mock process map with one process
      const mockProcessMap = new Map([[12345, mockProcess]]);

      // Use pure dependency injection with stub functions
      const mockArrayFrom = (mapEntries: any) => Array.from(mapEntries);
      const mockDateNow = () => startedAt.getTime(); // Same time as start

      const result = await swift_package_listLogic(
        {},
        {
          processMap: mockProcessMap,
          arrayFrom: mockArrayFrom,
          dateNow: mockDateNow,
        },
      );

      expect(result).toEqual({
        content: [
          { type: 'text', text: '📋 Active Swift Package processes (1):' },
          { type: 'text', text: '  • PID 12345: InstantApp (/test/package) - running 1s' },
          { type: 'text', text: '💡 Use swift_package_stop with a PID to terminate a process.' },
        ],
      });
    });

    it('should handle process running for a long time', async () => {
      const startedAt = new Date('2023-01-01T10:00:00.000Z');
      const mockProcess = {
        executableName: 'LongRunningApp',
        packagePath: '/test/package',
        startedAt: startedAt,
      };

      // Create mock process map with one process
      const mockProcessMap = new Map([[12345, mockProcess]]);

      // Use pure dependency injection with stub functions
      const mockArrayFrom = (mapEntries: any) => Array.from(mapEntries);
      const mockDateNow = () => startedAt.getTime() + 7200000; // 2 hours later

      const result = await swift_package_listLogic(
        {},
        {
          processMap: mockProcessMap,
          arrayFrom: mockArrayFrom,
          dateNow: mockDateNow,
        },
      );

      expect(result).toEqual({
        content: [
          { type: 'text', text: '📋 Active Swift Package processes (1):' },
          { type: 'text', text: '  • PID 12345: LongRunningApp (/test/package) - running 7200s' },
          { type: 'text', text: '💡 Use swift_package_stop with a PID to terminate a process.' },
        ],
      });
    });
  });
});
