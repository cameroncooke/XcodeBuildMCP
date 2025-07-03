/**
 * Tests for build_run_mac_ws Plugin
 *
 * This test file covers the build_run_mac_ws tool:
 * - build_run_mac_ws: Build and run macOS app from workspace
 *
 * Tests actual production code, not mock implementations.
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { exec } from 'child_process';

// Import actual production plugin
import buildRunMacWs from './build_run_mac_ws.ts';

// Mock Node.js APIs
vi.mock('child_process', () => ({
  spawn: vi.fn(),
  exec: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  unlink: vi.fn(),
  access: vi.fn(),
  mkdir: vi.fn(),
  mkdtemp: vi.fn(),
}));

// Mock logger to prevent real logging during tests
vi.mock('../../../src/utils/logger.ts', () => ({
  log: vi.fn(),
}));

describe('build_run_mac_ws Plugin', () => {
  let mockSpawn: MockedFunction<any>;
  let mockExec: MockedFunction<any>;
  let mockChildProcess: Partial<ChildProcess>;

  beforeEach(async () => {
    // Get the mocked functions
    const { spawn: nodeSpawn, exec: nodeExec } = await import('node:child_process');
    mockSpawn = nodeSpawn as MockedFunction<any>;
    mockExec = nodeExec as MockedFunction<any>;

    // Create mock child process
    mockChildProcess = {
      stdout: {
        on: vi.fn((event, callback) => {
          if (event === 'data') {
            callback('BUILD SUCCEEDED\n\n** BUILD SUCCEEDED **');
          }
        }),
        pipe: vi.fn(),
      } as any,
      stderr: {
        on: vi.fn(),
        pipe: vi.fn(),
      } as any,
      on: vi.fn((event, callback) => {
        if (event === 'close') {
          callback(0); // Success exit code
        }
      }),
      pid: 12345,
    };

    mockSpawn.mockReturnValue(mockChildProcess as ChildProcess);

    // Mock exec for app launching
    mockExec.mockImplementation((command, callback) => {
      if (callback) {
        callback(null, '', '');
      }
    });

    vi.clearAllMocks();
  });

  describe('Plugin Structure', () => {
    it('should have correct plugin structure', () => {
      expect(buildRunMacWs).toBeDefined();
      expect(buildRunMacWs.name).toBe('build_run_mac_ws');
      expect(buildRunMacWs.description).toBe('Builds and runs a macOS app from a workspace in one step.');
      expect(buildRunMacWs.schema).toBeDefined();
      expect(buildRunMacWs.handler).toBeDefined();
      expect(typeof buildRunMacWs.handler).toBe('function');
    });
  });

  describe('Tool Functionality', () => {
    describe('build_run_mac_ws', () => {
      it('should build and run workspace successfully', async () => {
        // Mock successful build first (for the initial build step)
        mockChildProcess.on = vi.fn((event, callback) => {
          if (event === 'close') {
            callback(0); // Success exit code for build
          }
        });

        // Mock exec for the app launching part of build-and-run
        mockExec.mockImplementation((command, callback) => {
          if (callback) {
            callback(null, '', '');
          }
        });

        const result = await buildRunMacWs.handler({
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
        });

        expect(result.content[0].text).toMatch(/✅.*succeeded.*scheme MyScheme/);
        expect(result.isError || false).toBe(false);
      });

      it('should handle build failure during build and run', async () => {
        // Mock failed build
        mockChildProcess.on = vi.fn((event, callback) => {
          if (event === 'close') {
            callback(1); // Error exit code
          }
        });

        const result = await buildRunMacWs.handler({
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
        });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/❌.*failed/);
      });

      it('should accept optional configuration parameter', async () => {
        // Mock successful build
        mockChildProcess.on = vi.fn((event, callback) => {
          if (event === 'close') {
            callback(0); // Success exit code
          }
        });

        const result = await buildRunMacWs.handler({
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
          configuration: 'Release',
        });

        expect(result.isError || false).toBe(false);
      });

      it('should accept optional arch parameter', async () => {
        // Mock successful build
        mockChildProcess.on = vi.fn((event, callback) => {
          if (event === 'close') {
            callback(0); // Success exit code
          }
        });

        const result = await buildRunMacWs.handler({
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
          arch: 'arm64',
        });

        expect(result.isError || false).toBe(false);
      });
    });
  });
});