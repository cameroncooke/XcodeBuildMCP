import { describe, it, expect, beforeEach } from 'vitest';
import * as z from 'zod';
import {
  createMockExecutor,
  createMockFileSystemExecutor,
  createNoopExecutor,
  createMockCommandResponse,
} from '../../../../test-utils/mock-executors.ts';
import { sessionStore } from '../../../../utils/session-store.ts';
import type { CommandExecutor } from '../../../../utils/execution/index.ts';
import { schema, handler, install_app_simLogic } from '../install_app_sim.ts';

describe('install_app_sim tool', () => {
  beforeEach(() => {
    sessionStore.clear();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should expose public schema with only appPath', () => {
      const schemaObj = z.object(schema);

      expect(schemaObj.safeParse({ appPath: '/path/to/app.app' }).success).toBe(true);
      expect(schemaObj.safeParse({ appPath: 42 }).success).toBe(false);
      expect(schemaObj.safeParse({}).success).toBe(false);

      expect(Object.keys(schema)).toEqual(['appPath']);

      const withSimId = schemaObj.safeParse({
        simulatorId: 'test-uuid-123',
        appPath: '/path/app.app',
      });
      expect(withSimId.success).toBe(true);
      expect('simulatorId' in (withSimId.data as Record<string, unknown>)).toBe(false);
    });
  });

  describe('Handler Requirements', () => {
    it('should require simulatorId when not provided', async () => {
      const result = await handler({ appPath: '/path/to/app.app' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Missing required session defaults');
      expect(result.content[0].text).toContain('Provide simulatorId or simulatorName');
      expect(result.content[0].text).toContain('session-set-defaults');
    });

    it('should validate appPath when simulatorId default exists', async () => {
      sessionStore.setDefaults({ simulatorId: 'SIM-UUID' });

      const result = await handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Parameter validation failed');
      expect(result.content[0].text).toContain(
        'appPath: Invalid input: expected string, received undefined',
      );
    });
  });

  describe('Command Generation', () => {
    it('should generate correct simctl install command', async () => {
      const executorCalls: Array<Parameters<CommandExecutor>> = [];
      const mockExecutor: CommandExecutor = (...args) => {
        executorCalls.push(args);
        return Promise.resolve(
          createMockCommandResponse({
            success: true,
            output: 'App installed',
          }),
        );
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
          false,
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
      const executorCalls: Array<Parameters<CommandExecutor>> = [];
      const mockExecutor: CommandExecutor = (...args) => {
        executorCalls.push(args);
        return Promise.resolve(
          createMockCommandResponse({
            success: true,
            output: 'App installed',
          }),
        );
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
          false,
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

    it('should handle bundle id extraction failure gracefully', async () => {
      const bundleIdCalls: Array<Parameters<CommandExecutor>> = [];
      const mockExecutor: CommandExecutor = (...args) => {
        bundleIdCalls.push(args);
        if (
          Array.isArray(args[0]) &&
          (args[0] as string[])[0] === 'xcrun' &&
          (args[0] as string[])[1] === 'simctl'
        ) {
          return Promise.resolve(
            createMockCommandResponse({
              success: true,
              output: 'App installed',
              error: undefined,
            }),
          );
        }
        return Promise.resolve(
          createMockCommandResponse({
            success: false,
            output: '',
            error: 'Failed to read bundle ID',
          }),
        );
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
            text: 'App installed successfully in simulator test-uuid-123.',
          },
        ],
        nextSteps: [
          {
            tool: 'open_sim',
            label: 'Open the Simulator app',
            params: {},
            priority: 1,
          },
          {
            tool: 'launch_app_sim',
            label: 'Launch the app',
            params: { simulatorId: 'test-uuid-123', bundleId: 'YOUR_APP_BUNDLE_ID' },
            priority: 2,
          },
        ],
      });
      expect(bundleIdCalls).toHaveLength(2);
    });

    it('should include bundle id when extraction succeeds', async () => {
      const bundleIdCalls: Array<Parameters<CommandExecutor>> = [];
      const mockExecutor: CommandExecutor = (...args) => {
        bundleIdCalls.push(args);
        if (
          Array.isArray(args[0]) &&
          (args[0] as string[])[0] === 'xcrun' &&
          (args[0] as string[])[1] === 'simctl'
        ) {
          return Promise.resolve(
            createMockCommandResponse({
              success: true,
              output: 'App installed',
              error: undefined,
            }),
          );
        }
        return Promise.resolve(
          createMockCommandResponse({
            success: true,
            output: 'com.example.myapp',
            error: undefined,
          }),
        );
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
            text: 'App installed successfully in simulator test-uuid-123.',
          },
        ],
        nextSteps: [
          {
            tool: 'open_sim',
            label: 'Open the Simulator app',
            params: {},
            priority: 1,
          },
          {
            tool: 'launch_app_sim',
            label: 'Launch the app',
            params: { simulatorId: 'test-uuid-123', bundleId: 'com.example.myapp' },
            priority: 2,
          },
        ],
      });
      expect(bundleIdCalls).toHaveLength(2);
    });

    it('should handle command failure', async () => {
      const mockExecutor: CommandExecutor = () =>
        Promise.resolve(
          createMockCommandResponse({
            success: false,
            output: '',
            error: 'Install failed',
          }),
        );

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
