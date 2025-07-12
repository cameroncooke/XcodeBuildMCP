/**
 * Tests for build_run_mac_ws plugin
 * Following CLAUDE.md testing standards with literal validation
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import { z } from 'zod';
import buildRunMacWs from '../build_run_mac_ws.ts';

// Mock only child_process.spawn and exec at the lowest level
vi.mock('child_process', () => ({
  spawn: vi.fn(),
  exec: vi.fn(),
}));

// Mock util.promisify
vi.mock('util', () => ({
  promisify: vi.fn(),
}));

class MockChildProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  pid = 12345;
}

describe('build_run_mac_ws plugin', () => {
  let mockSpawn: Record<string, unknown>;
  let mockExec: Record<string, unknown>;
  let mockPromisify: Record<string, unknown>;

  beforeEach(async () => {
    const { spawn, exec } = await import('child_process');
    const { promisify } = await import('util');

    mockSpawn = vi.mocked(spawn);
    mockExec = vi.mocked(exec);
    mockPromisify = vi.mocked(promisify);

    vi.clearAllMocks();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(buildRunMacWs.name).toBe('build_run_mac_ws');
    });

    it('should have correct description', () => {
      expect(buildRunMacWs.description).toBe(
        'Builds and runs a macOS app from a workspace in one step.',
      );
    });

    it('should have handler function', () => {
      expect(typeof buildRunMacWs.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Test required fields
      expect(
        buildRunMacWs.schema.workspacePath.safeParse('/path/to/MyProject.xcworkspace').success,
      ).toBe(true);
      expect(buildRunMacWs.schema.scheme.safeParse('MyScheme').success).toBe(true);

      // Test optional fields
      expect(buildRunMacWs.schema.configuration.safeParse('Debug').success).toBe(true);
      expect(buildRunMacWs.schema.derivedDataPath.safeParse('/path/to/derived-data').success).toBe(
        true,
      );
      expect(buildRunMacWs.schema.arch.safeParse('arm64').success).toBe(true);
      expect(buildRunMacWs.schema.arch.safeParse('x86_64').success).toBe(true);
      expect(buildRunMacWs.schema.extraArgs.safeParse(['--arg1', '--arg2']).success).toBe(true);
      expect(buildRunMacWs.schema.preferXcodebuild.safeParse(true).success).toBe(true);

      // Test invalid inputs
      expect(buildRunMacWs.schema.workspacePath.safeParse(null).success).toBe(false);
      expect(buildRunMacWs.schema.scheme.safeParse(null).success).toBe(false);
      expect(buildRunMacWs.schema.arch.safeParse('invalidArch').success).toBe(false);
      expect(buildRunMacWs.schema.extraArgs.safeParse('not-array').success).toBe(false);
      expect(buildRunMacWs.schema.preferXcodebuild.safeParse('not-boolean').success).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return exact successful build and run response', async () => {
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      // Mock promisify(exec) to return successful launch
      const mockExecPromise = vi.fn().mockResolvedValue({ stdout: '', stderr: '' });
      mockPromisify.mockReturnValue(mockExecPromise);

      // Simulate successful build
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Build succeeded');
        mockProcess.emit('close', 0);
      }, 0);

      const result = await buildRunMacWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
      });

      expect(mockSpawn).toHaveBeenCalledWith(
        'sh',
        [
          '-c',
          'xcodebuild -workspace /path/to/MyProject.xcworkspace -scheme MyScheme -configuration Debug -skipMacroValidation -destination "platform=macOS" build',
        ],
        expect.any(Object),
      );

      expect(result.content).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'text',
            text: expect.stringContaining('✅ macOS build and run succeeded for scheme MyScheme'),
          }),
        ]),
      );
    });

    it('should return exact build failure response', async () => {
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      // Simulate build failure
      setTimeout(() => {
        mockProcess.stderr.emit('data', 'error: Compilation error in main.swift');
        mockProcess.emit('close', 1);
      }, 0);

      const result = await buildRunMacWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ [stderr] error: Compilation error in main.swift',
          },
          {
            type: 'text',
            text: '❌ macOS Build build failed for scheme MyScheme.',
          },
        ],
        isError: true,
      });
    });

    it('should return exact exception handling response', async () => {
      mockSpawn.mockImplementation(() => {
        throw new Error('Network error');
      });

      const result = await buildRunMacWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error during macOS build and run: Network error',
          },
        ],
        isError: true,
      });
    });
  });
});
