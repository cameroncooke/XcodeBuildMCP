/**
 * Tests for build_mac_proj plugin
 *
 * This test file covers the build_mac_proj tool plugin.
 * Tests the plugin structure and actual functionality.
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import buildMacProj from './build_mac_proj.js';

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
vi.mock('../../src/utils/logger.js', () => ({
  log: vi.fn(),
}));

describe('build_mac_proj plugin', () => {
  let mockSpawn: MockedFunction<any>;
  let mockChildProcess: Partial<ChildProcess>;

  beforeEach(async () => {
    // Get the mocked functions
    const { spawn: nodeSpawn } = await import('node:child_process');
    mockSpawn = nodeSpawn as MockedFunction<any>;

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

    vi.clearAllMocks();
  });

  describe('Plugin Structure', () => {
    it('should export default plugin object with correct structure', () => {
      expect(buildMacProj).toBeDefined();
      expect(typeof buildMacProj).toBe('object');
      expect(buildMacProj.name).toBe('build_mac_proj');
      expect(buildMacProj.description).toBe('Builds a macOS app using xcodebuild from a project file.');
      expect(buildMacProj.schema).toBeDefined();
      expect(typeof buildMacProj.handler).toBe('function');
    });

    it('should have the correct schema structure', () => {
      expect(buildMacProj.schema).toHaveProperty('projectPath');
      expect(buildMacProj.schema).toHaveProperty('scheme');
      expect(buildMacProj.schema).toHaveProperty('configuration');
      expect(buildMacProj.schema).toHaveProperty('derivedDataPath');
      expect(buildMacProj.schema).toHaveProperty('arch');
      expect(buildMacProj.schema).toHaveProperty('extraArgs');
      expect(buildMacProj.schema).toHaveProperty('preferXcodebuild');
    });
  });

  describe('Functionality', () => {
    it('should build project successfully without projectPath (testing actual behavior)', async () => {
      const result = await buildMacProj.handler({
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

    it('should build project successfully', async () => {
      const result = await buildMacProj.handler({
        projectPath: '/path/to/MyProject.xcodeproj',
        scheme: 'MyScheme',
      });

      expect(result.content).toEqual([
        { type: 'text', text: '✅ macOS Build build succeeded for scheme MyScheme.' },
        {
          type: 'text',
          text: 'Next Steps:\n1. Get App Path: get_macos_app_path_project\n2. Get Bundle ID: get_macos_bundle_id\n3. Launch App: launch_macos_app',
        },
      ]);
      expect(result.isError || false).toBe(false);
    });

    it('should accept optional configuration parameter', async () => {
      const result = await buildMacProj.handler({
        projectPath: '/path/to/MyProject.xcodeproj',
        scheme: 'MyScheme',
        configuration: 'Release',
      });

      expect(result.isError || false).toBe(false);
    });

    it('should accept optional arch parameter', async () => {
      const result = await buildMacProj.handler({
        projectPath: '/path/to/MyProject.xcodeproj',
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

      const result = await buildMacProj.handler({
        projectPath: '/path/to/MyProject.xcodeproj',
        scheme: 'MyScheme',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/❌.*failed/);
    });
  });
});