/**
 * Tests for test_device_ws plugin
 * Following CLAUDE.md testing standards with literal validation
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import testDeviceWs from '../test_device_ws.ts';

// Mock child_process at the lowest level
vi.mock('child_process', () => ({
  spawn: vi.fn(),
  exec: vi.fn(),
}));

// Mock fs/promises
vi.mock('fs/promises', () => ({
  mkdtemp: vi.fn().mockResolvedValue('/tmp/xcodebuild-test-123'),
  rm: vi.fn().mockResolvedValue(undefined),
  stat: vi.fn().mockResolvedValue({ isFile: () => true }),
}));

// Mock os
vi.mock('os', () => ({
  tmpdir: vi.fn().mockReturnValue('/tmp'),
}));

// Mock util
vi.mock('util', () => ({
  promisify: vi.fn((fn) => vi.fn().mockResolvedValue({ stdout: '{}' })),
}));

describe('test_device_ws plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(testDeviceWs.name).toBe('test_device_ws');
    });

    it('should have correct description', () => {
      expect(testDeviceWs.description).toBe(
        'Runs tests for an Apple workspace on a physical device (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro) using xcodebuild test and parses xcresult output. IMPORTANT: Requires workspacePath, scheme, and deviceId.',
      );
    });

    it('should have handler function', () => {
      expect(typeof testDeviceWs.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Test required fields
      expect(
        testDeviceWs.schema.workspacePath.safeParse('/path/to/workspace.xcworkspace').success,
      ).toBe(true);
      expect(testDeviceWs.schema.scheme.safeParse('MyScheme').success).toBe(true);

      // Test optional fields
      expect(testDeviceWs.schema.configuration.safeParse('Debug').success).toBe(true);
      expect(testDeviceWs.schema.derivedDataPath.safeParse('/path/to/derived').success).toBe(true);
      expect(testDeviceWs.schema.extraArgs.safeParse(['--quiet']).success).toBe(true);
      expect(testDeviceWs.schema.preferXcodebuild.safeParse(true).success).toBe(true);
      expect(testDeviceWs.schema.deviceId.safeParse('test-device-123').success).toBe(true);
      expect(testDeviceWs.schema.platform.safeParse('iOS').success).toBe(true);

      // Test invalid inputs
      expect(testDeviceWs.schema.workspacePath.safeParse(123).success).toBe(false);
      expect(testDeviceWs.schema.extraArgs.safeParse('not-array').success).toBe(false);
      expect(testDeviceWs.schema.preferXcodebuild.safeParse('not-boolean').success).toBe(false);
      expect(testDeviceWs.schema.platform.safeParse('invalidPlatform').success).toBe(false);
    });
  });

  class MockChildProcess extends EventEmitter {
    stdout = new EventEmitter();
    stderr = new EventEmitter();
    pid = 12345;
  }

  let mockSpawn: any;
  let mockProcess: MockChildProcess;

  beforeEach(async () => {
    const { spawn } = await import('child_process');
    mockSpawn = vi.mocked(spawn);
    mockProcess = new MockChildProcess();
    mockSpawn.mockReturnValue(mockProcess);

    vi.clearAllMocks();
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should handle missing parameters and generate xcodebuild command', async () => {
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Test Suite All Tests passed');
        mockProcess.emit('close', 0);
      }, 0);

      const resultPromise = testDeviceWs.handler({
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyScheme',
        configuration: 'Debug',
      });

      const result = await resultPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        'sh',
        expect.arrayContaining([
          '-c',
          expect.stringMatching(/xcodebuild.*-workspace.*MyScheme.*test/),
        ]),
        expect.any(Object),
      );
    });

    it('should return successful test response when xcodebuild succeeds', async () => {
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Test Suite All Tests passed');
        mockProcess.emit('close', 0);
      }, 0);

      const result = await testDeviceWs.handler({
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyScheme',
        configuration: 'Debug',
      });

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.isError).toBeUndefined();
    });

    it('should return error response when xcodebuild fails', async () => {
      setTimeout(() => {
        mockProcess.stderr.emit('data', 'xcodebuild: error: Scheme not found');
        mockProcess.emit('close', 65);
      }, 0);

      const result = await testDeviceWs.handler({
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'NonExistentScheme',
      });

      expect(result.isError).toBe(true);
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
    });

    it('should use default configuration when not provided', async () => {
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Test Suite All Tests passed');
        mockProcess.emit('close', 0);
      }, 0);

      await testDeviceWs.handler({
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyScheme',
      });

      expect(mockSpawn).toHaveBeenCalledWith(
        'sh',
        expect.arrayContaining(['-c', expect.stringMatching(/Debug/)]),
        expect.any(Object),
      );
    });
  });
});
