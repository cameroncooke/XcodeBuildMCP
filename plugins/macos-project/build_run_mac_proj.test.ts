/**
 * Tests for build_run_mac_proj plugin
 *
 * This test file covers the build_run_mac_proj tool specifically:
 * - Build and run macOS app from project
 *
 * Tests actual production code, not mock implementations.
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { exec } from 'child_process';

// Import plugin
import buildRunMacProj from './build_run_mac_proj.ts';

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

describe('build_run_mac_proj Plugin', () => {
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
    it('should have required plugin properties', () => {
      expect(buildRunMacProj).toBeDefined();
      expect(buildRunMacProj.name).toBe('build_run_mac_proj');
      expect(buildRunMacProj.description).toBe('Builds and runs a macOS app from a project file in one step.');
      expect(buildRunMacProj.schema).toBeDefined();
      expect(buildRunMacProj.handler).toBeDefined();
      expect(typeof buildRunMacProj.handler).toBe('function');
    });

    it('should have correct schema structure', () => {
      const schema = buildRunMacProj.schema;
      expect(schema.projectPath).toBeDefined();
      expect(schema.scheme).toBeDefined();
      expect(schema.configuration).toBeDefined();
      expect(schema.derivedDataPath).toBeDefined();
      expect(schema.arch).toBeDefined();
      expect(schema.extraArgs).toBeDefined();
      expect(schema.preferXcodebuild).toBeDefined();
    });
  });

  describe('build_run_mac_proj tool', () => {
    it('should build and run project successfully', async () => {
      // Mock successful build settings extraction
      mockChildProcess.stdout!.on = vi.fn((event, callback) => {
        if (event === 'data') {
          callback(
            'Build settings for action build and target MyApp:\n    BUILT_PRODUCTS_DIR = /path/to/build/Debug\n    FULL_PRODUCT_NAME = MyApp.app',
          );
        }
      });

      const result = await buildRunMacProj.handler({
        projectPath: '/path/to/MyProject.xcodeproj',
        scheme: 'MyScheme',
      });

      expect(result.content[0].text).toMatch(/✅.*succeeded.*scheme MyScheme/);
      expect(result.isError || false).toBe(false);
    });

    it('should accept optional configuration parameter', async () => {
      // Mock successful build settings extraction
      mockChildProcess.stdout!.on = vi.fn((event, callback) => {
        if (event === 'data') {
          callback(
            'Build settings for action build and target MyApp:\n    BUILT_PRODUCTS_DIR = /path/to/build/Release\n    FULL_PRODUCT_NAME = MyApp.app',
          );
        }
      });

      const result = await buildRunMacProj.handler({
        projectPath: '/path/to/MyProject.xcodeproj',
        scheme: 'MyScheme',
        configuration: 'Release',
      });

      expect(result.isError || false).toBe(false);
    });

    it('should accept optional arch parameter', async () => {
      // Mock successful build settings extraction
      mockChildProcess.stdout!.on = vi.fn((event, callback) => {
        if (event === 'data') {
          callback(
            'Build settings for action build and target MyApp:\n    BUILT_PRODUCTS_DIR = /path/to/build/Debug\n    FULL_PRODUCT_NAME = MyApp.app',
          );
        }
      });

      const result = await buildRunMacProj.handler({
        projectPath: '/path/to/MyProject.xcodeproj',
        scheme: 'MyScheme',
        arch: 'arm64',
      });

      expect(result.isError || false).toBe(false);
    });

    it('should handle build failure during build and run', async () => {
      // Mock failed build
      mockChildProcess.on = vi.fn((event, callback) => {
        if (event === 'close') {
          callback(1); // Error exit code
        }
      });

      const result = await buildRunMacProj.handler({
        projectPath: '/path/to/MyProject.xcodeproj',
        scheme: 'MyScheme',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/❌.*failed/);
    });
  });
});