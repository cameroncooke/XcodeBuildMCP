/**
 * Vitest tests for macOS Build Tools
 *
 * Migrated from plugin architecture to canonical implementation.
 * Tests all macOS-related tools:
 * - build_mac_ws, build_mac_proj, build_run_mac_ws, build_run_mac_proj (from build_macos.ts)
 * - test_macos_ws, test_macos_proj (from test_macos.ts)
 * - get_mac_app_path_ws, get_mac_app_path_proj (from app_path.ts)
 * - get_mac_bundle_id (from bundleId.ts)
 * - launch_mac_app, stop_mac_app (from launch.ts)
 * - clean_ws (from clean.ts)
 * - list_schems_ws, show_build_set_ws (from build_settings.ts)
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { spawn, exec, ChildProcess } from 'child_process';
import { readFile } from 'fs/promises';
import { callToolHandler, type ToolMeta } from '../../tests-vitest/helpers/vitest-tool-helpers.js';
import { z } from 'zod';

// Import canonical tool functions
import {
  registerMacOSBuildWorkspaceTool,
  registerMacOSBuildProjectTool,
  registerMacOSBuildAndRunWorkspaceTool,
  registerMacOSBuildAndRunProjectTool,
} from './build_macos.js';

import { registerMacOSTestWorkspaceTool, registerMacOSTestProjectTool } from './test_macos.js';

import {
  registerGetMacOSAppPathWorkspaceTool,
  registerGetMacOSAppPathProjectTool,
} from './app_path.js';

import { registerGetMacOSBundleIdTool } from './bundleId.js';

import { registerLaunchMacOSAppTool, registerStopMacOSAppTool } from './launch.js';

import { registerCleanWorkspaceTool } from './clean.js';

import {
  registerListSchemesWorkspaceTool,
  registerShowBuildSettingsWorkspaceTool,
} from './build_settings.js';

// Mock Node.js APIs directly
vi.mock('child_process', () => ({
  spawn: vi.fn(),
  exec: vi.fn(),
  execSync: vi.fn(() => 'com.example.MyApp'),
}));

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  unlink: vi.fn(),
  mkdtemp: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: vi.fn(() => true),
}));

vi.mock('os', () => ({
  tmpdir: vi.fn(() => '/tmp'),
}));

// Mock logger to prevent real logging during tests
vi.mock('../utils/logger.js', () => ({
  log: vi.fn(),
}));

// Tool wrapper utility to create ToolMeta from canonical registration functions
function createToolWrapper(
  name: string,
  description: string,
  groups: string[],
  registerFn: any,
  schema: z.ZodType,
): ToolMeta<z.ZodType> {
  let capturedHandler: any = null;

  // Mock server to capture the registered tool
  const mockServer = {
    tool: (toolName: string, toolDescription: string, toolSchema: any, handler: any) => {
      if (toolName === name) {
        capturedHandler = handler;
      }
    },
  };

  // Register the tool to capture its handler
  registerFn(mockServer);

  if (!capturedHandler) {
    throw new Error(`Failed to capture handler for tool: ${name}`);
  }

  return {
    name,
    description,
    groups,
    schema,
    handler: async (params: any) => {
      return await capturedHandler(params, {});
    },
  };
}

// Define schemas for macOS tools
const workspaceSchema = z.object({
  workspacePath: z.string(),
  scheme: z.string(),
  configuration: z.string().optional(),
  derivedDataPath: z.string().optional(),
  arch: z.enum(['arm64', 'x86_64']).optional(),
  extraArgs: z.array(z.string()).optional(),
  preferXcodebuild: z.boolean().optional(),
});

const projectSchema = z.object({
  projectPath: z.string(),
  scheme: z.string(),
  configuration: z.string().optional(),
  derivedDataPath: z.string().optional(),
  arch: z.enum(['arm64', 'x86_64']).optional(),
  extraArgs: z.array(z.string()).optional(),
  preferXcodebuild: z.boolean().optional(),
});

const appPathSchema = z.object({
  appPath: z.string(),
});

const appPathWithArgsSchema = z.object({
  appPath: z.string(),
  args: z.array(z.string()).optional(),
});

const stopMacAppSchema = z.object({
  appName: z.string().optional(),
  processId: z.number().optional(),
});

const cleanWorkspaceSchema = z.object({
  workspacePath: z.string(),
  scheme: z.string().optional(),
  configuration: z.string().optional(),
  derivedDataPath: z.string().optional(),
  extraArgs: z.array(z.string()).optional(),
});

const listSchemesWorkspaceSchema = z.object({
  workspacePath: z.string(),
});

// Create tool wrappers for all macOS tools
const buildMacWsTool = createToolWrapper(
  'build_mac_ws',
  'Builds a macOS app using xcodebuild from a workspace.',
  ['MACOS_WORKSPACE'],
  registerMacOSBuildWorkspaceTool,
  workspaceSchema,
);

const buildMacProjTool = createToolWrapper(
  'build_mac_proj',
  'Builds a macOS app using xcodebuild from a project file.',
  ['MACOS_PROJECT'],
  registerMacOSBuildProjectTool,
  projectSchema,
);

const buildRunMacWsTool = createToolWrapper(
  'build_run_mac_ws',
  'Builds and runs a macOS app from a workspace in one step.',
  ['MACOS_WORKSPACE'],
  registerMacOSBuildAndRunWorkspaceTool,
  workspaceSchema,
);

const buildRunMacProjTool = createToolWrapper(
  'build_run_mac_proj',
  'Builds and runs a macOS app from a project file in one step.',
  ['MACOS_PROJECT'],
  registerMacOSBuildAndRunProjectTool,
  projectSchema,
);

const testMacosWsTool = createToolWrapper(
  'test_macos_ws',
  'Runs tests for a macOS workspace using xcodebuild test and parses xcresult output.',
  ['MACOS_WORKSPACE'],
  registerMacOSTestWorkspaceTool,
  workspaceSchema,
);

const testMacosProjTool = createToolWrapper(
  'test_macos_proj',
  'Runs tests for a macOS project using xcodebuild test and parses xcresult output.',
  ['MACOS_PROJECT'],
  registerMacOSTestProjectTool,
  projectSchema,
);

const getMacAppPathWsTool = createToolWrapper(
  'get_mac_app_path_ws',
  'Gets the app bundle path for a macOS application using a workspace.',
  ['MACOS_WORKSPACE'],
  registerGetMacOSAppPathWorkspaceTool,
  workspaceSchema,
);

const getMacAppPathProjTool = createToolWrapper(
  'get_mac_app_path_proj',
  'Gets the app bundle path for a macOS application using a project file.',
  ['MACOS_PROJECT'],
  registerGetMacOSAppPathProjectTool,
  projectSchema,
);

const getMacBundleIdTool = createToolWrapper(
  'get_mac_bundle_id',
  'Extracts the bundle identifier from a macOS app bundle (.app).',
  ['MACOS'],
  registerGetMacOSBundleIdTool,
  appPathSchema,
);

const launchMacAppTool = createToolWrapper(
  'launch_mac_app',
  'Launches a macOS application.',
  ['MACOS'],
  registerLaunchMacOSAppTool,
  appPathWithArgsSchema,
);

const stopMacAppTool = createToolWrapper(
  'stop_mac_app',
  'Stops a running macOS application.',
  ['MACOS'],
  registerStopMacOSAppTool,
  stopMacAppSchema,
);

const cleanWsTool = createToolWrapper(
  'clean_ws',
  'Cleans build products for a specific workspace using xcodebuild.',
  ['WORKSPACE'],
  registerCleanWorkspaceTool,
  cleanWorkspaceSchema,
);

const listSchemsWsTool = createToolWrapper(
  'list_schems_ws',
  'Lists available schemes in the workspace.',
  ['WORKSPACE'],
  registerListSchemesWorkspaceTool,
  listSchemesWorkspaceSchema,
);

const showBuildSetWsTool = createToolWrapper(
  'show_build_set_ws',
  'Shows build settings from a workspace using xcodebuild.',
  ['WORKSPACE'],
  registerShowBuildSettingsWorkspaceTool,
  workspaceSchema,
);

describe('macOS Build Tools (Canonical)', () => {
  let mockSpawn: MockedFunction<any>;
  let mockExec: MockedFunction<any>;
  let mockChildProcess: Partial<ChildProcess>;
  let mockReadFile: MockedFunction<any>;

  beforeEach(() => {
    mockSpawn = spawn as MockedFunction<any>;
    mockExec = exec as MockedFunction<any>;
    mockReadFile = readFile as MockedFunction<any>;

    // Mock mkdtemp to return a test directory
    const mockMkdtemp = vi.fn().mockResolvedValue('/tmp/xcresult-test-123');
    vi.doMock('fs/promises', () => ({
      readFile: mockReadFile,
      writeFile: vi.fn(),
      unlink: vi.fn(),
      mkdtemp: mockMkdtemp,
      rm: vi.fn(),
    }));

    // Create mock child process with successful build output
    mockChildProcess = {
      stdout: {
        on: vi.fn((event, callback) => {
          if (event === 'data') {
            callback(`Build settings from command line:
    ARCHS = arm64
    CONFIGURATION_BUILD_DIR = /path/to/build/Debug
    BUILT_PRODUCTS_DIR = /DerivedData/Build/Products/Debug
    FULL_PRODUCT_NAME = MyScheme.app

=== BUILD TARGET MyScheme OF PROJECT Project WITH CONFIGURATION Debug ===

Check dependencies

CompileC /DerivedData/Build/Intermediates.noindex/Project.build/Debug/MyScheme.build/Objects-normal/arm64/main.o main.m normal arm64 c
    cd /path/to/project

Ld /DerivedData/Build/Products/Debug/MyScheme.app/Contents/MacOS/MyScheme normal
    cd /path/to/project

** BUILD SUCCEEDED **`);
          }
        }),
      } as any,
      stderr: {
        on: vi.fn(),
      } as any,
      on: vi.fn((event, callback) => {
        if (event === 'close') {
          callback(0); // Successful exit code
        }
      }),
    };

    mockSpawn.mockReturnValue(mockChildProcess as ChildProcess);

    // Mock exec to resolve successfully (for launch tools)
    mockExec.mockImplementation(
      (
        command: string,
        callback: (error: Error | null, stdout: string, stderr: string) => void,
      ) => {
        callback(null, '', '');
      },
    );

    vi.clearAllMocks();
  });

  describe('build_mac_ws tool', () => {
    describe('parameter validation', () => {
      it('should reject missing workspacePath', async () => {
        const params = { scheme: 'MyScheme' };

        const result = await callToolHandler(buildMacWsTool, params);

        expect(result.isError).toBe(true);
        expect(result.content).toEqual([
          {
            type: 'text',
            text: "Required parameter 'workspacePath' is missing. Please provide a value for this parameter.",
          },
        ]);
        expect(mockSpawn).not.toHaveBeenCalled();
      });

      it('should reject missing scheme', async () => {
        const params = { workspacePath: '/path/to/Project.xcworkspace' };

        const result = await callToolHandler(buildMacWsTool, params);

        expect(result.isError).toBe(true);
        expect(result.content).toEqual([
          {
            type: 'text',
            text: "Required parameter 'scheme' is missing. Please provide a value for this parameter.",
          },
        ]);
        expect(mockSpawn).not.toHaveBeenCalled();
      });

      it('should accept valid workspace and scheme', async () => {
        const params = {
          workspacePath: '/path/to/Project.xcworkspace',
          scheme: 'MyScheme',
        };

        const result = await callToolHandler(buildMacWsTool, params);

        expect(result.isError || false).toBe(false);
        expect(mockSpawn).toHaveBeenCalledTimes(1);
      });

      it('should accept optional parameters', async () => {
        const params = {
          workspacePath: '/path/to/Project.xcworkspace',
          scheme: 'MyScheme',
          configuration: 'Release',
          derivedDataPath: '/custom/derived/data',
          arch: 'x86_64' as const,
          extraArgs: ['-verbose'],
          preferXcodebuild: true,
        };

        const result = await callToolHandler(buildMacWsTool, params);

        expect(result.isError || false).toBe(false);
        expect(mockSpawn).toHaveBeenCalledTimes(1);
      });
    });

    describe('response formatting', () => {
      it('should return success response when build succeeds', async () => {
        const params = {
          workspacePath: '/path/to/Project.xcworkspace',
          scheme: 'MyScheme',
        };

        const result = await callToolHandler(buildMacWsTool, params);

        expect(result.isError || false).toBe(false);
        expect(result.content).toEqual([
          { type: 'text', text: '✅ macOS Build build succeeded for scheme MyScheme.' },
          {
            type: 'text',
            text: 'Next Steps:\n1. Get App Path: get_macos_app_path_workspace\n2. Get Bundle ID: get_macos_bundle_id\n3. Launch App: launch_macos_app',
          },
        ]);
      });

      it('should return error response when build fails', async () => {
        // Mock failed build
        const failedChildProcess = {
          ...mockChildProcess,
          stdout: {
            on: vi.fn(),
          } as any,
          stderr: {
            on: vi.fn((event, callback) => {
              if (event === 'data') {
                callback(`xcodebuild: error: The workspace 'Project' does not contain a scheme named 'InvalidScheme'.
The "-list" option can be used to find the names of the schemes in the workspace.`);
              }
            }),
          } as any,
          on: vi.fn((event, callback) => {
            if (event === 'close') {
              callback(65); // Failed exit code
            }
          }),
        };

        mockSpawn.mockReturnValue(failedChildProcess as ChildProcess);

        const params = {
          workspacePath: '/path/to/Project.xcworkspace',
          scheme: 'MyScheme',
        };

        const result = await callToolHandler(buildMacWsTool, params);

        expect(result.isError).toBe(true);
        expect(result.content).toEqual([
          {
            type: 'text',
            text: "❌ [stderr] xcodebuild: error: The workspace 'Project' does not contain a scheme named 'InvalidScheme'.",
          },
          {
            type: 'text',
            text: '❌ [stderr] The "-list" option can be used to find the names of the schemes in the workspace.',
          },
          { type: 'text', text: '❌ macOS Build build failed for scheme MyScheme.' },
        ]);
      });
    });
  });

  describe('build_mac_proj tool', () => {
    describe('parameter validation', () => {
      it('should reject missing projectPath', async () => {
        const params = { scheme: 'MyScheme' };

        const result = await callToolHandler(buildMacProjTool, params);

        expect(result.isError).toBe(true);
        expect(result.content).toEqual([
          {
            type: 'text',
            text: "Required parameter 'projectPath' is missing. Please provide a value for this parameter.",
          },
        ]);
        expect(mockSpawn).not.toHaveBeenCalled();
      });

      it('should accept valid project and scheme', async () => {
        const params = {
          projectPath: '/path/to/Project.xcodeproj',
          scheme: 'MyScheme',
        };

        const result = await callToolHandler(buildMacProjTool, params);

        expect(result.isError || false).toBe(false);
        expect(mockSpawn).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('build_run_mac_ws tool', () => {
    describe('build and run workflow', () => {
      it('should build and then launch the app', async () => {
        const params = {
          workspacePath: '/path/to/Project.xcworkspace',
          scheme: 'MyScheme',
        };

        const result = await callToolHandler(buildRunMacWsTool, params);

        expect(result.isError || false).toBe(false);
        expect(result.content).toEqual([
          { type: 'text', text: '✅ macOS Build build succeeded for scheme MyScheme.' },
          {
            type: 'text',
            text: 'Next Steps:\n1. Get App Path: get_macos_app_path_workspace\n2. Get Bundle ID: get_macos_bundle_id\n3. Launch App: launch_macos_app',
          },
          {
            type: 'text',
            text: '✅ macOS build and run succeeded for scheme MyScheme. App launched: /DerivedData/Build/Products/Debug/MyScheme.app',
          },
        ]);
        expect(mockSpawn).toHaveBeenCalled();
      });

      it('should handle build failure gracefully', async () => {
        // Mock failed build
        const failedChildProcess = {
          stdout: {
            on: vi.fn(),
          } as any,
          stderr: {
            on: vi.fn((event, callback) => {
              if (event === 'data') {
                callback('xcodebuild: error: Build failed');
              }
            }),
          } as any,
          on: vi.fn((event, callback) => {
            if (event === 'close') {
              callback(65); // Failed exit code
            }
          }),
        };

        mockSpawn.mockReturnValue(failedChildProcess as ChildProcess);

        const params = {
          workspacePath: '/path/to/Project.xcworkspace',
          scheme: 'MyScheme',
        };

        const result = await callToolHandler(buildRunMacWsTool, params);

        expect(result.isError).toBe(true);
        expect(result.content).toEqual([
          { type: 'text', text: '❌ [stderr] xcodebuild: error: Build failed' },
          { type: 'text', text: '❌ macOS Build build failed for scheme MyScheme.' },
        ]);
      });
    });
  });

  describe('build_run_mac_proj tool', () => {
    it('should build and run project successfully', async () => {
      const params = {
        projectPath: '/path/to/Project.xcodeproj',
        scheme: 'MyScheme',
      };

      const result = await callToolHandler(buildRunMacProjTool, params);

      expect(result.isError || false).toBe(false);
      expect(result.content).toEqual([
        { type: 'text', text: '✅ macOS Build build succeeded for scheme MyScheme.' },
        {
          type: 'text',
          text: 'Next Steps:\n1. Get App Path: get_macos_app_path_project\n2. Get Bundle ID: get_macos_bundle_id\n3. Launch App: launch_macos_app',
        },
        {
          type: 'text',
          text: '✅ macOS build and run succeeded for scheme MyScheme. App launched: /DerivedData/Build/Products/Debug/MyScheme.app',
        },
      ]);
    });
  });

  describe('test_macos_ws tool', () => {
    it('should validate required parameters', async () => {
      const params = {};

      const result = await callToolHandler(testMacosWsTool, params);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        {
          type: 'text',
          text: "Required parameter 'workspacePath' is missing. Please provide a value for this parameter.",
        },
      ]);
    });
  });

  describe('test_macos_proj tool', () => {
    it('should validate required parameters', async () => {
      const params = {};

      const result = await callToolHandler(testMacosProjTool, params);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        {
          type: 'text',
          text: "Required parameter 'projectPath' is missing. Please provide a value for this parameter.",
        },
      ]);
    });
  });

  describe('get_mac_app_path_ws tool', () => {
    it('should get app path successfully', async () => {
      const params = {
        workspacePath: '/path/to/Project.xcworkspace',
        scheme: 'MyScheme',
      };

      const result = await callToolHandler(getMacAppPathWsTool, params);

      expect(result.isError || false).toBe(false);
      expect(result.content).toEqual([
        {
          type: 'text',
          text: '✅ App path retrieved successfully: /DerivedData/Build/Products/Debug/MyScheme.app',
        },
        {
          type: 'text',
          text: `Next Steps:
1. Get bundle ID: get_macos_bundle_id({ appPath: "/DerivedData/Build/Products/Debug/MyScheme.app" })
2. Launch the app: launch_macos_app({ appPath: "/DerivedData/Build/Products/Debug/MyScheme.app" })`,
        },
      ]);
    });
  });

  describe('get_mac_app_path_proj tool', () => {
    it('should get project app path successfully', async () => {
      const params = {
        projectPath: '/path/to/Project.xcodeproj',
        scheme: 'MyScheme',
      };

      const result = await callToolHandler(getMacAppPathProjTool, params);

      expect(result.isError || false).toBe(false);
      expect(result.content).toEqual([
        {
          type: 'text',
          text: '✅ App path retrieved successfully: /DerivedData/Build/Products/Debug/MyScheme.app',
        },
        {
          type: 'text',
          text: `Next Steps:
1. Get bundle ID: get_macos_bundle_id({ appPath: "/DerivedData/Build/Products/Debug/MyScheme.app" })
2. Launch the app: launch_macos_app({ appPath: "/DerivedData/Build/Products/Debug/MyScheme.app" })`,
        },
      ]);
    });
  });

  describe('get_mac_bundle_id tool', () => {
    it('should extract bundle ID successfully', async () => {
      // Mock successful Info.plist read
      mockReadFile.mockResolvedValue(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleIdentifier</key>
  <string>com.example.MyApp</string>
</dict>
</plist>`);

      // Mock defaults read command
      const defaultsChildProcess = {
        stdout: {
          on: vi.fn((event, callback) => {
            if (event === 'data') {
              callback('com.example.MyApp');
            }
          }),
        } as any,
        stderr: {
          on: vi.fn(),
        } as any,
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            callback(0);
          }
        }),
      };

      mockSpawn.mockReturnValue(defaultsChildProcess as ChildProcess);

      const params = {
        appPath: '/path/to/MyApp.app',
      };

      const result = await callToolHandler(getMacBundleIdTool, params);

      expect(result.isError || false).toBe(false);
      expect(result.content).toEqual([
        { type: 'text', text: ' Bundle ID for macOS app: com.example.MyApp' },
        {
          type: 'text',
          text: `Next Steps:
- Launch the app: launch_macos_app({ appPath: "/path/to/MyApp.app" })`,
        },
      ]);
    });

    it('should handle missing app path', async () => {
      const params = {};

      const result = await callToolHandler(getMacBundleIdTool, params);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        {
          type: 'text',
          text: "Required parameter 'appPath' is missing. Please provide a value for this parameter.",
        },
      ]);
    });
  });

  describe('launch_mac_app tool', () => {
    it('should launch app successfully', async () => {
      const params = {
        appPath: '/path/to/MyApp.app',
      };

      const result = await callToolHandler(launchMacAppTool, params);

      expect(result.isError || false).toBe(false);
      expect(result.content).toEqual([
        { type: 'text', text: '✅ macOS app launched successfully: /path/to/MyApp.app' },
      ]);
    });

    it('should launch app with arguments', async () => {
      const params = {
        appPath: '/path/to/MyApp.app',
        args: ['--verbose', '--debug'],
      };

      const result = await callToolHandler(launchMacAppTool, params);

      expect(result.isError || false).toBe(false);
      expect(result.content).toEqual([
        { type: 'text', text: '✅ macOS app launched successfully: /path/to/MyApp.app' },
      ]);
    });
  });

  describe('stop_mac_app tool', () => {
    it('should stop app by name successfully', async () => {
      const params = {
        appName: 'MyApp',
      };

      const result = await callToolHandler(stopMacAppTool, params);

      expect(result.isError || false).toBe(false);
      expect(result.content).toEqual([
        { type: 'text', text: '✅ macOS app stopped successfully: MyApp' },
      ]);
    });

    it('should stop app by process ID successfully', async () => {
      const params = {
        processId: 1234,
      };

      const result = await callToolHandler(stopMacAppTool, params);

      expect(result.isError || false).toBe(false);
      expect(result.content).toEqual([
        { type: 'text', text: '✅ macOS app stopped successfully: PID 1234' },
      ]);
    });

    it('should require either appName or processId', async () => {
      const params = {};

      const result = await callToolHandler(stopMacAppTool, params);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: 'text', text: 'Either appName or processId must be provided.' },
      ]);
    });
  });

  describe('clean_ws tool', () => {
    it('should clean workspace successfully', async () => {
      const params = {
        workspacePath: '/path/to/Project.xcworkspace',
      };

      const result = await callToolHandler(cleanWsTool, params);

      expect(result.isError || false).toBe(false);
      expect(result.content).toEqual([
        { type: 'text', text: '✅ Clean clean succeeded for scheme .' },
      ]);
    });

    it('should clean workspace with scheme', async () => {
      const params = {
        workspacePath: '/path/to/Project.xcworkspace',
        scheme: 'MyScheme',
      };

      const result = await callToolHandler(cleanWsTool, params);

      expect(result.isError || false).toBe(false);
      expect(mockSpawn).toHaveBeenCalledTimes(1);
    });
  });

  describe('list_schems_ws tool', () => {
    it('should list schemes successfully', async () => {
      // Mock list schemes output
      const listSchemesChildProcess = {
        stdout: {
          on: vi.fn((event, callback) => {
            if (event === 'data') {
              callback(`Information about project "Project":
    Schemes:
        MyScheme
        MySchemeTests
        AnotherScheme

    Build Configurations:
        Debug
        Release`);
            }
          }),
        } as any,
        stderr: {
          on: vi.fn(),
        } as any,
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            callback(0);
          }
        }),
      };

      mockSpawn.mockReturnValue(listSchemesChildProcess as ChildProcess);

      const params = {
        workspacePath: '/path/to/Project.xcworkspace',
      };

      const result = await callToolHandler(listSchemsWsTool, params);

      expect(result.isError || false).toBe(false);
      expect(result.content).toEqual([
        { type: 'text', text: '✅ Available schemes:' },
        { type: 'text', text: 'MyScheme\nMySchemeTests\nAnotherScheme' },
        {
          type: 'text',
          text: `Next Steps:
1. Build the app: macos_build_workspace({ workspacePath: "/path/to/Project.xcworkspace", scheme: "MyScheme" })
   or for iOS: ios_simulator_build_by_name_workspace({ workspacePath: "/path/to/Project.xcworkspace", scheme: "MyScheme", simulatorName: "iPhone 16" })
2. Show build settings: show_build_set_ws({ workspacePath: "/path/to/Project.xcworkspace", scheme: "MyScheme" })`,
        },
      ]);
    });
  });

  describe('show_build_set_ws tool', () => {
    it('should show build settings successfully', async () => {
      // Mock build settings output
      const buildSettingsChildProcess = {
        stdout: {
          on: vi.fn((event, callback) => {
            if (event === 'data') {
              callback(`Build settings for action build and target MyScheme:
    ARCHS = arm64
    BUILD_DIR = /DerivedData/Build/Products
    CONFIGURATION_BUILD_DIR = /DerivedData/Build/Products/Debug
    FULL_PRODUCT_NAME = MyScheme.app`);
            }
          }),
        } as any,
        stderr: {
          on: vi.fn(),
        } as any,
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            callback(0);
          }
        }),
      };

      mockSpawn.mockReturnValue(buildSettingsChildProcess as ChildProcess);

      const params = {
        workspacePath: '/path/to/Project.xcworkspace',
        scheme: 'MyScheme',
      };

      const result = await callToolHandler(showBuildSetWsTool, params);

      expect(result.isError || false).toBe(false);
      expect(result.content).toEqual([
        { type: 'text', text: '✅ Build settings for scheme MyScheme:' },
        {
          type: 'text',
          text: `Build settings for action build and target MyScheme:
    ARCHS = arm64
    BUILD_DIR = /DerivedData/Build/Products
    CONFIGURATION_BUILD_DIR = /DerivedData/Build/Products/Debug
    FULL_PRODUCT_NAME = MyScheme.app`,
        },
      ]);
    });
  });

  describe('tool metadata validation', () => {
    it('should have correct metadata for all tools', () => {
      const tools = [
        { tool: buildMacWsTool, expectedName: 'build_mac_ws', expectedGroups: ['MACOS_WORKSPACE'] },
        {
          tool: buildMacProjTool,
          expectedName: 'build_mac_proj',
          expectedGroups: ['MACOS_PROJECT'],
        },
        {
          tool: buildRunMacWsTool,
          expectedName: 'build_run_mac_ws',
          expectedGroups: ['MACOS_WORKSPACE'],
        },
        {
          tool: buildRunMacProjTool,
          expectedName: 'build_run_mac_proj',
          expectedGroups: ['MACOS_PROJECT'],
        },
        {
          tool: testMacosWsTool,
          expectedName: 'test_macos_ws',
          expectedGroups: ['MACOS_WORKSPACE'],
        },
        {
          tool: testMacosProjTool,
          expectedName: 'test_macos_proj',
          expectedGroups: ['MACOS_PROJECT'],
        },
        {
          tool: getMacAppPathWsTool,
          expectedName: 'get_mac_app_path_ws',
          expectedGroups: ['MACOS_WORKSPACE'],
        },
        {
          tool: getMacAppPathProjTool,
          expectedName: 'get_mac_app_path_proj',
          expectedGroups: ['MACOS_PROJECT'],
        },
        { tool: getMacBundleIdTool, expectedName: 'get_mac_bundle_id', expectedGroups: ['MACOS'] },
        { tool: launchMacAppTool, expectedName: 'launch_mac_app', expectedGroups: ['MACOS'] },
        { tool: stopMacAppTool, expectedName: 'stop_mac_app', expectedGroups: ['MACOS'] },
        { tool: cleanWsTool, expectedName: 'clean_ws', expectedGroups: ['WORKSPACE'] },
        { tool: listSchemsWsTool, expectedName: 'list_schems_ws', expectedGroups: ['WORKSPACE'] },
        {
          tool: showBuildSetWsTool,
          expectedName: 'show_build_set_ws',
          expectedGroups: ['WORKSPACE'],
        },
      ];

      tools.forEach(({ tool, expectedName, expectedGroups }) => {
        expect(tool.name).toBe(expectedName);
        expect(tool.groups).toEqual(expectedGroups);
        expect(tool.schema).toBeDefined();
        expect(tool.handler).toBeDefined();
      });
    });
  });
});
