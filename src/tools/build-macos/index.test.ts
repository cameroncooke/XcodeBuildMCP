/**
 * Tests for macOS Build Tools
 *
 * This test file covers all macOS build tools from build_macos.ts:
 * - build_mac_ws: Build macOS app from workspace
 * - build_mac_proj: Build macOS app from project
 * - build_run_mac_ws: Build and run macOS app from workspace
 * - build_run_mac_proj: Build and run macOS app from project
 *
 * Tests actual production code, not mock implementations.
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { exec } from 'child_process';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';

// Import actual production tool functions
import {
  registerMacOSBuildWorkspaceTool,
  registerMacOSBuildProjectTool,
  registerMacOSBuildAndRunWorkspaceTool,
  registerMacOSBuildAndRunProjectTool,
} from './build_macos.js';

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
vi.mock('../utils/logger.js', () => ({
  log: vi.fn(),
}));

// Create mock server to capture tool registrations
const mockServer = {
  tool: vi.fn(),
} as any as Server;

// Store registered tools
let registeredTools: Map<string, any> = new Map();

describe('macOS Build Tools (Canonical)', () => {
  let mockSpawn: MockedFunction<any>;
  let mockExec: MockedFunction<any>;
  let mockChildProcess: Partial<ChildProcess>;

  beforeEach(async () => {
    // Clear registered tools
    registeredTools.clear();

    // Mock server.tool to capture registrations
    mockServer.tool.mockImplementation((name, description, schema, handler) => {
      registeredTools.set(name, { name, description, schema, handler });
    });

    // Register all production tools
    registerMacOSBuildWorkspaceTool(mockServer);
    registerMacOSBuildProjectTool(mockServer);
    registerMacOSBuildAndRunWorkspaceTool(mockServer);
    registerMacOSBuildAndRunProjectTool(mockServer);

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

  describe('Build Tools', () => {
    describe('build_mac_ws', () => {
      it('should build workspace successfully without workspacePath (testing actual behavior)', async () => {
        const tool = registeredTools.get('build_mac_ws');
        expect(tool).toBeDefined();

        const result = await tool.handler({
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
        const tool = registeredTools.get('build_mac_ws');
        expect(tool).toBeDefined();

        const result = await tool.handler({
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
        const tool = registeredTools.get('build_mac_ws');
        expect(tool).toBeDefined();

        const result = await tool.handler({
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
        const tool = registeredTools.get('build_mac_ws');
        expect(tool).toBeDefined();

        const result = await tool.handler({
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
          configuration: 'Release',
        });

        expect(result.isError || false).toBe(false);
      });

      it('should accept optional arch parameter', async () => {
        const tool = registeredTools.get('build_mac_ws');
        expect(tool).toBeDefined();

        const result = await tool.handler({
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
          arch: 'arm64',
        });

        expect(result.isError || false).toBe(false);
      });

      it('should handle build failure', async () => {
        const tool = registeredTools.get('build_mac_ws');
        expect(tool).toBeDefined();

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

        const result = await tool.handler({
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
        });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/❌.*failed/);
      });
    });

    describe('build_mac_proj', () => {
      it('should build project successfully without projectPath (testing actual behavior)', async () => {
        const tool = registeredTools.get('build_mac_proj');
        expect(tool).toBeDefined();

        const result = await tool.handler({
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
        const tool = registeredTools.get('build_mac_proj');
        expect(tool).toBeDefined();

        const result = await tool.handler({
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
    });
  });

  describe('Build and Run Tools', () => {
    describe('build_run_mac_ws', () => {
      it('should build and run workspace successfully', async () => {
        const tool = registeredTools.get('build_run_mac_ws');
        expect(tool).toBeDefined();

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

        const result = await tool.handler({
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
        });

        expect(result.content[0].text).toMatch(/✅.*succeeded.*scheme MyScheme/);
        expect(result.isError || false).toBe(false);
      });

      it('should handle build failure during build and run', async () => {
        const tool = registeredTools.get('build_run_mac_ws');
        expect(tool).toBeDefined();

        // Mock failed build
        mockChildProcess.on = vi.fn((event, callback) => {
          if (event === 'close') {
            callback(1); // Error exit code
          }
        });

        const result = await tool.handler({
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
        });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/❌.*failed/);
      });
    });

    describe('build_run_mac_proj', () => {
      it('should build and run project successfully', async () => {
        const tool = registeredTools.get('build_run_mac_proj');
        expect(tool).toBeDefined();

        // Mock successful build settings extraction
        mockChildProcess.stdout!.on = vi.fn((event, callback) => {
          if (event === 'data') {
            callback(
              'Build settings for action build and target MyApp:\n    BUILT_PRODUCTS_DIR = /path/to/build/Debug\n    FULL_PRODUCT_NAME = MyApp.app',
            );
          }
        });

        const result = await tool.handler({
          projectPath: '/path/to/MyProject.xcodeproj',
          scheme: 'MyScheme',
        });

        expect(result.content[0].text).toMatch(/✅.*succeeded.*scheme MyScheme/);
        expect(result.isError || false).toBe(false);
      });
    });
  });

  describe('Tool Count Validation', () => {
    it('should register exactly 4 macOS build tools', () => {
      const expectedTools = [
        'build_mac_ws',
        'build_mac_proj',
        'build_run_mac_ws',
        'build_run_mac_proj',
      ];

      expect(registeredTools.size).toBe(4);

      expectedTools.forEach((toolName) => {
        expect(registeredTools.has(toolName)).toBe(true);
      });
    });
  });
});
