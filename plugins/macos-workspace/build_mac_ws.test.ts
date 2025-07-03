/**
 * Tests for build_mac_ws plugin
 *
 * This test file covers the build_mac_ws tool:
 * - build_mac_ws: Build macOS app from workspace
 *
 * Tests actual production code, not mock implementations.
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { exec } from 'child_process';

// Import the plugin
import buildMacWs from './build_mac_ws.ts';

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
vi.mock('../../src/utils/logger.ts', () => ({
  log: vi.fn(),
}));

describe('build_mac_ws Plugin', () => {
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
    it('should export plugin with correct structure', () => {
      expect(buildMacWs).toBeDefined();
      expect(buildMacWs.name).toBe('build_mac_ws');
      expect(buildMacWs.description).toBe('Builds a macOS app using xcodebuild from a workspace.');
      expect(buildMacWs.schema).toBeDefined();
      expect(buildMacWs.handler).toBeDefined();
      expect(typeof buildMacWs.handler).toBe('function');
    });
  });

  describe('build_mac_ws Tool', () => {
    it('should build workspace successfully without workspacePath (testing actual behavior)', async () => {
      const result = await buildMacWs.handler({
        scheme: 'MyScheme',
      });

      expect(result.content).toEqual([
        {
          type: 'text',
          text: '✅ macOS Build build succeeded for scheme MyScheme.',
        },
        {
          type: 'text',
          text: 'Next Steps:\n1. Get App Path: get_macos_app_path_project\n2. Get Bundle ID: get_macos_bundle_id\n3. Launch App: launch_macos_app',
        },
      ]);
      expect(result.isError || false).toBe(false);
    });

    it('should build workspace successfully without scheme (testing actual behavior)', async () => {
      const result = await buildMacWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
      });

      expect(result.content).toEqual([
        {
          type: 'text',
          text: '✅ macOS Build build succeeded for scheme undefined.',
        },
        {
          type: 'text',
          text: 'Next Steps:\n1. Get App Path: get_macos_app_path_workspace\n2. Get Bundle ID: get_macos_bundle_id\n3. Launch App: launch_macos_app',
        },
      ]);
      expect(result.isError || false).toBe(false);
    });

    it('should build workspace successfully', async () => {
      const result = await buildMacWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
      });

      expect(result.content).toEqual([
        { type: 'text', text: '✅ macOS Build build succeeded for scheme MyScheme.' },
        {
          type: 'text',
          text: 'Next Steps:\n1. Get App Path: get_macos_app_path_workspace\n2. Get Bundle ID: get_macos_bundle_id\n3. Launch App: launch_macos_app',
        },
      ]);
      expect(result.isError || false).toBe(false);
    });

    it('should accept optional configuration parameter', async () => {
      const result = await buildMacWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
        configuration: 'Release',
      });

      expect(result.isError || false).toBe(false);
    });

    it('should accept optional arch parameter', async () => {
      const result = await buildMacWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
        arch: 'arm64',
      });

      expect(result.isError || false).toBe(false);
    });

    it('should handle build failure', async () => {
      // Mock failed build
      mockChildProcess.stdout!.on = vi.fn((event, callback) => {
        if (event === 'data') {
          callback('error: Build failed');
        }
      });
      mockChildProcess.on = vi.fn((event, callback) => {
        if (event === 'close') {
          callback(1); // Error exit code
        }
      });

      const result = await buildMacWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/❌.*failed/);
    });
  });
});