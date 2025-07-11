import { vi, describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { EventEmitter } from 'events';

// Import the plugin
import buildRunSimIdWs from '../build_run_sim_id_ws.ts';

// Mock only child_process at the lowest level
vi.mock('child_process', () => ({
  spawn: vi.fn(),
  execSync: vi.fn(),
}));

// Mock child process class
class MockChildProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  pid = 12345;
}

describe('build_run_sim_id_ws tool', () => {
  let mockSpawn: any;
  let mockExecSync: any;
  let mockProcess: MockChildProcess;

  beforeEach(async () => {
    const { spawn, execSync } = await import('child_process');
    mockSpawn = vi.mocked(spawn);
    mockExecSync = vi.mocked(execSync);
    mockProcess = new MockChildProcess();
    mockSpawn.mockReturnValue(mockProcess);

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
      const result = await buildRunSimIdWs.handler({
        workspacePath: undefined,
        scheme: 'MyScheme',
        simulatorId: 'test-uuid-123',
      });

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
      const result = await buildRunSimIdWs.handler({
        workspacePath: '/path/to/workspace',
        scheme: undefined,
        simulatorId: 'test-uuid-123',
      });

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
      const result = await buildRunSimIdWs.handler({
        workspacePath: '/path/to/workspace',
        scheme: 'MyScheme',
        simulatorId: undefined,
      });

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
      // Set up build failure
      setTimeout(() => {
        mockProcess.stderr.emit('data', 'Build failed with error');
        mockProcess.emit('close', 1);
      }, 0);

      const result = await buildRunSimIdWs.handler({
        workspacePath: '/path/to/workspace',
        scheme: 'MyScheme',
        simulatorId: 'test-uuid-123',
      });

      expect(result).toEqual({
        isError: true,
        content: [
          {
            type: 'text',
            text: 'Error during iOS Simulator Build build: Build failed with error',
          },
        ],
      });
    });

    it('should handle successful build and run', async () => {
      // Set up multiple command responses in sequence
      let commandCount = 0;
      const mockOutputs = [
        'Build successful', // xcodebuild output
        'BUILT_PRODUCTS_DIR = /path/to/build\nFULL_PRODUCT_NAME = MyApp.app\n', // showBuildSettings
        'App installed successfully', // simctl install
        'com.example.MyApp', // plutil extract bundle ID
        'Process launched', // simctl launch
      ];

      mockSpawn.mockImplementation(() => {
        const process = new MockChildProcess();
        setTimeout(() => {
          process.stdout.emit('data', mockOutputs[commandCount] || '');
          process.emit('close', 0);
          commandCount++;
        }, 0);
        return process;
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

      const result = await buildRunSimIdWs.handler({
        workspacePath: '/path/to/workspace',
        scheme: 'MyScheme',
        simulatorId: 'test-uuid-123',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ iOS Simulator Build build succeeded.',
          },
          {
            type: 'text',
            text: 'Build successful',
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
      // Set up spawn error
      setTimeout(() => {
        mockProcess.emit('error', new Error('Build system error'));
      }, 0);

      const result = await buildRunSimIdWs.handler({
        workspacePath: '/path/to/workspace',
        scheme: 'MyScheme',
        simulatorId: 'test-uuid-123',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error building for iOS Simulator: Build system error',
          },
        ],
        isError: true,
      });
    });

    it('should handle exception with string error', async () => {
      // Set up spawn error with string
      setTimeout(() => {
        mockProcess.emit('error', 'String error');
      }, 0);

      const result = await buildRunSimIdWs.handler({
        workspacePath: '/path/to/workspace',
        scheme: 'MyScheme',
        simulatorId: 'test-uuid-123',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error building for iOS Simulator: String error',
          },
        ],
        isError: true,
      });
    });
  });
});
