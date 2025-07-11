/**
 * Tests for test_macos_ws plugin
 * Following CLAUDE.md testing standards with literal validation
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import { z } from 'zod';
import testMacosWs from '../test_macos_ws.ts';

// Mock only child_process at the lowest level
vi.mock('child_process', () => ({
  spawn: vi.fn(),
  exec: vi.fn(),
}));

// Mock util.promisify
vi.mock('util', () => ({
  promisify: vi.fn(),
}));

// Mock fs/promises
vi.mock('fs/promises', () => ({
  mkdtemp: vi.fn(),
  rm: vi.fn(),
  stat: vi.fn(),
}));

// Mock os
vi.mock('os', () => ({
  tmpdir: vi.fn(() => '/tmp'),
}));

// Mock path
vi.mock('path', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    join: vi.fn((...args) => args.join('/')),
  };
});

class MockChildProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  pid = 12345;
}

describe('test_macos_ws plugin', () => {
  let mockSpawn: any;
  let mockExec: any;
  let mockPromisify: any;
  let mockMkdtemp: any;
  let mockRm: any;
  let mockStat: any;

  beforeEach(async () => {
    const { spawn, exec } = await import('child_process');
    const { promisify } = await import('util');
    const { mkdtemp, rm, stat } = await import('fs/promises');

    mockSpawn = vi.mocked(spawn);
    mockExec = vi.mocked(exec);
    mockPromisify = vi.mocked(promisify);
    mockMkdtemp = vi.mocked(mkdtemp);
    mockRm = vi.mocked(rm);
    mockStat = vi.mocked(stat);

    vi.clearAllMocks();

    // Setup common mocks
    mockMkdtemp.mockResolvedValue('/tmp/xcodebuild-test-abc123');
    mockRm.mockResolvedValue(undefined);
    mockStat.mockResolvedValue({} as any);
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(testMacosWs.name).toBe('test_macos_ws');
    });

    it('should have correct description', () => {
      expect(testMacosWs.description).toBe(
        'Runs tests for a macOS workspace using xcodebuild test and parses xcresult output.',
      );
    });

    it('should have handler function', () => {
      expect(typeof testMacosWs.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Test required fields
      expect(
        testMacosWs.schema.workspacePath.safeParse('/path/to/MyProject.xcworkspace').success,
      ).toBe(true);
      expect(testMacosWs.schema.scheme.safeParse('MyScheme').success).toBe(true);

      // Test optional fields
      expect(testMacosWs.schema.configuration.safeParse('Debug').success).toBe(true);
      expect(testMacosWs.schema.derivedDataPath.safeParse('/path/to/derived-data').success).toBe(
        true,
      );
      expect(testMacosWs.schema.extraArgs.safeParse(['--arg1', '--arg2']).success).toBe(true);
      expect(testMacosWs.schema.preferXcodebuild.safeParse(true).success).toBe(true);

      // Test invalid inputs
      expect(testMacosWs.schema.workspacePath.safeParse(null).success).toBe(false);
      expect(testMacosWs.schema.scheme.safeParse(null).success).toBe(false);
      expect(testMacosWs.schema.extraArgs.safeParse('not-array').success).toBe(false);
      expect(testMacosWs.schema.preferXcodebuild.safeParse('not-boolean').success).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return exact successful test response', async () => {
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      // Mock xcresulttool execution
      const mockExecPromise = vi.fn().mockResolvedValue({
        stdout: JSON.stringify({
          title: 'Test Results',
          result: 'SUCCEEDED',
          totalTestCount: 5,
          passedTests: 5,
          failedTests: 0,
          skippedTests: 0,
          expectedFailures: 0,
        }),
      });
      mockPromisify.mockReturnValue(mockExecPromise);

      // Simulate successful test
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Test Succeeded');
        mockProcess.emit('close', 0);
      }, 0);

      const result = await testMacosWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
      });

      expect(mockSpawn).toHaveBeenCalledWith(
        'sh',
        expect.arrayContaining([
          '-c',
          expect.stringContaining(
            'xcodebuild -workspace /path/to/MyProject.xcworkspace -scheme MyScheme -configuration Debug -skipMacroValidation -destination "platform=macOS"',
          ),
        ]),
        expect.any(Object),
      );

      expect(result.content).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'text',
            text: '✅ Test Run test succeeded for scheme MyScheme.',
          }),
        ]),
      );
    });

    it('should return exact test failure response', async () => {
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      // Mock xcresulttool execution for failed tests
      const mockExecPromise = vi.fn().mockResolvedValue({
        stdout: JSON.stringify({
          title: 'Test Results',
          result: 'FAILED',
          totalTestCount: 5,
          passedTests: 3,
          failedTests: 2,
          skippedTests: 0,
          expectedFailures: 0,
        }),
      });
      mockPromisify.mockReturnValue(mockExecPromise);

      // Simulate test failure
      setTimeout(() => {
        mockProcess.stderr.emit('data', 'error: Test failed');
        mockProcess.emit('close', 1);
      }, 0);

      const result = await testMacosWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
      });

      expect(result.content).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'text',
            text: '❌ Test Run test failed for scheme MyScheme.',
          }),
        ]),
      );
      expect(result.isError).toBe(true);
    });

    it('should return exact successful test response with optional parameters', async () => {
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      // Mock xcresulttool execution
      const mockExecPromise = vi.fn().mockResolvedValue({
        stdout: JSON.stringify({
          title: 'Test Results',
          result: 'SUCCEEDED',
          totalTestCount: 5,
          passedTests: 5,
          failedTests: 0,
          skippedTests: 0,
          expectedFailures: 0,
        }),
      });
      mockPromisify.mockReturnValue(mockExecPromise);

      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Test Succeeded');
        mockProcess.emit('close', 0);
      }, 0);

      const result = await testMacosWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
        configuration: 'Release',
        derivedDataPath: '/path/to/derived-data',
        extraArgs: ['--verbose'],
        preferXcodebuild: true,
      });

      expect(mockSpawn).toHaveBeenCalledWith(
        'sh',
        expect.arrayContaining([
          '-c',
          expect.stringContaining(
            'xcodebuild -workspace /path/to/MyProject.xcworkspace -scheme MyScheme -configuration Release -skipMacroValidation -destination "platform=macOS" -derivedDataPath /path/to/derived-data --verbose',
          ),
        ]),
        expect.any(Object),
      );

      expect(result.content).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'text',
            text: '✅ Test Run test succeeded for scheme MyScheme.',
          }),
        ]),
      );
    });

    it('should return exact exception handling response', async () => {
      // Mock mkdtemp to fail to trigger the main catch block
      mockMkdtemp.mockRejectedValue(new Error('Network error'));

      const result = await testMacosWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error during test run: Network error',
          },
        ],
        isError: true,
      });
    });
  });
});
