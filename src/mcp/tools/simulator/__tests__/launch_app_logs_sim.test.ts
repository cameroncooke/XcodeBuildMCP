/**
 * Tests for launch_app_logs_sim plugin (session-aware version)
 * Follows CLAUDE.md guidance with literal validation and DI.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as z from 'zod';
import launchAppLogsSim, {
  launch_app_logs_simLogic,
  LogCaptureFunction,
} from '../launch_app_logs_sim.ts';
import { createMockExecutor } from '../../../../test-utils/mock-executors.ts';
import { sessionStore } from '../../../../utils/session-store.ts';

describe('launch_app_logs_sim tool', () => {
  beforeEach(() => {
    sessionStore.clear();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should expose correct metadata', () => {
      expect(launchAppLogsSim.name).toBe('launch_app_logs_sim');
      expect(launchAppLogsSim.description).toBe(
        'Launches an app in an iOS simulator and captures its logs.',
      );
    });

    it('should expose only non-session fields in public schema', () => {
      const schema = z.object(launchAppLogsSim.schema);

      expect(schema.safeParse({ bundleId: 'com.example.app' }).success).toBe(true);
      expect(schema.safeParse({ bundleId: 'com.example.app', args: ['--debug'] }).success).toBe(
        true,
      );
      expect(schema.safeParse({}).success).toBe(false);
      expect(schema.safeParse({ bundleId: 42 }).success).toBe(false);

      expect(Object.keys(launchAppLogsSim.schema).sort()).toEqual(['args', 'bundleId'].sort());

      const withSimId = schema.safeParse({
        simulatorId: 'abc123',
        bundleId: 'com.example.app',
      });
      expect(withSimId.success).toBe(true);
      expect('simulatorId' in (withSimId.data as Record<string, unknown>)).toBe(false);
    });
  });

  describe('Handler Requirements', () => {
    it('should require simulatorId when not provided', async () => {
      const result = await launchAppLogsSim.handler({ bundleId: 'com.example.testapp' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Missing required session defaults');
      expect(result.content[0].text).toContain('simulatorId is required');
      expect(result.content[0].text).toContain('session-set-defaults');
    });

    it('should validate bundleId when simulatorId default exists', async () => {
      sessionStore.setDefaults({ simulatorId: 'SIM-UUID' });

      const result = await launchAppLogsSim.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Parameter validation failed');
      expect(result.content[0].text).toContain(
        'bundleId: Invalid input: expected string, received undefined',
      );
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
            text: `App launched successfully in simulator test-uuid-123 with log capture enabled.\n\nLog capture session ID: test-session-123\n\nNext Steps:\n1. Interact with your app in the simulator.\n2. Use 'stop_and_get_simulator_log({ logSessionId: "test-session-123" })' to stop capture and retrieve logs.`,
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
