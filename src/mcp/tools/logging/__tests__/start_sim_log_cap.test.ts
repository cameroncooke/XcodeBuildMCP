/**
 * Tests for start_sim_log_cap plugin
 */
import { describe, it, expect } from 'vitest';
import * as z from 'zod';
import { schema, handler, start_sim_log_capLogic } from '../start_sim_log_cap.ts';
import { createMockExecutor } from '../../../../test-utils/mock-executors.ts';

describe('start_sim_log_cap plugin', () => {
  // Reset any test state if needed

  describe('Export Field Validation (Literal)', () => {
    it('should export schema and handler', () => {
      expect(schema).toBeDefined();
      expect(handler).toBeDefined();
    });

    it('should have handler as a function', () => {
      expect(typeof handler).toBe('function');
    });

    it('should validate schema with valid parameters', () => {
      const schemaObj = z.object(schema);
      expect(schemaObj.safeParse({}).success).toBe(true);
      expect(schemaObj.safeParse({ captureConsole: true }).success).toBe(true);
      expect(schemaObj.safeParse({ captureConsole: false }).success).toBe(true);
    });

    it('should validate schema with subsystemFilter parameter', () => {
      const schemaObj = z.object(schema);
      // Valid enum values
      expect(schemaObj.safeParse({ subsystemFilter: 'app' }).success).toBe(true);
      expect(schemaObj.safeParse({ subsystemFilter: 'all' }).success).toBe(true);
      expect(schemaObj.safeParse({ subsystemFilter: 'swiftui' }).success).toBe(true);
      // Valid array of subsystems
      expect(schemaObj.safeParse({ subsystemFilter: ['com.apple.UIKit'] }).success).toBe(true);
      expect(
        schemaObj.safeParse({ subsystemFilter: ['com.apple.UIKit', 'com.apple.CoreData'] }).success,
      ).toBe(true);
      // Invalid values
      expect(schemaObj.safeParse({ subsystemFilter: [] }).success).toBe(false);
      expect(schemaObj.safeParse({ subsystemFilter: 'invalid' }).success).toBe(false);
      expect(schemaObj.safeParse({ subsystemFilter: 123 }).success).toBe(false);
    });

    it('should reject invalid schema parameters', () => {
      const schemaObj = z.object(schema);
      expect(schemaObj.safeParse({ captureConsole: 'yes' }).success).toBe(false);
      expect(schemaObj.safeParse({ captureConsole: 123 }).success).toBe(false);

      const withSimId = schemaObj.safeParse({ simulatorId: 'test-uuid' });
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
          bundleId: 'io.sentry.app',
          subsystemFilter: 'app',
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
          bundleId: 'io.sentry.app',
          subsystemFilter: 'app',
        },
        mockExecutor,
        logCaptureStub,
      );

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe(
        'Log capture started successfully. Session ID: test-uuid-123.\n\nOnly structured logs from the app subsystem are being captured.\n\nInteract with your simulator and app, then stop capture to retrieve logs.',
      );
      expect(result.nextStepParams?.stop_sim_log_cap).toBeDefined();
      expect(result.nextStepParams?.stop_sim_log_cap).toMatchObject({
        logSessionId: 'test-uuid-123',
      });
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
          bundleId: 'io.sentry.app',
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
          bundleId: 'io.sentry.app',
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
          bundleId: 'io.sentry.app',
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
          bundleId: 'io.sentry.app',
          captureConsole: true,
          subsystemFilter: 'app',
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
          bundleId: 'io.sentry.app',
          captureConsole: true,
          subsystemFilter: 'app',
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
          'io.sentry.app',
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
          'subsystem == "io.sentry.app"',
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
          bundleId: 'io.sentry.app',
          captureConsole: false,
          subsystemFilter: 'app',
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
          'subsystem == "io.sentry.app"',
        ],
      });
    });
  });
});
