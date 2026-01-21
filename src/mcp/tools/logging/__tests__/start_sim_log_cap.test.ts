/**
 * Tests for start_sim_log_cap plugin
 */
import { describe, it, expect } from 'vitest';
import * as z from 'zod';
import plugin, { start_sim_log_capLogic } from '../start_sim_log_cap.ts';
import { createMockExecutor } from '../../../../test-utils/mock-executors.ts';

describe('start_sim_log_cap plugin', () => {
  // Reset any test state if needed

  describe('Export Field Validation (Literal)', () => {
    it('should export an object with required properties', () => {
      expect(plugin).toHaveProperty('name');
      expect(plugin).toHaveProperty('description');
      expect(plugin).toHaveProperty('schema');
      expect(plugin).toHaveProperty('handler');
    });

    it('should have correct tool name', () => {
      expect(plugin.name).toBe('start_sim_log_cap');
    });

    it('should have correct description', () => {
      expect(plugin.description).toBe(
        "Starts capturing logs from a specified simulator. Returns a session ID. Use subsystemFilter to control what logs are captured: 'app' (default), 'all' (everything), 'swiftui' (includes Self._printChanges()), or custom subsystems.",
      );
    });

    it('should have handler as a function', () => {
      expect(typeof plugin.handler).toBe('function');
    });

    it('should validate schema with valid parameters', () => {
      const schema = z.object(plugin.schema);
      expect(schema.safeParse({ bundleId: 'com.example.app' }).success).toBe(true);
      expect(schema.safeParse({ bundleId: 'com.example.app', captureConsole: true }).success).toBe(
        true,
      );
      expect(schema.safeParse({ bundleId: 'com.example.app', captureConsole: false }).success).toBe(
        true,
      );
    });

    it('should validate schema with subsystemFilter parameter', () => {
      const schema = z.object(plugin.schema);
      // Valid enum values
      expect(
        schema.safeParse({ bundleId: 'com.example.app', subsystemFilter: 'app' }).success,
      ).toBe(true);
      expect(
        schema.safeParse({ bundleId: 'com.example.app', subsystemFilter: 'all' }).success,
      ).toBe(true);
      expect(
        schema.safeParse({ bundleId: 'com.example.app', subsystemFilter: 'swiftui' }).success,
      ).toBe(true);
      // Valid array of subsystems
      expect(
        schema.safeParse({ bundleId: 'com.example.app', subsystemFilter: ['com.apple.UIKit'] })
          .success,
      ).toBe(true);
      expect(
        schema.safeParse({
          bundleId: 'com.example.app',
          subsystemFilter: ['com.apple.UIKit', 'com.apple.CoreData'],
        }).success,
      ).toBe(true);
      // Invalid values
      expect(schema.safeParse({ bundleId: 'com.example.app', subsystemFilter: [] }).success).toBe(
        false,
      );
      expect(
        schema.safeParse({ bundleId: 'com.example.app', subsystemFilter: 'invalid' }).success,
      ).toBe(false);
      expect(schema.safeParse({ bundleId: 'com.example.app', subsystemFilter: 123 }).success).toBe(
        false,
      );
    });

    it('should reject invalid schema parameters', () => {
      const schema = z.object(plugin.schema);
      expect(schema.safeParse({ bundleId: null }).success).toBe(false);
      expect(schema.safeParse({ captureConsole: true }).success).toBe(false);
      expect(schema.safeParse({}).success).toBe(false);
      expect(schema.safeParse({ bundleId: 'com.example.app', captureConsole: 'yes' }).success).toBe(
        false,
      );
      expect(schema.safeParse({ bundleId: 'com.example.app', captureConsole: 123 }).success).toBe(
        false,
      );

      const withSimId = schema.safeParse({ simulatorId: 'test-uuid', bundleId: 'com.example.app' });
      expect(withSimId.success).toBe(true);
      expect('simulatorId' in (withSimId.data as any)).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    // Note: Parameter validation is now handled by createTypedTool wrapper
    // Invalid parameters will not reach the logic function, so we test valid scenarios

    it('should return error when log capture fails', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: '' });
      const logCaptureStub = (params: any, executor: any) => {
        return Promise.resolve({
          sessionId: '',
          logFilePath: '',
          processes: [],
          error: 'Permission denied',
        });
      };

      const result = await start_sim_log_capLogic(
        {
          simulatorId: 'test-uuid',
          bundleId: 'com.example.app',
        },
        mockExecutor,
        logCaptureStub,
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('Error starting log capture: Permission denied');
    });

    it('should return success with session ID when log capture starts successfully', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: '' });
      const logCaptureStub = (params: any, executor: any) => {
        return Promise.resolve({
          sessionId: 'test-uuid-123',
          logFilePath: '/tmp/test.log',
          processes: [],
          error: undefined,
        });
      };

      const result = await start_sim_log_capLogic(
        {
          simulatorId: 'test-uuid',
          bundleId: 'com.example.app',
        },
        mockExecutor,
        logCaptureStub,
      );

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe(
        "Log capture started successfully. Session ID: test-uuid-123.\n\nOnly structured logs from the app subsystem are being captured.\n\nNext Steps:\n1.  Interact with your simulator and app.\n2.  Use 'stop_sim_log_cap' with session ID 'test-uuid-123' to stop capture and retrieve logs.",
      );
    });

    it('should indicate swiftui capture when subsystemFilter is swiftui', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: '' });
      const logCaptureStub = (params: any, executor: any) => {
        return Promise.resolve({
          sessionId: 'test-uuid-123',
          logFilePath: '/tmp/test.log',
          processes: [],
          error: undefined,
        });
      };

      const result = await start_sim_log_capLogic(
        {
          simulatorId: 'test-uuid',
          bundleId: 'com.example.app',
          subsystemFilter: 'swiftui',
        },
        mockExecutor,
        logCaptureStub,
      );

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('SwiftUI logs');
      expect(result.content[0].text).toContain('Self._printChanges()');
    });

    it('should indicate all logs capture when subsystemFilter is all', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: '' });
      const logCaptureStub = (params: any, executor: any) => {
        return Promise.resolve({
          sessionId: 'test-uuid-123',
          logFilePath: '/tmp/test.log',
          processes: [],
          error: undefined,
        });
      };

      const result = await start_sim_log_capLogic(
        {
          simulatorId: 'test-uuid',
          bundleId: 'com.example.app',
          subsystemFilter: 'all',
        },
        mockExecutor,
        logCaptureStub,
      );

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('all system logs');
    });

    it('should indicate custom subsystems when array is provided', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: '' });
      const logCaptureStub = (params: any, executor: any) => {
        return Promise.resolve({
          sessionId: 'test-uuid-123',
          logFilePath: '/tmp/test.log',
          processes: [],
          error: undefined,
        });
      };

      const result = await start_sim_log_capLogic(
        {
          simulatorId: 'test-uuid',
          bundleId: 'com.example.app',
          subsystemFilter: ['com.apple.UIKit', 'com.apple.CoreData'],
        },
        mockExecutor,
        logCaptureStub,
      );

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('com.apple.UIKit');
      expect(result.content[0].text).toContain('com.apple.CoreData');
    });

    it('should indicate console capture when captureConsole is true', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: '' });
      const logCaptureStub = (params: any, executor: any) => {
        return Promise.resolve({
          sessionId: 'test-uuid-123',
          logFilePath: '/tmp/test.log',
          processes: [],
          error: undefined,
        });
      };

      const result = await start_sim_log_capLogic(
        {
          simulatorId: 'test-uuid',
          bundleId: 'com.example.app',
          captureConsole: true,
        },
        mockExecutor,
        logCaptureStub,
      );

      expect(result.content[0].text).toContain('Your app was relaunched to capture console output');
      expect(result.content[0].text).toContain('test-uuid-123');
    });

    it('should create correct spawn commands for console capture', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: '' });
      const spawnCalls: Array<{
        command: string;
        args: string[];
      }> = [];

      const logCaptureStub = (params: any, executor: any) => {
        if (params.captureConsole) {
          // Record the console capture spawn call
          spawnCalls.push({
            command: 'xcrun',
            args: [
              'simctl',
              'launch',
              '--console-pty',
              '--terminate-running-process',
              params.simulatorUuid,
              params.bundleId,
            ],
          });
        }
        // Record the structured log capture spawn call
        spawnCalls.push({
          command: 'xcrun',
          args: [
            'simctl',
            'spawn',
            params.simulatorUuid,
            'log',
            'stream',
            '--level=debug',
            '--predicate',
            `subsystem == "${params.bundleId}"`,
          ],
        });

        return Promise.resolve({
          sessionId: 'test-uuid-123',
          logFilePath: '/tmp/test.log',
          processes: [],
          error: undefined,
        });
      };

      await start_sim_log_capLogic(
        {
          simulatorId: 'test-uuid',
          bundleId: 'com.example.app',
          captureConsole: true,
        },
        mockExecutor,
        logCaptureStub,
      );

      // Should spawn both console capture and structured log capture
      expect(spawnCalls).toHaveLength(2);
      expect(spawnCalls[0]).toEqual({
        command: 'xcrun',
        args: [
          'simctl',
          'launch',
          '--console-pty',
          '--terminate-running-process',
          'test-uuid',
          'com.example.app',
        ],
      });
      expect(spawnCalls[1]).toEqual({
        command: 'xcrun',
        args: [
          'simctl',
          'spawn',
          'test-uuid',
          'log',
          'stream',
          '--level=debug',
          '--predicate',
          'subsystem == "com.example.app"',
        ],
      });
    });

    it('should create correct spawn commands for structured logs only', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: '' });
      const spawnCalls: Array<{
        command: string;
        args: string[];
      }> = [];

      const logCaptureStub = (params: any, executor: any) => {
        // Record the structured log capture spawn call only
        spawnCalls.push({
          command: 'xcrun',
          args: [
            'simctl',
            'spawn',
            params.simulatorUuid,
            'log',
            'stream',
            '--level=debug',
            '--predicate',
            `subsystem == "${params.bundleId}"`,
          ],
        });

        return Promise.resolve({
          sessionId: 'test-uuid-123',
          logFilePath: '/tmp/test.log',
          processes: [],
          error: undefined,
        });
      };

      await start_sim_log_capLogic(
        {
          simulatorId: 'test-uuid',
          bundleId: 'com.example.app',
          captureConsole: false,
        },
        mockExecutor,
        logCaptureStub,
      );

      // Should only spawn structured log capture
      expect(spawnCalls).toHaveLength(1);
      expect(spawnCalls[0]).toEqual({
        command: 'xcrun',
        args: [
          'simctl',
          'spawn',
          'test-uuid',
          'log',
          'stream',
          '--level=debug',
          '--predicate',
          'subsystem == "com.example.app"',
        ],
      });
    });
  });
});
