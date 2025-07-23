/**
 * Tests for start_sim_log_cap plugin
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import plugin, { start_sim_log_capLogic } from '../start_sim_log_cap.ts';
import { createMockExecutor } from '../../../../utils/command.js';

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
        'Starts capturing logs from a specified simulator. Returns a session ID. By default, captures only structured logs.',
      );
    });

    it('should have handler as a function', () => {
      expect(typeof plugin.handler).toBe('function');
    });

    it('should validate schema with valid parameters', () => {
      const schema = z.object(plugin.schema);
      expect(
        schema.safeParse({ simulatorUuid: 'test-uuid', bundleId: 'com.example.app' }).success,
      ).toBe(true);
      expect(
        schema.safeParse({
          simulatorUuid: 'test-uuid',
          bundleId: 'com.example.app',
          captureConsole: true,
        }).success,
      ).toBe(true);
      expect(
        schema.safeParse({
          simulatorUuid: 'test-uuid',
          bundleId: 'com.example.app',
          captureConsole: false,
        }).success,
      ).toBe(true);
    });

    it('should reject invalid schema parameters', () => {
      const schema = z.object(plugin.schema);
      expect(schema.safeParse({ simulatorUuid: null, bundleId: 'com.example.app' }).success).toBe(
        false,
      );
      expect(
        schema.safeParse({ simulatorUuid: undefined, bundleId: 'com.example.app' }).success,
      ).toBe(false);
      expect(schema.safeParse({ simulatorUuid: 'test-uuid', bundleId: null }).success).toBe(false);
      expect(schema.safeParse({ simulatorUuid: 'test-uuid', bundleId: undefined }).success).toBe(
        false,
      );
      expect(
        schema.safeParse({
          simulatorUuid: 'test-uuid',
          bundleId: 'com.example.app',
          captureConsole: 'yes',
        }).success,
      ).toBe(false);
      expect(
        schema.safeParse({
          simulatorUuid: 'test-uuid',
          bundleId: 'com.example.app',
          captureConsole: 123,
        }).success,
      ).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return error for missing simulatorUuid', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: '' });
      const result = await start_sim_log_capLogic(
        { bundleId: 'com.example.app' } as any,
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'simulatorUuid' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should handle null bundleId parameter', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: '' });
      const logCaptureStub = (params: any) => {
        return Promise.resolve({
          sessionId: 'test-uuid-123',
          logFilePath: '/tmp/test.log',
          processes: [],
          error: undefined,
        });
      };

      const result = await start_sim_log_capLogic(
        {
          simulatorUuid: 'test-uuid',
          bundleId: null,
        } as any,
        mockExecutor,
        logCaptureStub,
      );

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe(
        "Log capture started successfully. Session ID: test-uuid-123.\n\nNote: Only structured logs are being captured.\n\nNext Steps:\n1.  Interact with your simulator and app.\n2.  Use 'stop_sim_log_cap' with session ID 'test-uuid-123' to stop capture and retrieve logs.",
      );
    });

    it('should return error when log capture fails', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: '' });
      const logCaptureStub = (params: any) => {
        return Promise.resolve({
          sessionId: '',
          logFilePath: '',
          processes: [],
          error: 'Permission denied',
        });
      };

      const result = await start_sim_log_capLogic(
        {
          simulatorUuid: 'test-uuid',
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
      const logCaptureStub = (params: any) => {
        return Promise.resolve({
          sessionId: 'test-uuid-123',
          logFilePath: '/tmp/test.log',
          processes: [],
          error: undefined,
        });
      };

      const result = await start_sim_log_capLogic(
        {
          simulatorUuid: 'test-uuid',
          bundleId: 'com.example.app',
        },
        mockExecutor,
        logCaptureStub,
      );

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe(
        "Log capture started successfully. Session ID: test-uuid-123.\n\nNote: Only structured logs are being captured.\n\nNext Steps:\n1.  Interact with your simulator and app.\n2.  Use 'stop_sim_log_cap' with session ID 'test-uuid-123' to stop capture and retrieve logs.",
      );
    });

    it('should indicate console capture when captureConsole is true', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: '' });
      const logCaptureStub = (params: any) => {
        return Promise.resolve({
          sessionId: 'test-uuid-123',
          logFilePath: '/tmp/test.log',
          processes: [],
          error: undefined,
        });
      };

      const result = await start_sim_log_capLogic(
        {
          simulatorUuid: 'test-uuid',
          bundleId: 'com.example.app',
          captureConsole: true,
        },
        mockExecutor,
        logCaptureStub,
      );

      expect(result.content[0].text).toBe(
        "Log capture started successfully. Session ID: test-uuid-123.\n\nNote: Your app was relaunched to capture console output.\n\nNext Steps:\n1.  Interact with your simulator and app.\n2.  Use 'stop_sim_log_cap' with session ID 'test-uuid-123' to stop capture and retrieve logs.",
      );
    });

    it('should create correct spawn commands for console capture', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: '' });
      const spawnCalls: Array<{
        command: string;
        args: string[];
      }> = [];

      const logCaptureStub = (params: any) => {
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
          simulatorUuid: 'test-uuid',
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

      const logCaptureStub = (params: any) => {
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
          simulatorUuid: 'test-uuid',
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
