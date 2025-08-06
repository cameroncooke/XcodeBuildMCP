import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  createMockExecutor,
  createMockFileSystemExecutor,
  createNoopExecutor,
} from '../../../../utils/command.js';
import installAppSimIdWs from '../install_app_sim.ts';
import { install_app_simLogic } from '../../simulator-shared/install_app_sim.ts';

describe('install_app_sim_id_ws tool', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(installAppSimIdWs.name).toBe('install_app_sim');
    });

    it('should have correct description', () => {
      expect(installAppSimIdWs.description).toBe(
        "Installs an app in an iOS simulator. IMPORTANT: You MUST provide both the simulatorUuid and appPath parameters. Example: install_app_sim({ simulatorUuid: 'YOUR_UUID_HERE', appPath: '/path/to/your/app.app' })",
      );
    });

    it('should have handler function', () => {
      expect(typeof installAppSimIdWs.handler).toBe('function');
    });

    it('should have correct schema with simulatorUuid and appPath string fields', () => {
      const schema = z.object(installAppSimIdWs.schema);

      // Valid inputs
      expect(
        schema.safeParse({
          simulatorUuid: 'test-uuid-123',
          appPath: '/path/to/app.app',
        }).success,
      ).toBe(true);

      expect(
        schema.safeParse({
          simulatorUuid: 'ABC123-DEF456',
          appPath: '/another/path/app.app',
        }).success,
      ).toBe(true);

      // Invalid inputs
      expect(
        schema.safeParse({
          simulatorUuid: 123,
          appPath: '/path/to/app.app',
        }).success,
      ).toBe(false);

      expect(
        schema.safeParse({
          simulatorUuid: 'test-uuid-123',
          appPath: 123,
        }).success,
      ).toBe(false);

      expect(
        schema.safeParse({
          simulatorUuid: 'test-uuid-123',
        }).success,
      ).toBe(false);

      expect(
        schema.safeParse({
          appPath: '/path/to/app.app',
        }).success,
      ).toBe(false);

      expect(schema.safeParse({}).success).toBe(false);
    });
  });

  describe('Command Generation', () => {
    it('should generate correct simctl install command', async () => {
      const executorCalls: any[] = [];
      const mockExecutor = (...args: any[]) => {
        executorCalls.push(args);
        return Promise.resolve({
          success: true,
          output: 'App installed',
          error: undefined,
          process: { pid: 12345 },
        });
      };

      const mockFileSystem = createMockFileSystemExecutor({
        existsSync: () => true,
      });

      await install_app_simLogic(
        {
          simulatorUuid: 'test-uuid-123',
          appPath: '/path/to/app.app',
        },
        mockExecutor,
        mockFileSystem,
      );

      expect(executorCalls).toEqual([
        [
          ['xcrun', 'simctl', 'install', 'test-uuid-123', '/path/to/app.app'],
          'Install App in Simulator',
          true,
          undefined,
        ],
        [
          ['defaults', 'read', '/path/to/app.app/Info', 'CFBundleIdentifier'],
          'Extract Bundle ID',
          false,
          undefined,
        ],
      ]);
    });

    it('should generate command with different simulator UUID', async () => {
      const executorCalls: any[] = [];
      const mockExecutor = (...args: any[]) => {
        executorCalls.push(args);
        return Promise.resolve({
          success: true,
          output: 'App installed',
          error: undefined,
          process: { pid: 12345 },
        });
      };

      const mockFileSystem = createMockFileSystemExecutor({
        existsSync: () => true,
      });

      await install_app_simLogic(
        {
          simulatorUuid: 'different-uuid-456',
          appPath: '/different/path/MyApp.app',
        },
        mockExecutor,
        mockFileSystem,
      );

      expect(executorCalls).toEqual([
        [
          ['xcrun', 'simctl', 'install', 'different-uuid-456', '/different/path/MyApp.app'],
          'Install App in Simulator',
          true,
          undefined,
        ],
        [
          ['defaults', 'read', '/different/path/MyApp.app/Info', 'CFBundleIdentifier'],
          'Extract Bundle ID',
          false,
          undefined,
        ],
      ]);
    });

    it('should handle paths with spaces in command generation', async () => {
      const executorCalls: any[] = [];
      const mockExecutor = (...args: any[]) => {
        executorCalls.push(args);
        return Promise.resolve({
          success: true,
          output: 'App installed',
          error: undefined,
          process: { pid: 12345 },
        });
      };

      const mockFileSystem = createMockFileSystemExecutor({
        existsSync: () => true,
      });

      await install_app_simLogic(
        {
          simulatorUuid: 'test-uuid-123',
          appPath: '/Users/dev/My Project/MyApp.app',
        },
        mockExecutor,
        mockFileSystem,
      );

      expect(executorCalls).toEqual([
        [
          ['xcrun', 'simctl', 'install', 'test-uuid-123', '/Users/dev/My Project/MyApp.app'],
          'Install App in Simulator',
          true,
          undefined,
        ],
        [
          ['defaults', 'read', '/Users/dev/My Project/MyApp.app/Info', 'CFBundleIdentifier'],
          'Extract Bundle ID',
          false,
          undefined,
        ],
      ]);
    });

    it('should generate command with complex UUID and app path', async () => {
      const executorCalls: any[] = [];
      const mockExecutor = (...args: any[]) => {
        executorCalls.push(args);
        return Promise.resolve({
          success: true,
          output: 'App installed',
          error: undefined,
          process: { pid: 12345 },
        });
      };

      const mockFileSystem = createMockFileSystemExecutor({
        existsSync: () => true,
      });

      await install_app_simLogic(
        {
          simulatorUuid: 'F2B4A8E7-9C3D-4E5F-A1B2-C3D4E5F6A7B8',
          appPath:
            '/Applications/Xcode.app/Contents/Developer/Platforms/iPhoneSimulator.platform/Developer/SDKs/iPhoneSimulator.sdk/Applications/TestApp.app',
        },
        mockExecutor,
        mockFileSystem,
      );

      expect(executorCalls).toEqual([
        [
          [
            'xcrun',
            'simctl',
            'install',
            'F2B4A8E7-9C3D-4E5F-A1B2-C3D4E5F6A7B8',
            '/Applications/Xcode.app/Contents/Developer/Platforms/iPhoneSimulator.platform/Developer/SDKs/iPhoneSimulator.sdk/Applications/TestApp.app',
          ],
          'Install App in Simulator',
          true,
          undefined,
        ],
        [
          [
            'defaults',
            'read',
            '/Applications/Xcode.app/Contents/Developer/Platforms/iPhoneSimulator.platform/Developer/SDKs/iPhoneSimulator.sdk/Applications/TestApp.app/Info',
            'CFBundleIdentifier',
          ],
          'Extract Bundle ID',
          false,
          undefined,
        ],
      ]);
    });
  });

  describe('Parameter Validation', () => {
    it('should test Zod validation through handler (missing simulatorUuid)', async () => {
      // Test Zod validation by calling the handler with invalid params
      const result = await installAppSimIdWs.handler({
        appPath: '/path/to/app.app',
        // simulatorUuid missing
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Parameter validation failed\nDetails: Invalid parameters:\nsimulatorUuid: Required',
          },
        ],
        isError: true,
      });
    });

    it('should test Zod validation through handler (missing appPath)', async () => {
      // Test Zod validation by calling the handler with invalid params
      const result = await installAppSimIdWs.handler({
        simulatorUuid: 'test-uuid-123',
        // appPath missing
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Parameter validation failed\nDetails: Invalid parameters:\nappPath: Required',
          },
        ],
        isError: true,
      });
    });

    it('should test Zod validation through handler (both parameters missing)', async () => {
      // Test Zod validation by calling the handler with no params
      const result = await installAppSimIdWs.handler({});

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Parameter validation failed\nDetails: Invalid parameters:\nsimulatorUuid: Required\nappPath: Required',
          },
        ],
        isError: true,
      });
    });

    it('should handle file does not exist', async () => {
      const mockFileSystem = createMockFileSystemExecutor({
        existsSync: () => false,
      });

      const result = await install_app_simLogic(
        {
          simulatorUuid: 'test-uuid-123',
          appPath: '/path/to/app.app',
        },
        createNoopExecutor(),
        mockFileSystem,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "File not found: '/path/to/app.app'. Please check the path and try again.",
          },
        ],
        isError: true,
      });
    });
  });

  describe('Response Processing', () => {
    it('should handle successful install', async () => {
      let callCount = 0;
      const mockExecutor = () => {
        callCount++;
        if (callCount === 1) {
          // First call: simctl install
          return Promise.resolve({
            success: true,
            output: 'App installed',
            error: undefined,
            process: { pid: 12345 },
          });
        } else {
          // Second call: defaults read for bundle ID
          return Promise.resolve({
            success: true,
            output: 'com.example.myapp',
            error: undefined,
            process: { pid: 12345 },
          });
        }
      };

      const mockFileSystem = createMockFileSystemExecutor({
        existsSync: () => true,
      });

      const result = await install_app_simLogic(
        {
          simulatorUuid: 'test-uuid-123',
          appPath: '/path/to/app.app',
        },
        mockExecutor,
        mockFileSystem,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'App installed successfully in simulator test-uuid-123',
          },
          {
            type: 'text',
            text: `Next Steps:
1. Open the Simulator app: open_sim({ enabled: true })
2. Launch the app: launch_app_sim({ simulatorUuid: "test-uuid-123", bundleId: "com.example.myapp" })`,
          },
        ],
      });
    });

    it('should handle command failure', async () => {
      const mockExecutor = () => {
        return Promise.resolve({
          success: false,
          output: '',
          error: 'Install failed',
          process: { pid: 12345 },
        });
      };

      const mockFileSystem = createMockFileSystemExecutor({
        existsSync: () => true,
      });

      const result = await install_app_simLogic(
        {
          simulatorUuid: 'test-uuid-123',
          appPath: '/path/to/app.app',
        },
        mockExecutor,
        mockFileSystem,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Install app in simulator operation failed: Install failed',
          },
        ],
      });
    });

    it('should handle exception with Error object', async () => {
      const mockExecutor = () => {
        return Promise.reject(new Error('Command execution failed'));
      };

      const mockFileSystem = createMockFileSystemExecutor({
        existsSync: () => true,
      });

      const result = await install_app_simLogic(
        {
          simulatorUuid: 'test-uuid-123',
          appPath: '/path/to/app.app',
        },
        mockExecutor,
        mockFileSystem,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Install app in simulator operation failed: Command execution failed',
          },
        ],
      });
    });

    it('should handle exception with string error', async () => {
      const mockExecutor = () => {
        return Promise.reject('String error');
      };

      const mockFileSystem = createMockFileSystemExecutor({
        existsSync: () => true,
      });

      const result = await install_app_simLogic(
        {
          simulatorUuid: 'test-uuid-123',
          appPath: '/path/to/app.app',
        },
        mockExecutor,
        mockFileSystem,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Install app in simulator operation failed: String error',
          },
        ],
      });
    });
  });
});
