import { vi, describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../../utils/command.js';

// Import the plugin
import buildRunSimIdWs from '../build_run_sim_id_ws.ts';

// Mock only child_process at the lowest level
vi.mock('child_process', () => ({
  spawn: vi.fn(),
  execSync: vi.fn(),
}));

describe('build_run_sim_id_ws tool', () => {
  let mockExecSync: Record<string, unknown>;

  beforeEach(async () => {
    const { execSync } = await import('child_process');
    mockExecSync = vi.mocked(execSync);

    vi.clearAllMocks();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(buildRunSimIdWs.name).toBe('build_run_sim_id_ws');
    });

    it('should have correct description', () => {
      expect(buildRunSimIdWs.description).toBe(
        "Builds and runs an app from a workspace on a simulator specified by UUID. IMPORTANT: Requires workspacePath, scheme, and simulatorId. Example: build_run_sim_id_ws({ workspacePath: '/path/to/workspace', scheme: 'MyScheme', simulatorId: 'SIMULATOR_UUID' })",
      );
    });

    it('should have handler function', () => {
      expect(typeof buildRunSimIdWs.handler).toBe('function');
    });

    it('should have correct schema with required and optional fields', () => {
      const schema = z.object(buildRunSimIdWs.schema);

      // Valid inputs
      expect(
        schema.safeParse({
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
        }).success,
      ).toBe(true);

      expect(
        schema.safeParse({
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
          configuration: 'Release',
          derivedDataPath: '/path/to/derived',
          extraArgs: ['--verbose'],
          useLatestOS: true,
          preferXcodebuild: false,
        }).success,
      ).toBe(true);

      // Invalid inputs - missing required fields
      expect(
        schema.safeParse({
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
        }).success,
      ).toBe(false);

      expect(
        schema.safeParse({
          workspacePath: '/path/to/workspace',
          simulatorId: 'test-uuid-123',
        }).success,
      ).toBe(false);

      expect(
        schema.safeParse({
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
        }).success,
      ).toBe(false);

      // Invalid types
      expect(
        schema.safeParse({
          workspacePath: 123,
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
        }).success,
      ).toBe(false);

      expect(
        schema.safeParse({
          workspacePath: '/path/to/workspace',
          scheme: 123,
          simulatorId: 'test-uuid-123',
        }).success,
      ).toBe(false);

      expect(
        schema.safeParse({
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorId: 123,
        }).success,
      ).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should handle validation failure for workspacePath', async () => {
      const mockExecutor = createMockExecutor({ success: true });

      const result = await buildRunSimIdWs.handler(
        {
          workspacePath: undefined,
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'workspacePath' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should handle validation failure for scheme', async () => {
      const mockExecutor = createMockExecutor({ success: true });

      const result = await buildRunSimIdWs.handler(
        {
          workspacePath: '/path/to/workspace',
          scheme: undefined,
          simulatorId: 'test-uuid-123',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'scheme' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should handle validation failure for simulatorId', async () => {
      const mockExecutor = createMockExecutor({ success: true });

      const result = await buildRunSimIdWs.handler(
        {
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorId: undefined,
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'simulatorId' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should handle build failure', async () => {
      const mockExecutor = vi.fn().mockRejectedValue(new Error('Build failed with error'));

      const result = await buildRunSimIdWs.handler(
        {
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        isError: true,
        content: [
          {
            type: 'text',
            text: 'Error during Build build: Build failed with error',
          },
        ],
      });
    });

    it('should handle successful build and run', async () => {
      let commandCount = 0;
      const mockOutputs = [
        'Build successful', // xcodebuild build output
        'BUILT_PRODUCTS_DIR = /path/to/build\nFULL_PRODUCT_NAME = MyApp.app\n', // showBuildSettings
        'App installed successfully', // simctl install
        'com.example.MyApp', // plutil extract bundle ID
        'Process launched', // simctl launch
      ];

      const mockExecutor = vi.fn().mockImplementation(() => {
        const output = mockOutputs[commandCount] || '';
        commandCount++;
        return Promise.resolve({
          success: true,
          output,
          error: undefined,
          process: { pid: 12345 },
        });
      });

      // Set up execSync for simulator list
      mockExecSync.mockReturnValue(
        JSON.stringify({
          devices: {
            'iOS 16.0': [
              {
                udid: 'test-uuid-123',
                name: 'iPhone 14',
                state: 'Booted',
              },
            ],
          },
        }),
      );

      const result = await buildRunSimIdWs.handler(
        {
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ Build build succeeded for scheme MyScheme.',
          },
          {
            type: 'text',
            text: `Next Steps:
1. Get App Path: get_simulator_app_path_by_id_workspace({ simulatorId: 'test-uuid-123', scheme: 'MyScheme' })
2. Get Bundle ID: get_ios_bundle_id({ appPath: 'APP_PATH_FROM_STEP_1' })
3. Choose one of the following options:
   - Option 1: Launch app normally:
     launch_app_in_simulator({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID' })
   - Option 2: Launch app with logs (captures both console and structured logs):
     launch_app_with_logs_in_simulator({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID' })
   - Option 3: Launch app normally, then capture structured logs only:
     launch_app_in_simulator({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID' })
     start_simulator_log_capture({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID' })
   - Option 4: Launch app normally, then capture all logs (will restart app):
     launch_app_in_simulator({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID' })
     start_simulator_log_capture({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID', captureConsole: true })

When done capturing logs, use: stop_and_get_simulator_log({ logSessionId: 'SESSION_ID' })`,
          },
          {
            type: 'text',
            text: '✅ App built, installed, and launched successfully on iPhone 14',
          },
          {
            type: 'text',
            text: '📱 App Path: /path/to/build/MyApp.app',
          },
          {
            type: 'text',
            text: '📱 Bundle ID: com.example.MyApp',
          },
          {
            type: 'text',
            text: '📱 Simulator: iPhone 14 (test-uuid-123)',
          },
        ],
      });
    });

    it('should handle exception with Error object', async () => {
      const mockExecutor = vi.fn().mockRejectedValue(new Error('Build system error'));

      const result = await buildRunSimIdWs.handler(
        {
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error during Build build: Build system error',
          },
        ],
        isError: true,
      });
    });

    it('should handle exception with string error', async () => {
      const mockExecutor = vi.fn().mockRejectedValue('String error');

      const result = await buildRunSimIdWs.handler(
        {
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error during Build build: String error',
          },
        ],
        isError: true,
      });
    });
  });
});
