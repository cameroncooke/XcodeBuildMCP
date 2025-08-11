/**
 * Tests for launch_app_logs_sim plugin
 * Following CLAUDE.md testing standards with literal validation
 * Using dependency injection for deterministic testing
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import launchAppLogsSim, {
  launch_app_logs_simLogic,
  LogCaptureFunction,
} from '../launch_app_logs_sim.ts';
import { createMockExecutor } from '../../../../utils/command.js';

describe('launch_app_logs_sim tool', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(launchAppLogsSim.name).toBe('launch_app_logs_sim');
    });

    it('should have correct description', () => {
      expect(launchAppLogsSim.description).toBe(
        'Launches an app in an iOS simulator and captures its logs.',
      );
    });

    it('should have handler function', () => {
      expect(typeof launchAppLogsSim.handler).toBe('function');
    });

    it('should have correct schema with required fields', () => {
      const schema = z.object(launchAppLogsSim.schema);

      // Valid inputs
      expect(
        schema.safeParse({
          simulatorUuid: 'abc123',
          bundleId: 'com.example.app',
        }).success,
      ).toBe(true);

      expect(
        schema.safeParse({
          simulatorUuid: 'abc123',
          bundleId: 'com.example.app',
          args: ['--debug', '--verbose'],
        }).success,
      ).toBe(true);

      // Invalid inputs
      expect(
        schema.safeParse({
          simulatorUuid: 123,
          bundleId: 'com.example.app',
        }).success,
      ).toBe(false);

      expect(
        schema.safeParse({
          simulatorUuid: 'abc123',
          bundleId: 123,
        }).success,
      ).toBe(false);

      expect(
        schema.safeParse({
          bundleId: 'com.example.app',
        }).success,
      ).toBe(false);

      expect(
        schema.safeParse({
          simulatorUuid: 'abc123',
        }).success,
      ).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should handle successful app launch with log capture', async () => {
      // Create pure mock function without vitest mocking
      let capturedParams: any = null;
      const logCaptureStub: LogCaptureFunction = async (params: any, executor: any) => {
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
          simulatorUuid: 'test-uuid-123',
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

    it('should handle app launch with additional arguments', async () => {
      // Create pure mock function for this test case
      let capturedParams: any = null;
      const logCaptureStub: LogCaptureFunction = async (params: any, executor: any) => {
        capturedParams = params;
        return {
          sessionId: 'test-session-456',
          logFilePath: '/tmp/xcodemcp_sim_log_test-session-456.log',
          processes: [],
          error: undefined,
        };
      };

      const mockExecutor = createMockExecutor({ success: true, output: '' });

      const result = await launch_app_logs_simLogic(
        {
          simulatorUuid: 'test-uuid-123',
          bundleId: 'com.example.testapp',
          args: ['--debug', '--verbose'],
        },
        mockExecutor,
        logCaptureStub,
      );

      expect(capturedParams).toEqual({
        simulatorUuid: 'test-uuid-123',
        bundleId: 'com.example.testapp',
        captureConsole: true,
      });
    });

    it('should handle log capture failure', async () => {
      const logCaptureStub: LogCaptureFunction = async (params: any, executor: any) => {
        return {
          sessionId: '',
          logFilePath: '',
          processes: [],
          error: 'Failed to start log capture',
        };
      };

      const mockExecutor = createMockExecutor({ success: true, output: '' });

      const result = await launch_app_logs_simLogic(
        {
          simulatorUuid: 'test-uuid-123',
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

    it('should handle validation failure for simulatorUuid via handler', async () => {
      const result = await launchAppLogsSim.handler({
        simulatorUuid: undefined,
        bundleId: 'com.example.testapp',
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

    it('should handle validation failure for bundleId via handler', async () => {
      const result = await launchAppLogsSim.handler({
        simulatorUuid: 'test-uuid-123',
        bundleId: undefined,
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Parameter validation failed\nDetails: Invalid parameters:\nbundleId: Required',
          },
        ],
        isError: true,
      });
    });

    it('should pass correct parameters to startLogCapture', async () => {
      let capturedParams: any = null;
      const logCaptureStub: LogCaptureFunction = async (params: any, executor: any) => {
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
          simulatorUuid: 'uuid-456',
          bundleId: 'com.test.myapp',
        },
        mockExecutor,
        logCaptureStub,
      );

      expect(capturedParams).toEqual({
        simulatorUuid: 'uuid-456',
        bundleId: 'com.test.myapp',
        captureConsole: true,
      });
    });

    it('should include session ID and next steps in success message', async () => {
      const logCaptureStub: LogCaptureFunction = async (params: any, executor: any) => {
        return {
          sessionId: 'session-abc-def',
          logFilePath: '/tmp/xcodemcp_sim_log_session-abc-def.log',
          processes: [],
          error: undefined,
        };
      };

      const mockExecutor = createMockExecutor({ success: true, output: '' });

      const result = await launch_app_logs_simLogic(
        {
          simulatorUuid: 'test-uuid-789',
          bundleId: 'com.example.testapp',
        },
        mockExecutor,
        logCaptureStub,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `App launched successfully in simulator test-uuid-789 with log capture enabled.\n\nLog capture session ID: session-abc-def\n\nNext Steps:\n1. Interact with your app in the simulator.\n2. Use 'stop_and_get_simulator_log({ logSessionId: "session-abc-def" })' to stop capture and retrieve logs.`,
          },
        ],
        isError: false,
      });
    });
  });
});
