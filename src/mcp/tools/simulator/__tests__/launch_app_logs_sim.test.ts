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
      const schemaObj = z.object(schema);

      expect(schemaObj.safeParse({}).success).toBe(true);
      expect(schemaObj.safeParse({ args: ['--debug'] }).success).toBe(true);
      expect(schemaObj.safeParse({ bundleId: 'com.example.app' }).success).toBe(true);
      expect(schemaObj.safeParse({ bundleId: 42 }).success).toBe(true);

      expect(Object.keys(schema).sort()).toEqual(['args']);

      const withSimId = schemaObj.safeParse({
        simulatorId: 'abc123',
      });
      expect(withSimId.success).toBe(true);
      expect('simulatorId' in (withSimId.data as Record<string, unknown>)).toBe(false);
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
          bundleId: 'com.example.testapp',
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
        bundleId: 'com.example.testapp',
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
          bundleId: 'com.example.testapp',
          args: ['--debug'],
        },
        mockExecutor,
        logCaptureStub,
      );

      expect(capturedParams).toEqual({
        simulatorUuid: 'test-uuid-123',
        bundleId: 'com.example.testapp',
        captureConsole: true,
        args: ['--debug'],
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
          bundleId: 'com.example.testapp',
        },
        mockExecutor,
        logCaptureStub,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'App was launched but log capture failed: Failed to start log capture',
          },
        ],
        isError: true,
      });
    });
  });
});
