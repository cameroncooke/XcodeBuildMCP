import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  createMockExecutor,
  createMockFileSystemExecutor,
  createNoopExecutor,
} from '../../../../test-utils/mock-executors.ts';
import { sessionStore } from '../../../../utils/session-store.ts';
import installAppSim, { install_app_simLogic } from '../install_app_sim.ts';

describe('install_app_sim tool', () => {
  beforeEach(() => {
    sessionStore.clear();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(installAppSim.name).toBe('install_app_sim');
    });

    it('should have concise description', () => {
      expect(installAppSim.description).toBe('Installs an app in an iOS simulator.');
    });

    it('should expose public schema with only appPath', () => {
      const schema = z.object(installAppSim.schema);

      expect(schema.safeParse({ appPath: '/path/to/app.app' }).success).toBe(true);
      expect(schema.safeParse({ appPath: 42 }).success).toBe(false);
      expect(schema.safeParse({}).success).toBe(false);

      expect(Object.keys(installAppSim.schema)).toEqual(['appPath']);
    });
  });

  describe('Handler Requirements', () => {
    it('should require simulatorId when not provided', async () => {
      const result = await installAppSim.handler({ appPath: '/path/to/app.app' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Missing required session defaults');
      expect(result.content[0].text).toContain('simulatorId is required');
      expect(result.content[0].text).toContain('session-set-defaults');
    });

    it('should validate appPath when simulatorId default exists', async () => {
      sessionStore.setDefaults({ simulatorId: 'SIM-UUID' });

      const result = await installAppSim.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Parameter validation failed');
      expect(result.content[0].text).toContain('appPath: Required');
      expect(result.content[0].text).toContain(
        'Tip: set session defaults via session-set-defaults',
      );
    });
  });

  describe('Command Generation', () => {
    it('should generate correct simctl install command', async () => {
      const executorCalls: unknown[] = [];
      const mockExecutor = (...args: unknown[]) => {
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
          simulatorId: 'test-uuid-123',
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

    it('should generate command with different simulator identifier', async () => {
      const executorCalls: unknown[] = [];
      const mockExecutor = (...args: unknown[]) => {
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
          simulatorId: 'different-uuid-456',
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
  });

  describe('Logic Behavior (Literal Returns)', () => {
    it('should handle file does not exist', async () => {
      const mockFileSystem = createMockFileSystemExecutor({
        existsSync: () => false,
      });

      const result = await install_app_simLogic(
        {
          simulatorId: 'test-uuid-123',
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

    it('should handle successful install', async () => {
      let callCount = 0;
      const mockExecutor = () => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            success: true,
            output: 'App installed',
            error: undefined,
            process: { pid: 12345 },
          });
        }
        return Promise.resolve({
          success: true,
          output: 'com.example.myapp',
          error: undefined,
          process: { pid: 12345 },
        });
      };

      const mockFileSystem = createMockFileSystemExecutor({
        existsSync: () => true,
      });

      const result = await install_app_simLogic(
        {
          simulatorId: 'test-uuid-123',
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
1. Open the Simulator app: open_sim({})
2. Launch the app: launch_app_sim({ simulatorId: "test-uuid-123", bundleId: "com.example.myapp" })`,
          },
        ],
      });
    });

    it('should handle command failure', async () => {
      const mockExecutor = () =>
        Promise.resolve({
          success: false,
          output: '',
          error: 'Install failed',
          process: { pid: 12345 },
        });

      const mockFileSystem = createMockFileSystemExecutor({
        existsSync: () => true,
      });

      const result = await install_app_simLogic(
        {
          simulatorId: 'test-uuid-123',
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
      const mockExecutor = () => Promise.reject(new Error('Command execution failed'));

      const mockFileSystem = createMockFileSystemExecutor({
        existsSync: () => true,
      });

      const result = await install_app_simLogic(
        {
          simulatorId: 'test-uuid-123',
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
      const mockExecutor = () => Promise.reject('String error');

      const mockFileSystem = createMockFileSystemExecutor({
        existsSync: () => true,
      });

      const result = await install_app_simLogic(
        {
          simulatorId: 'test-uuid-123',
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
