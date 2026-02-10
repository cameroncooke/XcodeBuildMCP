/**
 * Tests for launch_app_logs_sim plugin (session-aware version)
 * Follows CLAUDE.md guidance with literal validation and DI.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as z from 'zod';
import {
  schema,
  handler,
  launch_app_logs_simLogic,
  type LogCaptureFunction,
} from '../launch_app_logs_sim.ts';
import { createMockExecutor } from '../../../../test-utils/mock-executors.ts';
import { sessionStore } from '../../../../utils/session-store.ts';

describe('launch_app_logs_sim tool', () => {
  beforeEach(() => {
    sessionStore.clear();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should expose only non-session fields in public schema', () => {
      const schemaObj = z.strictObject(schema);

      expect(schemaObj.safeParse({}).success).toBe(true);
      expect(schemaObj.safeParse({ args: ['--debug'] }).success).toBe(true);
      expect(schemaObj.safeParse({ bundleId: 'io.sentry.app' }).success).toBe(false);
      expect(schemaObj.safeParse({ bundleId: 42 }).success).toBe(false);

      expect(Object.keys(schema).sort()).toEqual(['args', 'env']);

      const withSimId = schemaObj.safeParse({
        simulatorId: 'abc123',
      });
      expect(withSimId.success).toBe(false);
    });
  });

  describe('Handler Requirements', () => {
    it('should require simulatorId when not provided', async () => {
      const result = await handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Missing required session defaults');
      expect(result.content[0].text).toContain('Provide simulatorId or simulatorName');
      expect(result.content[0].text).toContain('session-set-defaults');
    });

    it('should require bundleId when simulatorId default exists', async () => {
      sessionStore.setDefaults({ simulatorId: 'SIM-UUID' });

      const result = await handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Missing required session defaults');
      expect(result.content[0].text).toContain('bundleId is required');
    });
  });

  describe('Logic Behavior (Literal Returns)', () => {
    it('should handle successful app launch with log capture', async () => {
      let capturedParams: unknown = null;
      const logCaptureStub: LogCaptureFunction = async (params) => {
        capturedParams = params;
        return {
          sessionId: 'test-session-123',
          logFilePath: '/tmp/xcodemcp_sim_log_test-session-123.log',
          processes: [],
          error: undefined,
        };
      };

      const mockExecutor = createMockExecutor({ success: true, output: '' });

      const result = await launch_app_logs_simLogic(
        {
          simulatorId: 'test-uuid-123',
          bundleId: 'io.sentry.testapp',
        },
        mockExecutor,
        logCaptureStub,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'App launched successfully in simulator test-uuid-123 with log capture enabled.\n\nLog capture session ID: test-session-123\n\nInteract with your app in the simulator, then stop capture to retrieve logs.',
          },
        ],
        nextSteps: [
          {
            tool: 'stop_sim_log_cap',
            label: 'Stop capture and retrieve logs',
            params: { logSessionId: 'test-session-123' },
            priority: 1,
          },
        ],
        isError: false,
      });

      expect(capturedParams).toEqual({
        simulatorUuid: 'test-uuid-123',
        bundleId: 'io.sentry.testapp',
        captureConsole: true,
      });
    });

    it('should include passthrough args in log capture setup', async () => {
      let capturedParams: unknown = null;
      const logCaptureStub: LogCaptureFunction = async (params) => {
        capturedParams = params;
        return {
          sessionId: 'test-session-456',
          logFilePath: '/tmp/xcodemcp_sim_log_test-session-456.log',
          processes: [],
          error: undefined,
        };
      };

      const mockExecutor = createMockExecutor({ success: true, output: '' });

      await launch_app_logs_simLogic(
        {
          simulatorId: 'test-uuid-123',
          bundleId: 'io.sentry.testapp',
          args: ['--debug'],
        },
        mockExecutor,
        logCaptureStub,
      );

      expect(capturedParams).toEqual({
        simulatorUuid: 'test-uuid-123',
        bundleId: 'io.sentry.testapp',
        captureConsole: true,
        args: ['--debug'],
      });
    });

    it('should pass env vars through to log capture function', async () => {
      let capturedParams: unknown = null;
      const logCaptureStub: LogCaptureFunction = async (params) => {
        capturedParams = params;
        return {
          sessionId: 'test-session-789',
          logFilePath: '/tmp/xcodemcp_sim_log_test-session-789.log',
          processes: [],
          error: undefined,
        };
      };

      const mockExecutor = createMockExecutor({ success: true, output: '' });

      await launch_app_logs_simLogic(
        {
          simulatorId: 'test-uuid-123',
          bundleId: 'io.sentry.testapp',
          env: { STAGING_ENABLED: '1' },
        },
        mockExecutor,
        logCaptureStub,
      );

      expect(capturedParams).toEqual({
        simulatorUuid: 'test-uuid-123',
        bundleId: 'io.sentry.testapp',
        captureConsole: true,
        env: { STAGING_ENABLED: '1' },
      });
    });

    it('should not include env in capture params when env is undefined', async () => {
      let capturedParams: unknown = null;
      const logCaptureStub: LogCaptureFunction = async (params) => {
        capturedParams = params;
        return {
          sessionId: 'test-session-101',
          logFilePath: '/tmp/xcodemcp_sim_log_test-session-101.log',
          processes: [],
          error: undefined,
        };
      };

      const mockExecutor = createMockExecutor({ success: true, output: '' });

      await launch_app_logs_simLogic(
        {
          simulatorId: 'test-uuid-123',
          bundleId: 'io.sentry.testapp',
        },
        mockExecutor,
        logCaptureStub,
      );

      expect(capturedParams).toEqual({
        simulatorUuid: 'test-uuid-123',
        bundleId: 'io.sentry.testapp',
        captureConsole: true,
      });
    });

    it('should surface log capture failure', async () => {
      const logCaptureStub: LogCaptureFunction = async () => ({
        sessionId: '',
        logFilePath: '',
        processes: [],
        error: 'Failed to start log capture',
      });

      const mockExecutor = createMockExecutor({ success: true, output: '' });

      const result = await launch_app_logs_simLogic(
        {
          simulatorId: 'test-uuid-123',
          bundleId: 'io.sentry.testapp',
        },
        mockExecutor,
        logCaptureStub,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to launch app with log capture: Failed to start log capture',
          },
        ],
        isError: true,
      });
    });
  });
});
