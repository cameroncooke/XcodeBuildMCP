/**
 * Tests for build_sim_id_proj plugin
 * 
 * Migrated from src/tools/build-ios-simulator/index.test.ts
 * Tests only the build_sim_id_proj tool functionality
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import buildSimIdProjPlugin from './build_sim_id_proj.js';

// Mock external dependencies only
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

// Mock logger to prevent real logging during tests
vi.mock('../../src/utils/logger.js', () => ({
  log: vi.fn(),
}));

// Mock build utilities
vi.mock('../../src/utils/build-utils.js', () => ({
  executeXcodeBuildCommand: vi.fn(),
}));

// Mock command execution utility
vi.mock('../../src/utils/command.js', () => ({
  executeCommand: vi.fn(),
}));

describe('build_sim_id_proj plugin', () => {
  let mockExecuteXcodeBuildCommand: MockedFunction<any>;

  beforeEach(async () => {
    // Mock external dependencies
    const buildUtils = await import('../../src/utils/build-utils.js');
    mockExecuteXcodeBuildCommand = buildUtils.executeXcodeBuildCommand as MockedFunction<any>;

    // Default success behavior
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

    vi.clearAllMocks();
  });

  describe('plugin structure', () => {
    it('should export correct plugin structure', () => {
      expect(buildSimIdProjPlugin).toHaveProperty('name');
      expect(buildSimIdProjPlugin).toHaveProperty('description');
      expect(buildSimIdProjPlugin).toHaveProperty('schema');
      expect(buildSimIdProjPlugin).toHaveProperty('handler');

      expect(buildSimIdProjPlugin.name).toBe('build_sim_id_proj');
      expect(typeof buildSimIdProjPlugin.description).toBe('string');
      expect(typeof buildSimIdProjPlugin.schema).toBe('object');
      expect(typeof buildSimIdProjPlugin.handler).toBe('function');
    });
  });

  describe('parameter validation', () => {
    it('should reject missing projectPath', async () => {
      const result = await buildSimIdProjPlugin.handler({
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
      const result = await buildSimIdProjPlugin.handler({
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
      const result = await buildSimIdProjPlugin.handler({
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
      // Update mock for project ID-based response
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

      const result = await buildSimIdProjPlugin.handler(params);

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