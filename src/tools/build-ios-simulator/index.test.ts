/**
 * Tests for iOS Simulator Build Tools
 *
 * Tests all iOS Simulator build tools from build_ios_simulator.ts (8 tools total):
 * - build_sim_name_ws, build_sim_id_ws, build_sim_name_proj, build_sim_id_proj
 * - build_run_sim_name_ws, build_run_sim_id_ws, build_run_sim_name_proj, build_run_sim_id_proj
 *
 * Refactored to test actual production functions instead of mock implementations.
 * Follows CLAUDE.md testing principles exactly.
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { execSync } from 'child_process';

// ✅ Import actual production helper functions (private functions can't be imported, so we'll test via exports)
import {
  registerSimulatorBuildByNameWorkspaceTool,
  registerSimulatorBuildByIdWorkspaceTool,
  registerSimulatorBuildByNameProjectTool,
  registerSimulatorBuildByIdProjectTool,
  registerSimulatorBuildAndRunByNameWorkspaceTool,
  registerSimulatorBuildAndRunByIdWorkspaceTool,
  registerSimulatorBuildAndRunByNameProjectTool,
  registerSimulatorBuildAndRunByIdProjectTool,
} from './build_ios_simulator.js';

// ✅ Mock external dependencies only
vi.mock('child_process', () => ({
  spawn: vi.fn(),
  execSync: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  unlink: vi.fn(),
  mkdtemp: vi.fn(() => Promise.resolve('/tmp/test-dir')),
  rm: vi.fn(() => Promise.resolve()),
}));

// ✅ Mock logger to prevent real logging during tests
vi.mock('../utils/logger.js', () => ({
  log: vi.fn(),
}));

// ✅ Mock build utilities
vi.mock('../utils/build-utils.js', () => ({
  executeXcodeBuildCommand: vi.fn(),
}));

// ✅ Mock command execution utility
vi.mock('../utils/command.js', () => ({
  executeCommand: vi.fn(),
}));

// ✅ Helper function to create mock server for testing tool registration
function createMockServer() {
  const tools = new Map();
  return {
    setRequestHandler: vi.fn(),
    tool: vi.fn((name: string, description: string, schema: any, handler: any) => {
      tools.set(name, { name, description, schema, handler });
    }),
    tools,
  } as any;
}

// ✅ Helper function to extract registered tool handler
function getRegisteredTool(registerFunction: any, toolName: string) {
  const mockServer = createMockServer();
  registerFunction(mockServer);
  return mockServer.tools.get(toolName);
}

describe('iOS Simulator Build Tools', () => {
  let mockExecuteXcodeBuildCommand: MockedFunction<any>;
  let mockExecuteCommand: MockedFunction<any>;
  let mockExecSync: MockedFunction<any>;

  beforeEach(async () => {
    // ✅ Mock external dependencies
    const buildUtils = await import('../utils/build-utils.js');
    mockExecuteXcodeBuildCommand = buildUtils.executeXcodeBuildCommand as MockedFunction<any>;

    const commandUtils = await import('../utils/command.js');
    mockExecuteCommand = commandUtils.executeCommand as MockedFunction<any>;

    mockExecSync = vi.mocked(execSync);

    // ✅ Default success behavior
    mockExecuteXcodeBuildCommand.mockResolvedValue({
      content: [
        { type: 'text', text: '✅ iOS Simulator Build build succeeded for scheme MyScheme.' },
        {
          type: 'text',
          text: "Next Steps:\n1. Get App Path: get_simulator_app_path_by_name_workspace({ simulatorName: 'iPhone 16', scheme: 'MyScheme' })\n2. Get Bundle ID: get_ios_bundle_id({ appPath: 'APP_PATH_FROM_STEP_1' })\n3. Choose one of the following options:\n   - Option 1: Launch app normally:\n     launch_app_in_simulator({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID' })\n   - Option 2: Launch app with logs (captures both console and structured logs):\n     launch_app_with_logs_in_simulator({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID' })\n   - Option 3: Launch app normally, then capture structured logs only:\n     launch_app_in_simulator({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID' })\n     start_simulator_log_capture({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID' })\n   - Option 4: Launch app normally, then capture all logs (will restart app):\n     launch_app_in_simulator({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID' })\n     start_simulator_log_capture({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID', captureConsole: true })\n\nWhen done capturing logs, use: stop_and_get_simulator_log({ logSessionId: 'SESSION_ID' })",
        },
      ],
      isError: false,
    });

    // ✅ Mock successful command responses for build and run tools
    mockExecuteCommand.mockResolvedValue({
      success: true,
      output: 'CODESIGNING_FOLDER_PATH = /path/to/app.app',
      error: '',
    });

    mockExecSync.mockReturnValue('com.example.MyApp');

    vi.clearAllMocks();
  });

  // ✅ Test actual production tool functions
  describe('build_sim_name_ws tool', () => {
    let buildTool: any;

    beforeEach(() => {
      buildTool = getRegisteredTool(registerSimulatorBuildByNameWorkspaceTool, 'build_sim_name_ws');
    });

    describe('parameter validation', () => {
      it('should reject missing workspacePath', async () => {
        const result = await buildTool.handler({
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
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
        const result = await buildTool.handler({
          workspacePath: '/path/to/Project.xcworkspace',
          simulatorName: 'iPhone 16',
        });

        expect(result.content).toEqual([
          {
            type: 'text',
            text: "Required parameter 'scheme' is missing. Please provide a value for this parameter.",
          },
        ]);
        expect(result.isError).toBe(true);
      });

      it('should reject missing simulatorName', async () => {
        const result = await buildTool.handler({
          workspacePath: '/path/to/Project.xcworkspace',
          scheme: 'MyScheme',
        });

        expect(result.content).toEqual([
          {
            type: 'text',
            text: "Required parameter 'simulatorName' is missing. Please provide a value for this parameter.",
          },
        ]);
        expect(result.isError).toBe(true);
      });
    });

    describe('success scenarios', () => {
      it('should return deterministic success response', async () => {
        const params = {
          workspacePath: '/path/to/Project.xcworkspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        };

        const result = await buildTool.handler(params);

        expect(result.content).toEqual([
          { type: 'text', text: '✅ iOS Simulator Build build succeeded for scheme MyScheme.' },
          {
            type: 'text',
            text: "Next Steps:\n1. Get App Path: get_simulator_app_path_by_name_workspace({ simulatorName: 'iPhone 16', scheme: 'MyScheme' })\n2. Get Bundle ID: get_ios_bundle_id({ appPath: 'APP_PATH_FROM_STEP_1' })\n3. Choose one of the following options:\n   - Option 1: Launch app normally:\n     launch_app_in_simulator({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID' })\n   - Option 2: Launch app with logs (captures both console and structured logs):\n     launch_app_with_logs_in_simulator({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID' })\n   - Option 3: Launch app normally, then capture structured logs only:\n     launch_app_in_simulator({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID' })\n     start_simulator_log_capture({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID' })\n   - Option 4: Launch app normally, then capture all logs (will restart app):\n     launch_app_in_simulator({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID' })\n     start_simulator_log_capture({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID', captureConsole: true })\n\nWhen done capturing logs, use: stop_and_get_simulator_log({ logSessionId: 'SESSION_ID' })",
          },
        ]);
        expect(result.isError).toBe(false);

        // ✅ Verify actual production function called external dependency correctly
        expect(mockExecuteXcodeBuildCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            workspacePath: '/path/to/Project.xcworkspace',
            scheme: 'MyScheme',
            simulatorName: 'iPhone 16',
            configuration: 'Debug',
            useLatestOS: true,
            preferXcodebuild: false,
          }),
          expect.objectContaining({
            platform: 'iOS Simulator',
            simulatorName: 'iPhone 16',
            useLatestOS: true,
            logPrefix: 'iOS Simulator Build',
          }),
          false,
          'build',
        );
      });
    });
  });

  describe('build_sim_id_ws tool', () => {
    let buildTool: any;

    beforeEach(() => {
      buildTool = getRegisteredTool(registerSimulatorBuildByIdWorkspaceTool, 'build_sim_id_ws');
    });

    describe('parameter validation', () => {
      it('should reject missing required parameters', async () => {
        const result = await buildTool.handler({});

        expect(result.content).toEqual([
          {
            type: 'text',
            text: "Required parameter 'workspacePath' is missing. Please provide a value for this parameter.",
          },
        ]);
        expect(result.isError).toBe(true);
      });
    });

    describe('success scenarios', () => {
      it('should return deterministic success response', async () => {
        // ✅ Update mock for ID-based response
        mockExecuteXcodeBuildCommand.mockResolvedValue({
          content: [
            { type: 'text', text: '✅ iOS Simulator Build build succeeded for scheme MyScheme.' },
            {
              type: 'text',
              text: "Next Steps:\n1. Get App Path: get_simulator_app_path_by_id_workspace({ simulatorId: 'B8F5B8E7-1234-4567-8901-123456789ABC', scheme: 'MyScheme' })\n2. Get Bundle ID: get_ios_bundle_id({ appPath: 'APP_PATH_FROM_STEP_1' })\n3. Choose one of the following options:\n   - Option 1: Launch app normally:\n     launch_app_in_simulator({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID' })\n   - Option 2: Launch app with logs (captures both console and structured logs):\n     launch_app_with_logs_in_simulator({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID' })\n   - Option 3: Launch app normally, then capture structured logs only:\n     launch_app_in_simulator({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID' })\n     start_simulator_log_capture({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID' })\n   - Option 4: Launch app normally, then capture all logs (will restart app):\n     launch_app_in_simulator({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID' })\n     start_simulator_log_capture({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID', captureConsole: true })\n\nWhen done capturing logs, use: stop_and_get_simulator_log({ logSessionId: 'SESSION_ID' })",
            },
          ],
          isError: false,
        });

        const params = {
          workspacePath: '/path/to/Project.xcworkspace',
          scheme: 'MyScheme',
          simulatorId: 'B8F5B8E7-1234-4567-8901-123456789ABC',
        };

        const result = await buildTool.handler(params);

        expect(result.content).toEqual([
          { type: 'text', text: '✅ iOS Simulator Build build succeeded for scheme MyScheme.' },
          {
            type: 'text',
            text: "Next Steps:\n1. Get App Path: get_simulator_app_path_by_id_workspace({ simulatorId: 'B8F5B8E7-1234-4567-8901-123456789ABC', scheme: 'MyScheme' })\n2. Get Bundle ID: get_ios_bundle_id({ appPath: 'APP_PATH_FROM_STEP_1' })\n3. Choose one of the following options:\n   - Option 1: Launch app normally:\n     launch_app_in_simulator({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID' })\n   - Option 2: Launch app with logs (captures both console and structured logs):\n     launch_app_with_logs_in_simulator({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID' })\n   - Option 3: Launch app normally, then capture structured logs only:\n     launch_app_in_simulator({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID' })\n     start_simulator_log_capture({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID' })\n   - Option 4: Launch app normally, then capture all logs (will restart app):\n     launch_app_in_simulator({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID' })\n     start_simulator_log_capture({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID', captureConsole: true })\n\nWhen done capturing logs, use: stop_and_get_simulator_log({ logSessionId: 'SESSION_ID' })",
          },
        ]);
        expect(result.isError).toBe(false);
      });
    });
  });

  describe('build_sim_name_proj tool', () => {
    let buildTool: any;

    beforeEach(() => {
      buildTool = getRegisteredTool(registerSimulatorBuildByNameProjectTool, 'build_sim_name_proj');
    });

    describe('parameter validation', () => {
      it('should reject missing required parameters', async () => {
        const result = await buildTool.handler({});

        expect(result.content).toEqual([
          {
            type: 'text',
            text: "Required parameter 'projectPath' is missing. Please provide a value for this parameter.",
          },
        ]);
        expect(result.isError).toBe(true);
      });
    });

    describe('success scenarios', () => {
      it('should return deterministic success response', async () => {
        // ✅ Update mock for project-based response
        mockExecuteXcodeBuildCommand.mockResolvedValue({
          content: [
            { type: 'text', text: '✅ iOS Simulator Build build succeeded for scheme MyScheme.' },
            {
              type: 'text',
              text: "Next Steps:\n1. Get App Path: get_simulator_app_path_by_name_project({ simulatorName: 'iPhone 16', scheme: 'MyScheme' })\n2. Get Bundle ID: get_ios_bundle_id({ appPath: 'APP_PATH_FROM_STEP_1' })\n3. Choose one of the following options:\n   - Option 1: Launch app normally:\n     launch_app_in_simulator({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID' })\n   - Option 2: Launch app with logs (captures both console and structured logs):\n     launch_app_with_logs_in_simulator({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID' })\n   - Option 3: Launch app normally, then capture structured logs only:\n     launch_app_in_simulator({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID' })\n     start_simulator_log_capture({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID' })\n   - Option 4: Launch app normally, then capture all logs (will restart app):\n     launch_app_in_simulator({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID' })\n     start_simulator_log_capture({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID', captureConsole: true })\n\nWhen done capturing logs, use: stop_and_get_simulator_log({ logSessionId: 'SESSION_ID' })",
            },
          ],
          isError: false,
        });

        const params = {
          projectPath: '/path/to/Project.xcodeproj',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        };

        const result = await buildTool.handler(params);

        expect(result.content).toEqual([
          { type: 'text', text: '✅ iOS Simulator Build build succeeded for scheme MyScheme.' },
          {
            type: 'text',
            text: "Next Steps:\n1. Get App Path: get_simulator_app_path_by_name_project({ simulatorName: 'iPhone 16', scheme: 'MyScheme' })\n2. Get Bundle ID: get_ios_bundle_id({ appPath: 'APP_PATH_FROM_STEP_1' })\n3. Choose one of the following options:\n   - Option 1: Launch app normally:\n     launch_app_in_simulator({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID' })\n   - Option 2: Launch app with logs (captures both console and structured logs):\n     launch_app_with_logs_in_simulator({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID' })\n   - Option 3: Launch app normally, then capture structured logs only:\n     launch_app_in_simulator({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID' })\n     start_simulator_log_capture({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID' })\n   - Option 4: Launch app normally, then capture all logs (will restart app):\n     launch_app_in_simulator({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID' })\n     start_simulator_log_capture({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID', captureConsole: true })\n\nWhen done capturing logs, use: stop_and_get_simulator_log({ logSessionId: 'SESSION_ID' })",
          },
        ]);
        expect(result.isError).toBe(false);
      });
    });
  });

  describe('build_sim_id_proj tool', () => {
    let buildTool: any;

    beforeEach(() => {
      buildTool = getRegisteredTool(registerSimulatorBuildByIdProjectTool, 'build_sim_id_proj');
    });

    describe('parameter validation', () => {
      it('should reject missing projectPath', async () => {
        const result = await buildTool.handler({
          scheme: 'MyScheme',
          simulatorId: 'B8F5B8E7-1234-4567-8901-123456789ABC',
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
        const result = await buildTool.handler({
          projectPath: '/path/to/Project.xcodeproj',
          simulatorId: 'B8F5B8E7-1234-4567-8901-123456789ABC',
        });

        expect(result.content).toEqual([
          {
            type: 'text',
            text: "Required parameter 'scheme' is missing. Please provide a value for this parameter.",
          },
        ]);
        expect(result.isError).toBe(true);
      });

      it('should reject missing simulatorId', async () => {
        const result = await buildTool.handler({
          projectPath: '/path/to/Project.xcodeproj',
          scheme: 'MyScheme',
        });

        expect(result.content).toEqual([
          {
            type: 'text',
            text: "Required parameter 'simulatorId' is missing. Please provide a value for this parameter.",
          },
        ]);
        expect(result.isError).toBe(true);
      });
    });

    describe('success scenarios', () => {
      it('should return deterministic success response', async () => {
        // ✅ Update mock for project ID-based response
        mockExecuteXcodeBuildCommand.mockResolvedValue({
          content: [
            { type: 'text', text: '✅ iOS Simulator Build build succeeded for scheme MyScheme.' },
            {
              type: 'text',
              text: "Next Steps:\n1. Get App Path: get_simulator_app_path_by_id_project({ simulatorId: 'B8F5B8E7-1234-4567-8901-123456789ABC', scheme: 'MyScheme' })\n2. Get Bundle ID: get_ios_bundle_id({ appPath: 'APP_PATH_FROM_STEP_1' })\n3. Choose one of the following options:\n   - Option 1: Launch app normally:\n     launch_app_in_simulator({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID' })\n   - Option 2: Launch app with logs (captures both console and structured logs):\n     launch_app_with_logs_in_simulator({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID' })\n   - Option 3: Launch app normally, then capture structured logs only:\n     launch_app_in_simulator({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID' })\n     start_simulator_log_capture({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID' })\n   - Option 4: Launch app normally, then capture all logs (will restart app):\n     launch_app_in_simulator({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID' })\n     start_simulator_log_capture({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID', captureConsole: true })\n\nWhen done capturing logs, use: stop_and_get_simulator_log({ logSessionId: 'SESSION_ID' })",
            },
          ],
          isError: false,
        });

        const params = {
          projectPath: '/path/to/Project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'B8F5B8E7-1234-4567-8901-123456789ABC',
        };

        const result = await buildTool.handler(params);

        expect(result.content).toEqual([
          { type: 'text', text: '✅ iOS Simulator Build build succeeded for scheme MyScheme.' },
          {
            type: 'text',
            text: "Next Steps:\n1. Get App Path: get_simulator_app_path_by_id_project({ simulatorId: 'B8F5B8E7-1234-4567-8901-123456789ABC', scheme: 'MyScheme' })\n2. Get Bundle ID: get_ios_bundle_id({ appPath: 'APP_PATH_FROM_STEP_1' })\n3. Choose one of the following options:\n   - Option 1: Launch app normally:\n     launch_app_in_simulator({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID' })\n   - Option 2: Launch app with logs (captures both console and structured logs):\n     launch_app_with_logs_in_simulator({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID' })\n   - Option 3: Launch app normally, then capture structured logs only:\n     launch_app_in_simulator({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID' })\n     start_simulator_log_capture({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID' })\n   - Option 4: Launch app normally, then capture all logs (will restart app):\n     launch_app_in_simulator({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID' })\n     start_simulator_log_capture({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID', captureConsole: true })\n\nWhen done capturing logs, use: stop_and_get_simulator_log({ logSessionId: 'SESSION_ID' })",
          },
        ]);
        expect(result.isError).toBe(false);
      });
    });
  });

  // ✅ Build and Run tools tests - testing complex multi-step logic
  describe('build_run_sim_name_ws tool', () => {
    let buildRunTool: any;

    beforeEach(() => {
      buildRunTool = getRegisteredTool(
        registerSimulatorBuildAndRunByNameWorkspaceTool,
        'build_run_sim_name_ws',
      );
    });

    describe('parameter validation', () => {
      it('should reject missing required parameters', async () => {
        const result = await buildRunTool.handler({});

        expect(result.content).toEqual([
          {
            type: 'text',
            text: "Required parameter 'workspacePath' is missing. Please provide a value for this parameter.",
          },
        ]);
        expect(result.isError).toBe(true);
      });
    });

    describe('success scenarios', () => {
      it('should return deterministic success response', async () => {
        // ✅ Mock the build phase
        mockExecuteXcodeBuildCommand.mockResolvedValue({
          content: [{ type: 'text', text: '✅ iOS Simulator Build succeeded.' }],
          isError: false,
        });

        // ✅ Mock getting app path from build settings
        mockExecuteCommand.mockResolvedValue({
          success: true,
          output: 'CODESIGNING_FOLDER_PATH = /path/to/MyApp.app',
          error: '',
        });

        // ✅ Mock all execSync calls in the correct order
        mockExecSync
          // 1. Find simulator by name
          .mockReturnValueOnce(
            '{ "devices": { "runtime": [{ "name": "iPhone 16", "udid": "test-uuid", "isAvailable": true }] } }',
          )
          // 2. Check simulator state
          .mockReturnValueOnce('    iPhone 16 (test-uuid) (Booted)')
          // 3. Open Simulator app (handled as non-failing)
          .mockReturnValueOnce('')
          // 4. Install app on simulator
          .mockReturnValueOnce('')
          // 5. Extract bundle ID with PlistBuddy
          .mockReturnValueOnce('com.example.MyApp')
          // 6. Launch app on simulator
          .mockReturnValueOnce('');

        const params = {
          workspacePath: '/path/to/Project.xcworkspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        };

        const result = await buildRunTool.handler(params);

        expect(result.isError).toBe(false);
        expect(result.content[0].text).toContain(
          "✅ iOS simulator build and run succeeded for scheme MyScheme targeting simulator name 'iPhone 16'",
        );
        expect(result.content[0].text).toContain(
          'The app (com.example.MyApp) is now running in the iOS Simulator',
        );
      });
    });
  });

  describe('build_run_sim_id_ws tool', () => {
    let buildRunTool: any;

    beforeEach(() => {
      buildRunTool = getRegisteredTool(
        registerSimulatorBuildAndRunByIdWorkspaceTool,
        'build_run_sim_id_ws',
      );
    });

    describe('parameter validation', () => {
      it('should reject missing required parameters', async () => {
        const result = await buildRunTool.handler({});

        expect(result.content).toEqual([
          {
            type: 'text',
            text: "Required parameter 'workspacePath' is missing. Please provide a value for this parameter.",
          },
        ]);
        expect(result.isError).toBe(true);
      });
    });

    describe('success scenarios', () => {
      it('should return deterministic success response', async () => {
        // ✅ Mock the build phase
        mockExecuteXcodeBuildCommand.mockResolvedValue({
          content: [{ type: 'text', text: '✅ iOS Simulator Build succeeded.' }],
          isError: false,
        });

        // ✅ Mock getting app path from build settings
        mockExecuteCommand.mockResolvedValue({
          success: true,
          output: 'CODESIGNING_FOLDER_PATH = /path/to/MyApp.app',
          error: '',
        });

        // ✅ Mock all execSync calls in the correct order for UUID-based simulator
        mockExecSync
          // 1. Check simulator state (UUID provided directly, skip lookup)
          .mockReturnValueOnce('    Test Simulator (test-uuid) (Booted)')
          // 2. Open Simulator app
          .mockReturnValueOnce('')
          // 3. Install app on simulator
          .mockReturnValueOnce('')
          // 4. Extract bundle ID with PlistBuddy
          .mockReturnValueOnce('com.example.MyApp')
          // 5. Launch app on simulator
          .mockReturnValueOnce('');

        const params = {
          workspacePath: '/path/to/Project.xcworkspace',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
        };

        const result = await buildRunTool.handler(params);

        expect(result.isError).toBe(false);
        expect(result.content[0].text).toContain(
          '✅ iOS simulator build and run succeeded for scheme MyScheme targeting simulator UUID test-uuid',
        );
        expect(result.content[0].text).toContain(
          'The app (com.example.MyApp) is now running in the iOS Simulator',
        );
      });
    });
  });

  describe('build_run_sim_name_proj tool', () => {
    let buildRunTool: any;

    beforeEach(() => {
      buildRunTool = getRegisteredTool(
        registerSimulatorBuildAndRunByNameProjectTool,
        'build_run_sim_name_proj',
      );
    });

    describe('parameter validation', () => {
      it('should reject missing required parameters', async () => {
        const result = await buildRunTool.handler({});

        expect(result.content).toEqual([
          {
            type: 'text',
            text: "Required parameter 'projectPath' is missing. Please provide a value for this parameter.",
          },
        ]);
        expect(result.isError).toBe(true);
      });
    });

    describe('success scenarios', () => {
      it('should return deterministic success response', async () => {
        // ✅ Mock the build phase
        mockExecuteXcodeBuildCommand.mockResolvedValue({
          content: [{ type: 'text', text: '✅ iOS Simulator Build succeeded.' }],
          isError: false,
        });

        // ✅ Mock getting app path from build settings
        mockExecuteCommand.mockResolvedValue({
          success: true,
          output: 'CODESIGNING_FOLDER_PATH = /path/to/MyApp.app',
          error: '',
        });

        // ✅ Mock all execSync calls in the correct order
        mockExecSync
          // 1. Find simulator by name
          .mockReturnValueOnce(
            '{ "devices": { "runtime": [{ "name": "iPhone 16", "udid": "test-uuid", "isAvailable": true }] } }',
          )
          // 2. Check simulator state
          .mockReturnValueOnce('    iPhone 16 (test-uuid) (Booted)')
          // 3. Open Simulator app
          .mockReturnValueOnce('')
          // 4. Install app on simulator
          .mockReturnValueOnce('')
          // 5. Extract bundle ID with PlistBuddy
          .mockReturnValueOnce('com.example.MyApp')
          // 6. Launch app on simulator
          .mockReturnValueOnce('');

        const params = {
          projectPath: '/path/to/Project.xcodeproj',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        };

        const result = await buildRunTool.handler(params);

        expect(result.isError).toBe(false);
        expect(result.content[0].text).toContain(
          "✅ iOS simulator build and run succeeded for scheme MyScheme targeting simulator name 'iPhone 16'",
        );
        expect(result.content[0].text).toContain(
          'The app (com.example.MyApp) is now running in the iOS Simulator',
        );
      });
    });
  });

  describe('build_run_sim_id_proj tool', () => {
    let buildRunTool: any;

    beforeEach(() => {
      buildRunTool = getRegisteredTool(
        registerSimulatorBuildAndRunByIdProjectTool,
        'build_run_sim_id_proj',
      );
    });

    describe('parameter validation', () => {
      it('should reject missing required parameters', async () => {
        const result = await buildRunTool.handler({});

        expect(result.content).toEqual([
          {
            type: 'text',
            text: "Required parameter 'projectPath' is missing. Please provide a value for this parameter.",
          },
        ]);
        expect(result.isError).toBe(true);
      });
    });

    describe('success scenarios', () => {
      it('should return deterministic success response', async () => {
        // ✅ Mock the build phase
        mockExecuteXcodeBuildCommand.mockResolvedValue({
          content: [{ type: 'text', text: '✅ iOS Simulator Build succeeded.' }],
          isError: false,
        });

        // ✅ Mock getting app path from build settings
        mockExecuteCommand.mockResolvedValue({
          success: true,
          output: 'CODESIGNING_FOLDER_PATH = /path/to/MyApp.app',
          error: '',
        });

        // ✅ Mock all execSync calls in the correct order for UUID-based simulator
        mockExecSync
          // 1. Check simulator state (UUID provided directly)
          .mockReturnValueOnce('    Test Simulator (test-uuid) (Booted)')
          // 2. Open Simulator app
          .mockReturnValueOnce('')
          // 3. Install app on simulator
          .mockReturnValueOnce('')
          // 4. Extract bundle ID with PlistBuddy
          .mockReturnValueOnce('com.example.MyApp')
          // 5. Launch app on simulator
          .mockReturnValueOnce('');

        const params = {
          projectPath: '/path/to/Project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
        };

        const result = await buildRunTool.handler(params);

        expect(result.isError).toBe(false);
        expect(result.content[0].text).toContain(
          '✅ iOS simulator build and run succeeded for scheme MyScheme targeting simulator UUID test-uuid',
        );
        expect(result.content[0].text).toContain(
          'The app (com.example.MyApp) is now running in the iOS Simulator',
        );
      });
    });
  });

  // ✅ Error handling tests
  describe('error handling', () => {
    it('should handle build failures correctly', async () => {
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: 'Build failed with error' }],
        isError: true,
      });

      const buildTool = getRegisteredTool(
        registerSimulatorBuildByNameWorkspaceTool,
        'build_sim_name_ws',
      );
      const result = await buildTool.handler({
        workspacePath: '/path/to/Project.xcworkspace',
        scheme: 'MyScheme',
        simulatorName: 'iPhone 16',
      });

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([{ type: 'text', text: 'Build failed with error' }]);
    });
  });

  // ✅ Tool registration verification
  describe('tool registration', () => {
    it('should register all 8 tools with correct names', () => {
      const expectedTools = [
        'build_sim_name_ws',
        'build_sim_id_ws',
        'build_sim_name_proj',
        'build_sim_id_proj',
        'build_run_sim_name_ws',
        'build_run_sim_id_ws',
        'build_run_sim_name_proj',
        'build_run_sim_id_proj',
      ];

      const mockServer = createMockServer();

      // ✅ Register all tools
      registerSimulatorBuildByNameWorkspaceTool(mockServer);
      registerSimulatorBuildByIdWorkspaceTool(mockServer);
      registerSimulatorBuildByNameProjectTool(mockServer);
      registerSimulatorBuildByIdProjectTool(mockServer);
      registerSimulatorBuildAndRunByNameWorkspaceTool(mockServer);
      registerSimulatorBuildAndRunByIdWorkspaceTool(mockServer);
      registerSimulatorBuildAndRunByNameProjectTool(mockServer);
      registerSimulatorBuildAndRunByIdProjectTool(mockServer);

      // ✅ Verify exactly 8 tools registered
      expect(mockServer.tools.size).toBe(8);

      // ✅ Verify correct tool names
      expectedTools.forEach((toolName) => {
        expect(mockServer.tools.has(toolName)).toBe(true);
      });
    });
  });
});
