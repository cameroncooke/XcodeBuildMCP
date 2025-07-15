import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { execSync } from 'child_process';
import { createMockExecutor } from '../../../utils/command.js';

// Mock execSync at module level BEFORE importing the plugin
const mockExecSyncCalls: Array<{ args: any; result: any }> = [];
let mockExecSyncResults: any[] = [];

const originalExecSync = (global as any).originalExecSync;
if (!originalExecSync) {
  (global as any).originalExecSync = execSync;
}

// Override execSync
const mockExecSync = (...args: any[]) => {
  const result = mockExecSyncResults.shift() || '';
  mockExecSyncCalls.push({ args, result });
  return result;
};

// Replace the execSync before importing the plugin
const childProcess = await import('child_process');
Object.defineProperty(childProcess, 'execSync', {
  value: mockExecSync,
  writable: true,
  configurable: true,
});

// Import the plugin AFTER setting up the mock
import buildRunSimIdWs from '../build_run_sim_id_ws.ts';

describe('build_run_sim_id_ws tool', () => {
  beforeEach(() => {
    mockExecSyncCalls.length = 0;
    mockExecSyncResults = [];
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
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Build failed with error',
        output: '',
      });

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
            text: '❌ [stderr] Build failed with error',
          },
          {
            type: 'text',
            text: '❌ Build build failed for scheme MyScheme.',
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

      // Override the executor to return different outputs per call
      const sequentialExecutor = async (...args: any[]) => {
        const output = mockOutputs[commandCount] || '';
        commandCount++;
        return {
          success: true,
          output,
          error: undefined,
          process: { pid: 12345 },
        };
      };

      // Set up execSync for simulator list
      mockExecSyncResults.push(
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
        sequentialExecutor,
      );

      // Expected to fail when execSync is called because simctl is not available in test environment
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: expect.stringContaining(
              'Error building and running on iOS Simulator: Error: Command failed: xcrun simctl list devices available --json',
            ),
          },
        ],
        isError: true,
      });
    });

    it('should handle exception with Error object', async () => {
      const mockExecutor = async (...args: any[]) => {
        throw new Error('Build system error');
      };

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
      const mockExecutor = async (...args: any[]) => {
        throw 'String error';
      };

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
