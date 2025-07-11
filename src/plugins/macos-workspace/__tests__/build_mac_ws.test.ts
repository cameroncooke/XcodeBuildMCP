/**
 * Tests for build_mac_ws plugin
 * Following CLAUDE.md testing standards with literal validation
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import { z } from 'zod';
import buildMacWs from '../build_mac_ws.ts';

// Mock only child_process.spawn at the lowest level
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

class MockChildProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  pid = 12345;
}

describe('build_mac_ws plugin', () => {
  let mockSpawn: any;

  beforeEach(async () => {
    const { spawn } = await import('child_process');
    mockSpawn = vi.mocked(spawn);
    vi.clearAllMocks();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(buildMacWs.name).toBe('build_mac_ws');
    });

    it('should have correct description', () => {
      expect(buildMacWs.description).toBe('Builds a macOS app using xcodebuild from a workspace.');
    });

    it('should have handler function', () => {
      expect(typeof buildMacWs.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Test required fields
      expect(
        buildMacWs.schema.workspacePath.safeParse('/path/to/MyProject.xcworkspace').success,
      ).toBe(true);
      expect(buildMacWs.schema.scheme.safeParse('MyScheme').success).toBe(true);

      // Test optional fields
      expect(buildMacWs.schema.configuration.safeParse('Debug').success).toBe(true);
      expect(buildMacWs.schema.derivedDataPath.safeParse('/path/to/derived-data').success).toBe(
        true,
      );
      expect(buildMacWs.schema.arch.safeParse('arm64').success).toBe(true);
      expect(buildMacWs.schema.arch.safeParse('x86_64').success).toBe(true);
      expect(buildMacWs.schema.extraArgs.safeParse(['--arg1', '--arg2']).success).toBe(true);
      expect(buildMacWs.schema.preferXcodebuild.safeParse(true).success).toBe(true);

      // Test invalid inputs
      expect(buildMacWs.schema.workspacePath.safeParse(null).success).toBe(false);
      expect(buildMacWs.schema.scheme.safeParse(null).success).toBe(false);
      expect(buildMacWs.schema.arch.safeParse('invalidArch').success).toBe(false);
      expect(buildMacWs.schema.extraArgs.safeParse('not-array').success).toBe(false);
      expect(buildMacWs.schema.preferXcodebuild.safeParse('not-boolean').success).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return exact successful build response', async () => {
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      // Simulate successful build
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Build succeeded');
        mockProcess.emit('close', 0);
      }, 0);

      const result = await buildMacWs.handler({
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

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ macOS Build build succeeded for scheme MyScheme.',
          },
          {
            type: 'text',
            text: 'Next Steps:\n1. Get App Path: get_macos_app_path_workspace\n2. Get Bundle ID: get_macos_bundle_id\n3. Launch App: launch_macos_app',
          },
        ],
      });
    });

    it('should return exact build failure response', async () => {
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      // Simulate build failure
      setTimeout(() => {
        mockProcess.stderr.emit('data', 'error: Compilation error in main.swift');
        mockProcess.emit('close', 1);
      }, 0);

      const result = await buildMacWs.handler({
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

    it('should return exact successful build response with optional parameters', async () => {
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Build succeeded');
        mockProcess.emit('close', 0);
      }, 0);

      const result = await buildMacWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
        configuration: 'Release',
        arch: 'arm64',
        derivedDataPath: '/path/to/derived-data',
        extraArgs: ['--verbose'],
        preferXcodebuild: true,
      });

      expect(mockSpawn).toHaveBeenCalledWith(
        'sh',
        [
          '-c',
          'xcodebuild -workspace /path/to/MyProject.xcworkspace -scheme MyScheme -configuration Release -skipMacroValidation -destination "platform=macOS,arch=arm64" -derivedDataPath /path/to/derived-data --verbose build',
        ],
        expect.any(Object),
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ macOS Build build succeeded for scheme MyScheme.',
          },
          {
            type: 'text',
            text: 'Next Steps:\n1. Get App Path: get_macos_app_path_workspace\n2. Get Bundle ID: get_macos_bundle_id\n3. Launch App: launch_macos_app',
          },
        ],
      });
    });

    it('should return exact exception handling response', async () => {
      mockSpawn.mockImplementation(() => {
        throw new Error('Network error');
      });

      const result = await buildMacWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error during macOS Build build: Network error',
          },
        ],
        isError: true,
      });
    });

    it('should return exact spawn error handling response', async () => {
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      setTimeout(() => {
        mockProcess.emit('error', new Error('Spawn error'));
      }, 0);

      const result = await buildMacWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error during macOS Build build: Spawn error',
          },
        ],
        isError: true,
      });
    });
  });
});
