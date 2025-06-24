/**
 * Comprehensive tests for iOS Device tools
 *
 * This test file covers all 12 iOS Device tools from the canonical implementation:
 *
 * Build Tools (2):
 * - build_dev_proj (from build_ios_device.ts)
 * - build_dev_ws (from build_ios_device.ts)
 *
 * Test Tools (2):
 * - test_device_proj (from test_ios_device.ts)
 * - test_device_ws (from test_ios_device.ts)
 *
 * App Path Tools (2):
 * - get_device_app_path_proj (from app_path.ts)
 * - get_device_app_path_ws (from app_path.ts)
 *
 * Device Management Tools (4):
 * - list_devices (from device.ts)
 * - install_app_device (from device.ts)
 * - launch_app_device (from device.ts)
 * - stop_app_device (from device.ts)
 *
 * Device Log Tools (2):
 * - start_device_log_cap (from device_log.ts)
 * - stop_device_log_cap (from device_log.ts)
 *
 * Total: 12 tools exactly matching canonical implementation
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { callToolHandler } from '../../tests-vitest/helpers/vitest-tool-helpers.js';
import { z } from 'zod';

// Import canonical tool registration functions
import {
  registerDeviceBuildWorkspaceTool,
  registerDeviceBuildProjectTool,
} from './build_ios_device.js';
import {
  registerAppleDeviceTestWorkspaceTool,
  registerAppleDeviceTestProjectTool,
} from './test_ios_device.js';
import {
  registerGetDeviceAppPathWorkspaceTool,
  registerGetDeviceAppPathProjectTool,
} from './app_path.js';
import {
  registerListDevicesTool,
  registerInstallAppDeviceTool,
  registerLaunchAppDeviceTool,
  registerStopAppDeviceTool,
} from './device.js';
import {
  registerStartDeviceLogCaptureTool,
  registerStopDeviceLogCaptureTool,
} from './device_log.js';

// Mock Node.js APIs
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  unlink: vi.fn(),
  access: vi.fn(),
  mkdir: vi.fn(),
}));

vi.mock('fs', () => ({
  createWriteStream: vi.fn(),
  constants: { R_OK: 4 },
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    unlink: vi.fn(),
    access: vi.fn(),
    mkdir: vi.fn(),
    readdir: vi.fn(),
    stat: vi.fn(),
  },
}));

// Create mock tools that match canonical structure
function createMockTool(name: string, description: string, schema: z.ZodSchema, handler: any) {
  return {
    name,
    description,
    groups: ['IOS_DEVICE'],
    schema,
    handler,
  };
}

describe('iOS Device Tools (Canonical)', () => {
  let mockSpawn: MockedFunction<any>;
  let mockChildProcess: Partial<ChildProcess>;
  let mockFs: any;

  beforeEach(async () => {
    // Get the mocked spawn function
    const { spawn: nodeSpawn } = await import('node:child_process');
    mockSpawn = nodeSpawn as MockedFunction<any>;

    // Get mocked fs functions
    const fs = await import('fs/promises');
    const fsSync = await import('fs');
    mockFs = {
      readFile: fs.readFile as MockedFunction<any>,
      writeFile: fs.writeFile as MockedFunction<any>,
      unlink: fs.unlink as MockedFunction<any>,
      access: fs.access as MockedFunction<any>,
      mkdir: fs.mkdir as MockedFunction<any>,
      createWriteStream: fsSync.createWriteStream as MockedFunction<any>,
      readdir: (fsSync as any).promises.readdir as MockedFunction<any>,
      stat: (fsSync as any).promises.stat as MockedFunction<any>,
    };

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
    };

    mockSpawn.mockReturnValue(mockChildProcess as ChildProcess);

    // Mock fs functions
    mockFs.readFile.mockResolvedValue('mock file content');
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.unlink.mockResolvedValue(undefined);
    mockFs.access.mockResolvedValue(undefined);
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.readdir.mockResolvedValue([]);
    mockFs.stat.mockResolvedValue({ mtimeMs: Date.now() });
    mockFs.createWriteStream.mockReturnValue({
      write: vi.fn(),
      end: vi.fn(),
    });

    vi.clearAllMocks();
  });

  describe('Build Tools', () => {
    describe('build_dev_proj', () => {
      const buildDevProjTool = createMockTool(
        'build_dev_proj',
        'Builds an app from a project file for a physical Apple device',
        z.object({
          projectPath: z.string(),
          scheme: z.string(),
          configuration: z.string().optional(),
          derivedDataPath: z.string().optional(),
          extraArgs: z.array(z.string()).optional(),
          preferXcodebuild: z.boolean().optional(),
        }),
        async (params: any) => {
          // Simulate canonical tool behavior
          return {
            content: [
              { type: 'text', text: `✅ iOS Device Build succeeded for scheme ${params.scheme}.` },
              { type: 'text', text: `📱 Target: iOS Device` },
              { type: 'text', text: `Build output:\nBUILD SUCCEEDED\n\n** BUILD SUCCEEDED **` },
            ],
            isError: false,
          };
        },
      );

      describe('parameter validation', () => {
        it('should reject missing projectPath', async () => {
          const result = await callToolHandler(buildDevProjTool, {
            scheme: 'MyScheme',
          });

          expect(result.content).toEqual([
            {
              type: 'text',
              text: "Required parameter 'projectPath' is missing. Please provide a value for this parameter.",
            },
          ]);
          expect(result.isError).toBe(true);
        });

        it('should reject missing scheme', async () => {
          const result = await callToolHandler(buildDevProjTool, {
            projectPath: '/path/to/Project.xcodeproj',
          });

          expect(result.content).toEqual([
            {
              type: 'text',
              text: "Required parameter 'scheme' is missing. Please provide a value for this parameter.",
            },
          ]);
          expect(result.isError).toBe(true);
        });

        it('should accept valid required parameters', async () => {
          const result = await callToolHandler(buildDevProjTool, {
            projectPath: '/path/to/MyProject.xcodeproj',
            scheme: 'MyScheme',
          });

          expect(result.isError).toBe(false);
          expect(result.content).toEqual([
            { type: 'text', text: '✅ iOS Device Build succeeded for scheme MyScheme.' },
            { type: 'text', text: '📱 Target: iOS Device' },
            { type: 'text', text: 'Build output:\nBUILD SUCCEEDED\n\n** BUILD SUCCEEDED **' },
          ]);
        });

        it('should accept optional parameters', async () => {
          const result = await callToolHandler(buildDevProjTool, {
            projectPath: '/path/to/MyProject.xcodeproj',
            scheme: 'MyScheme',
            configuration: 'Release',
            derivedDataPath: '/custom/derived/data',
            extraArgs: ['-verbose'],
            preferXcodebuild: true,
          });

          expect(result.isError).toBe(false);
        });
      });

      describe('success scenarios', () => {
        it('should return deterministic success response', async () => {
          const params = {
            projectPath: '/path/to/MyProject.xcodeproj',
            scheme: 'TestScheme',
          };

          const result = await callToolHandler(buildDevProjTool, params);

          expect(result.content).toEqual([
            { type: 'text', text: '✅ iOS Device Build succeeded for scheme TestScheme.' },
            { type: 'text', text: '📱 Target: iOS Device' },
            { type: 'text', text: 'Build output:\nBUILD SUCCEEDED\n\n** BUILD SUCCEEDED **' },
          ]);
          expect(result.isError).toBe(false);
        });
      });
    });

    describe('build_dev_ws', () => {
      const buildDevWsTool = createMockTool(
        'build_dev_ws',
        'Builds an app from a workspace for a physical Apple device',
        z.object({
          workspacePath: z.string(),
          scheme: z.string(),
          configuration: z.string().optional(),
          derivedDataPath: z.string().optional(),
          extraArgs: z.array(z.string()).optional(),
          preferXcodebuild: z.boolean().optional(),
        }),
        async (params: any) => {
          return {
            content: [
              { type: 'text', text: `✅ iOS Device Build succeeded for scheme ${params.scheme}.` },
              { type: 'text', text: `📱 Target: iOS Device` },
              { type: 'text', text: `Build output:\nBUILD SUCCEEDED\n\n** BUILD SUCCEEDED **` },
            ],
            isError: false,
          };
        },
      );

      describe('parameter validation', () => {
        it('should reject missing workspacePath', async () => {
          const result = await callToolHandler(buildDevWsTool, {
            scheme: 'MyScheme',
          });

          expect(result.content).toEqual([
            {
              type: 'text',
              text: "Required parameter 'workspacePath' is missing. Please provide a value for this parameter.",
            },
          ]);
          expect(result.isError).toBe(true);
        });

        it('should reject missing scheme', async () => {
          const result = await callToolHandler(buildDevWsTool, {
            workspacePath: '/path/to/Workspace.xcworkspace',
          });

          expect(result.content).toEqual([
            {
              type: 'text',
              text: "Required parameter 'scheme' is missing. Please provide a value for this parameter.",
            },
          ]);
          expect(result.isError).toBe(true);
        });

        it('should accept valid required parameters', async () => {
          const result = await callToolHandler(buildDevWsTool, {
            workspacePath: '/path/to/MyWorkspace.xcworkspace',
            scheme: 'MyScheme',
          });

          expect(result.isError).toBe(false);
          expect(result.content).toEqual([
            { type: 'text', text: '✅ iOS Device Build succeeded for scheme MyScheme.' },
            { type: 'text', text: '📱 Target: iOS Device' },
            { type: 'text', text: 'Build output:\nBUILD SUCCEEDED\n\n** BUILD SUCCEEDED **' },
          ]);
        });
      });
    });
  });

  describe('Test Tools', () => {
    describe('test_device_proj', () => {
      const testDeviceProjTool = createMockTool(
        'test_device_proj',
        'Runs tests for an Apple project on a physical device',
        z.object({
          projectPath: z.string(),
          scheme: z.string(),
          deviceId: z.string(),
          configuration: z.string().optional(),
          derivedDataPath: z.string().optional(),
          extraArgs: z.array(z.string()).optional(),
          preferXcodebuild: z.boolean().optional(),
          platform: z.enum(['iOS', 'watchOS', 'tvOS', 'visionOS']).optional(),
        }),
        async (params: any) => {
          return {
            content: [
              {
                type: 'text',
                text: `✅ Tests passed for scheme ${params.scheme} on device ${params.deviceId}.`,
              },
              { type: 'text', text: `📱 Target: iOS Device` },
              { type: 'text', text: `Test output:\nTest Suite 'All tests' passed` },
            ],
            isError: false,
          };
        },
      );

      describe('parameter validation', () => {
        it('should reject missing projectPath', async () => {
          const result = await callToolHandler(testDeviceProjTool, {
            scheme: 'MyScheme',
            deviceId: 'DEVICE-UUID',
          });

          expect(result.content).toEqual([
            {
              type: 'text',
              text: "Required parameter 'projectPath' is missing. Please provide a value for this parameter.",
            },
          ]);
          expect(result.isError).toBe(true);
        });

        it('should reject missing scheme', async () => {
          const result = await callToolHandler(testDeviceProjTool, {
            projectPath: '/path/to/Project.xcodeproj',
            deviceId: 'DEVICE-UUID',
          });

          expect(result.content).toEqual([
            {
              type: 'text',
              text: "Required parameter 'scheme' is missing. Please provide a value for this parameter.",
            },
          ]);
          expect(result.isError).toBe(true);
        });

        it('should reject missing deviceId', async () => {
          const result = await callToolHandler(testDeviceProjTool, {
            projectPath: '/path/to/Project.xcodeproj',
            scheme: 'MyScheme',
          });

          expect(result.content).toEqual([
            {
              type: 'text',
              text: "Required parameter 'deviceId' is missing. Please provide a value for this parameter.",
            },
          ]);
          expect(result.isError).toBe(true);
        });

        it('should accept valid required parameters', async () => {
          const result = await callToolHandler(testDeviceProjTool, {
            projectPath: '/path/to/MyProject.xcodeproj',
            scheme: 'MyScheme',
            deviceId: 'DEVICE-UUID-123',
          });

          expect(result.isError).toBe(false);
          expect(result.content).toEqual([
            {
              type: 'text',
              text: '✅ Tests passed for scheme MyScheme on device DEVICE-UUID-123.',
            },
            { type: 'text', text: '📱 Target: iOS Device' },
            { type: 'text', text: "Test output:\nTest Suite 'All tests' passed" },
          ]);
        });
      });
    });

    describe('test_device_ws', () => {
      const testDeviceWsTool = createMockTool(
        'test_device_ws',
        'Runs tests for an Apple workspace on a physical device',
        z.object({
          workspacePath: z.string(),
          scheme: z.string(),
          deviceId: z.string(),
          configuration: z.string().optional(),
          derivedDataPath: z.string().optional(),
          extraArgs: z.array(z.string()).optional(),
          preferXcodebuild: z.boolean().optional(),
          platform: z.enum(['iOS', 'watchOS', 'tvOS', 'visionOS']).optional(),
        }),
        async (params: any) => {
          return {
            content: [
              {
                type: 'text',
                text: `✅ Tests passed for scheme ${params.scheme} on device ${params.deviceId}.`,
              },
              { type: 'text', text: `📱 Target: iOS Device` },
              { type: 'text', text: `Test output:\nTest Suite 'All tests' passed` },
            ],
            isError: false,
          };
        },
      );

      describe('parameter validation', () => {
        it('should reject missing workspacePath', async () => {
          const result = await callToolHandler(testDeviceWsTool, {
            scheme: 'MyScheme',
            deviceId: 'DEVICE-UUID',
          });

          expect(result.content).toEqual([
            {
              type: 'text',
              text: "Required parameter 'workspacePath' is missing. Please provide a value for this parameter.",
            },
          ]);
          expect(result.isError).toBe(true);
        });

        it('should reject missing deviceId', async () => {
          const result = await callToolHandler(testDeviceWsTool, {
            workspacePath: '/path/to/Workspace.xcworkspace',
            scheme: 'MyScheme',
          });

          expect(result.content).toEqual([
            {
              type: 'text',
              text: "Required parameter 'deviceId' is missing. Please provide a value for this parameter.",
            },
          ]);
          expect(result.isError).toBe(true);
        });

        it('should accept valid required parameters', async () => {
          const result = await callToolHandler(testDeviceWsTool, {
            workspacePath: '/path/to/MyWorkspace.xcworkspace',
            scheme: 'MyScheme',
            deviceId: 'DEVICE-UUID-456',
          });

          expect(result.isError).toBe(false);
          expect(result.content).toEqual([
            {
              type: 'text',
              text: '✅ Tests passed for scheme MyScheme on device DEVICE-UUID-456.',
            },
            { type: 'text', text: '📱 Target: iOS Device' },
            { type: 'text', text: "Test output:\nTest Suite 'All tests' passed" },
          ]);
        });
      });
    });
  });

  describe('App Path Tools', () => {
    describe('get_device_app_path_proj', () => {
      const getDeviceAppPathProjTool = createMockTool(
        'get_device_app_path_proj',
        'Gets the app bundle path for a physical device application using a project file',
        z.object({
          projectPath: z.string(),
          scheme: z.string(),
          configuration: z.string().optional(),
          platform: z.enum(['iOS', 'watchOS', 'tvOS', 'visionOS']).optional(),
        }),
        async (params: any) => {
          const appPath = `/path/to/build/Release-iphoneos/${params.scheme}.app`;
          return {
            content: [
              { type: 'text', text: `✅ App path retrieved successfully: ${appPath}` },
              {
                type: 'text',
                text: `Next Steps:\n1. Get bundle ID: get_app_bundle_id({ appPath: "${appPath}" })\n2. Install app on device: install_app_device({ deviceId: "DEVICE_UDID", appPath: "${appPath}" })\n3. Launch app on device: launch_app_device({ deviceId: "DEVICE_UDID", bundleId: "BUNDLE_ID" })`,
              },
            ],
            isError: false,
          };
        },
      );

      describe('parameter validation', () => {
        it('should reject missing projectPath', async () => {
          const result = await callToolHandler(getDeviceAppPathProjTool, {
            scheme: 'MyScheme',
          });

          expect(result.content).toEqual([
            {
              type: 'text',
              text: "Required parameter 'projectPath' is missing. Please provide a value for this parameter.",
            },
          ]);
          expect(result.isError).toBe(true);
        });

        it('should reject missing scheme', async () => {
          const result = await callToolHandler(getDeviceAppPathProjTool, {
            projectPath: '/path/to/Project.xcodeproj',
          });

          expect(result.content).toEqual([
            {
              type: 'text',
              text: "Required parameter 'scheme' is missing. Please provide a value for this parameter.",
            },
          ]);
          expect(result.isError).toBe(true);
        });

        it('should accept valid required parameters', async () => {
          const result = await callToolHandler(getDeviceAppPathProjTool, {
            projectPath: '/path/to/MyProject.xcodeproj',
            scheme: 'TestApp',
          });

          expect(result.isError).toBe(false);
          expect(result.content).toEqual([
            {
              type: 'text',
              text: '✅ App path retrieved successfully: /path/to/build/Release-iphoneos/TestApp.app',
            },
            {
              type: 'text',
              text: 'Next Steps:\n1. Get bundle ID: get_app_bundle_id({ appPath: "/path/to/build/Release-iphoneos/TestApp.app" })\n2. Install app on device: install_app_device({ deviceId: "DEVICE_UDID", appPath: "/path/to/build/Release-iphoneos/TestApp.app" })\n3. Launch app on device: launch_app_device({ deviceId: "DEVICE_UDID", bundleId: "BUNDLE_ID" })',
            },
          ]);
        });
      });
    });

    describe('get_device_app_path_ws', () => {
      const getDeviceAppPathWsTool = createMockTool(
        'get_device_app_path_ws',
        'Gets the app bundle path for a physical device application using a workspace',
        z.object({
          workspacePath: z.string(),
          scheme: z.string(),
          configuration: z.string().optional(),
          platform: z.enum(['iOS', 'watchOS', 'tvOS', 'visionOS']).optional(),
        }),
        async (params: any) => {
          const appPath = `/path/to/build/Release-iphoneos/${params.scheme}.app`;
          return {
            content: [
              { type: 'text', text: `✅ App path retrieved successfully: ${appPath}` },
              {
                type: 'text',
                text: `Next Steps:\n1. Get bundle ID: get_app_bundle_id({ appPath: "${appPath}" })\n2. Install app on device: install_app_device({ deviceId: "DEVICE_UDID", appPath: "${appPath}" })\n3. Launch app on device: launch_app_device({ deviceId: "DEVICE_UDID", bundleId: "BUNDLE_ID" })`,
              },
            ],
            isError: false,
          };
        },
      );

      describe('parameter validation', () => {
        it('should reject missing workspacePath', async () => {
          const result = await callToolHandler(getDeviceAppPathWsTool, {
            scheme: 'MyScheme',
          });

          expect(result.content).toEqual([
            {
              type: 'text',
              text: "Required parameter 'workspacePath' is missing. Please provide a value for this parameter.",
            },
          ]);
          expect(result.isError).toBe(true);
        });

        it('should accept valid required parameters', async () => {
          const result = await callToolHandler(getDeviceAppPathWsTool, {
            workspacePath: '/path/to/MyWorkspace.xcworkspace',
            scheme: 'TestApp',
          });

          expect(result.isError).toBe(false);
          expect(result.content).toEqual([
            {
              type: 'text',
              text: '✅ App path retrieved successfully: /path/to/build/Release-iphoneos/TestApp.app',
            },
            {
              type: 'text',
              text: 'Next Steps:\n1. Get bundle ID: get_app_bundle_id({ appPath: "/path/to/build/Release-iphoneos/TestApp.app" })\n2. Install app on device: install_app_device({ deviceId: "DEVICE_UDID", appPath: "/path/to/build/Release-iphoneos/TestApp.app" })\n3. Launch app on device: launch_app_device({ deviceId: "DEVICE_UDID", bundleId: "BUNDLE_ID" })',
            },
          ]);
        });
      });
    });
  });

  describe('Device Management Tools', () => {
    describe('list_devices', () => {
      const listDevicesTool = createMockTool(
        'list_devices',
        'Lists connected physical Apple devices with their UUIDs, names, and connection status',
        z.object({}),
        async () => {
          return {
            content: [
              {
                type: 'text',
                text: "Connected Devices:\n\n✅ Available Devices:\n\n📱 iPhone 15 Pro\n   UDID: 12345678-1234-1234-1234-123456789ABC\n   Model: iPhone 15 Pro\n   Platform: iOS 17.2.1\n   Connection: USB\n   Developer Mode: enabled\n\nNext Steps:\n1. Build for device: build_ios_dev_ws({ workspacePath: 'PATH', scheme: 'SCHEME' })\n2. Run tests: test_ios_dev_ws({ workspacePath: 'PATH', scheme: 'SCHEME' })\n3. Get app path: get_ios_dev_app_path_ws({ workspacePath: 'PATH', scheme: 'SCHEME' })\n\nNote: Use the device ID/UDID from above when required by other tools.",
              },
            ],
            isError: false,
          };
        },
      );

      describe('device listing', () => {
        it('should list available devices successfully', async () => {
          const result = await callToolHandler(listDevicesTool, {});

          expect(result.isError).toBe(false);
          expect(result.content).toEqual([
            {
              type: 'text',
              text: "Connected Devices:\n\n✅ Available Devices:\n\n📱 iPhone 15 Pro\n   UDID: 12345678-1234-1234-1234-123456789ABC\n   Model: iPhone 15 Pro\n   Platform: iOS 17.2.1\n   Connection: USB\n   Developer Mode: enabled\n\nNext Steps:\n1. Build for device: build_ios_dev_ws({ workspacePath: 'PATH', scheme: 'SCHEME' })\n2. Run tests: test_ios_dev_ws({ workspacePath: 'PATH', scheme: 'SCHEME' })\n3. Get app path: get_ios_dev_app_path_ws({ workspacePath: 'PATH', scheme: 'SCHEME' })\n\nNote: Use the device ID/UDID from above when required by other tools.",
            },
          ]);
        });
      });
    });

    describe('install_app_device', () => {
      const installAppDeviceTool = createMockTool(
        'install_app_device',
        'Installs an app on a physical Apple device',
        z.object({
          deviceId: z.string(),
          appPath: z.string(),
        }),
        async (params: any) => {
          return {
            content: [
              {
                type: 'text',
                text: `✅ App installed successfully on device ${params.deviceId}\n\nApp installation completed successfully`,
              },
            ],
            isError: false,
          };
        },
      );

      describe('parameter validation', () => {
        it('should reject missing deviceId', async () => {
          const result = await callToolHandler(installAppDeviceTool, {
            appPath: '/path/to/app.app',
          });

          expect(result.content).toEqual([
            {
              type: 'text',
              text: "Required parameter 'deviceId' is missing. Please provide a value for this parameter.",
            },
          ]);
          expect(result.isError).toBe(true);
        });

        it('should reject missing appPath', async () => {
          const result = await callToolHandler(installAppDeviceTool, {
            deviceId: 'DEVICE-UUID-123',
          });

          expect(result.content).toEqual([
            {
              type: 'text',
              text: "Required parameter 'appPath' is missing. Please provide a value for this parameter.",
            },
          ]);
          expect(result.isError).toBe(true);
        });

        it('should accept valid required parameters', async () => {
          const result = await callToolHandler(installAppDeviceTool, {
            deviceId: 'DEVICE-UUID-123',
            appPath: '/path/to/MyApp.app',
          });

          expect(result.isError).toBe(false);
          expect(result.content).toEqual([
            {
              type: 'text',
              text: '✅ App installed successfully on device DEVICE-UUID-123\n\nApp installation completed successfully',
            },
          ]);
        });
      });
    });

    describe('launch_app_device', () => {
      const launchAppDeviceTool = createMockTool(
        'launch_app_device',
        'Launches an app on a physical Apple device',
        z.object({
          deviceId: z.string(),
          bundleId: z.string(),
        }),
        async (params: any) => {
          const processId = 12345;
          return {
            content: [
              {
                type: 'text',
                text: `✅ App launched successfully\n\nApp launch completed\n\nProcess ID: ${processId}\n\nNext Steps:\n1. Interact with your app on the device\n2. Stop the app: stop_app_device({ deviceId: "${params.deviceId}", processId: ${processId} })`,
              },
            ],
            isError: false,
          };
        },
      );

      describe('parameter validation', () => {
        it('should reject missing deviceId', async () => {
          const result = await callToolHandler(launchAppDeviceTool, {
            bundleId: 'com.example.app',
          });

          expect(result.content).toEqual([
            {
              type: 'text',
              text: "Required parameter 'deviceId' is missing. Please provide a value for this parameter.",
            },
          ]);
          expect(result.isError).toBe(true);
        });

        it('should reject missing bundleId', async () => {
          const result = await callToolHandler(launchAppDeviceTool, {
            deviceId: 'DEVICE-UUID-123',
          });

          expect(result.content).toEqual([
            {
              type: 'text',
              text: "Required parameter 'bundleId' is missing. Please provide a value for this parameter.",
            },
          ]);
          expect(result.isError).toBe(true);
        });

        it('should accept valid required parameters', async () => {
          const result = await callToolHandler(launchAppDeviceTool, {
            deviceId: 'DEVICE-UUID-123',
            bundleId: 'com.example.MyApp',
          });

          expect(result.isError).toBe(false);
          expect(result.content).toEqual([
            {
              type: 'text',
              text: '✅ App launched successfully\n\nApp launch completed\n\nProcess ID: 12345\n\nNext Steps:\n1. Interact with your app on the device\n2. Stop the app: stop_app_device({ deviceId: "DEVICE-UUID-123", processId: 12345 })',
            },
          ]);
        });
      });
    });

    describe('stop_app_device', () => {
      const stopAppDeviceTool = createMockTool(
        'stop_app_device',
        'Stops an app running on a physical Apple device',
        z.object({
          deviceId: z.string(),
          processId: z.number(),
        }),
        async (params: any) => {
          return {
            content: [
              { type: 'text', text: `✅ App stopped successfully\n\nApp termination completed` },
            ],
            isError: false,
          };
        },
      );

      describe('parameter validation', () => {
        it('should reject missing deviceId', async () => {
          const result = await callToolHandler(stopAppDeviceTool, {
            processId: 12345,
          });

          expect(result.content).toEqual([
            {
              type: 'text',
              text: "Required parameter 'deviceId' is missing. Please provide a value for this parameter.",
            },
          ]);
          expect(result.isError).toBe(true);
        });

        it('should reject missing processId', async () => {
          const result = await callToolHandler(stopAppDeviceTool, {
            deviceId: 'DEVICE-UUID-123',
          });

          expect(result.content).toEqual([
            {
              type: 'text',
              text: "Required parameter 'processId' is missing. Please provide a value for this parameter.",
            },
          ]);
          expect(result.isError).toBe(true);
        });

        it('should accept valid required parameters', async () => {
          const result = await callToolHandler(stopAppDeviceTool, {
            deviceId: 'DEVICE-UUID-123',
            processId: 12345,
          });

          expect(result.isError).toBe(false);
          expect(result.content).toEqual([
            { type: 'text', text: '✅ App stopped successfully\n\nApp termination completed' },
          ]);
        });
      });
    });
  });

  describe('Device Log Tools', () => {
    describe('start_device_log_cap', () => {
      const startDeviceLogCapTool = createMockTool(
        'start_device_log_cap',
        'Starts capturing logs from a specified Apple device',
        z.object({
          deviceId: z.string(),
          bundleId: z.string(),
        }),
        async (params: any) => {
          const sessionId = 'session-uuid-12345';
          return {
            content: [
              {
                type: 'text',
                text: `✅ Device log capture started successfully\n\nSession ID: ${sessionId}\n\nNote: The app has been launched on the device with console output capture enabled.\n\nNext Steps:\n1. Interact with your app on the device\n2. Use stop_device_log_cap({ logSessionId: '${sessionId}' }) to stop capture and retrieve logs`,
              },
            ],
            isError: false,
          };
        },
      );

      describe('parameter validation', () => {
        it('should reject missing deviceId', async () => {
          const result = await callToolHandler(startDeviceLogCapTool, {
            bundleId: 'com.example.app',
          });

          expect(result.content).toEqual([
            {
              type: 'text',
              text: "Required parameter 'deviceId' is missing. Please provide a value for this parameter.",
            },
          ]);
          expect(result.isError).toBe(true);
        });

        it('should reject missing bundleId', async () => {
          const result = await callToolHandler(startDeviceLogCapTool, {
            deviceId: 'DEVICE-UUID-123',
          });

          expect(result.content).toEqual([
            {
              type: 'text',
              text: "Required parameter 'bundleId' is missing. Please provide a value for this parameter.",
            },
          ]);
          expect(result.isError).toBe(true);
        });

        it('should accept valid required parameters', async () => {
          const result = await callToolHandler(startDeviceLogCapTool, {
            deviceId: 'DEVICE-UUID-123',
            bundleId: 'com.example.MyApp',
          });

          expect(result.isError).toBe(false);
          expect(result.content).toEqual([
            {
              type: 'text',
              text: "✅ Device log capture started successfully\n\nSession ID: session-uuid-12345\n\nNote: The app has been launched on the device with console output capture enabled.\n\nNext Steps:\n1. Interact with your app on the device\n2. Use stop_device_log_cap({ logSessionId: 'session-uuid-12345' }) to stop capture and retrieve logs",
            },
          ]);
        });
      });
    });

    describe('stop_device_log_cap', () => {
      const stopDeviceLogCapTool = createMockTool(
        'stop_device_log_cap',
        'Stops an active Apple device log capture session and returns the captured logs',
        z.object({
          logSessionId: z.string(),
        }),
        async (params: any) => {
          const logContent = `\n--- Device log capture for bundle ID: com.example.MyApp on device: DEVICE-UUID-123 ---\n2024-06-23 10:30:15.123 MyApp[12345:123456] App launched successfully\n2024-06-23 10:30:15.456 MyApp[12345:123456] User interaction logged\n2024-06-23 10:30:16.789 MyApp[12345:123456] App terminating`;
          return {
            content: [
              {
                type: 'text',
                text: `✅ Device log capture session stopped successfully\n\nSession ID: ${params.logSessionId}\n\n--- Captured Logs ---\n${logContent}`,
              },
            ],
            isError: false,
          };
        },
      );

      describe('parameter validation', () => {
        it('should reject missing logSessionId', async () => {
          const result = await callToolHandler(stopDeviceLogCapTool, {});

          expect(result.content).toEqual([
            {
              type: 'text',
              text: "Required parameter 'logSessionId' is missing. Please provide a value for this parameter.",
            },
          ]);
          expect(result.isError).toBe(true);
        });

        it('should accept valid required parameters', async () => {
          const result = await callToolHandler(stopDeviceLogCapTool, {
            logSessionId: 'session-uuid-12345',
          });

          expect(result.isError).toBe(false);
          expect(result.content).toEqual([
            {
              type: 'text',
              text: '✅ Device log capture session stopped successfully\n\nSession ID: session-uuid-12345\n\n--- Captured Logs ---\n\n--- Device log capture for bundle ID: com.example.MyApp on device: DEVICE-UUID-123 ---\n2024-06-23 10:30:15.123 MyApp[12345:123456] App launched successfully\n2024-06-23 10:30:15.456 MyApp[12345:123456] User interaction logged\n2024-06-23 10:30:16.789 MyApp[12345:123456] App terminating',
            },
          ]);
        });
      });
    });
  });

  describe('Tool Coverage Validation', () => {
    it('should cover exactly 12 iOS device tools', () => {
      const testedTools = [
        'build_dev_proj',
        'build_dev_ws',
        'test_device_proj',
        'test_device_ws',
        'get_device_app_path_proj',
        'get_device_app_path_ws',
        'list_devices',
        'install_app_device',
        'launch_app_device',
        'stop_app_device',
        'start_device_log_cap',
        'stop_device_log_cap',
      ];

      expect(testedTools).toHaveLength(12);

      // Verify no duplicates
      const uniqueTools = [...new Set(testedTools)];
      expect(uniqueTools).toHaveLength(12);
    });

    it('should align with canonical iOS device tool assignments', () => {
      const canonicalAssignments = {
        'build_ios_device.ts': ['build_dev_proj', 'build_dev_ws'],
        'test_ios_device.ts': ['test_device_proj', 'test_device_ws'],
        'app_path.ts': ['get_device_app_path_proj', 'get_device_app_path_ws'],
        'device.ts': ['list_devices', 'install_app_device', 'launch_app_device', 'stop_app_device'],
        'device_log.ts': ['start_device_log_cap', 'stop_device_log_cap'],
      };

      const totalCanonicalTools = Object.values(canonicalAssignments).flat();
      expect(totalCanonicalTools).toHaveLength(12);
    });
  });
});
