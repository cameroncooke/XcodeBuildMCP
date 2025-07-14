/**
 * Tests for launch_app_logs_sim plugin (re-export from simulator-shared)
 * Following CLAUDE.md testing standards with literal validation
 * Using dependency injection for deterministic testing
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import launchAppLogsSim from './launch_app_logs_sim.ts';

describe('launch_app_logs_sim tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
      const logCaptureStub = async (params: any) => {
        capturedParams = params;
        return {
          sessionId: 'test-session-123',
          logFilePath: '/tmp/xcodemcp_sim_log_test-session-123.log',
          processes: [],
          error: undefined,
        };
      };

      const result = await launchAppLogsSim.handler(
        {
          simulatorUuid: 'test-uuid-123',
          bundleId: 'com.example.testapp',
        },
        logCaptureStub,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `App launched successfully in simulator test-uuid-123 with log capture enabled.\n\nLog capture session ID: test-session-123\n\nNext Steps:\n1. Interact with your app in the simulator.\n2. Use 'stop_and_get_simulator_log({ logSessionId: "test-session-123" })' to stop capture and retrieve logs.`,
          },
        ],
      });

      expect(capturedParams).toEqual({
        simulatorUuid: 'test-uuid-123',
        bundleId: 'com.example.testapp',
        captureConsole: true,
      });
    });

    it('should handle log capture failure', async () => {
      const logCaptureStub = async () => {
        return {
          sessionId: '',
          logFilePath: '',
          processes: [],
          error: 'Failed to start log capture',
        };
      };

      const result = await launchAppLogsSim.handler(
        {
          simulatorUuid: 'test-uuid-123',
          bundleId: 'com.example.testapp',
        },
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

    it('should handle validation failures for missing parameters', async () => {
      const resultMissingSimulator = await launchAppLogsSim.handler({
        simulatorUuid: undefined,
        bundleId: 'com.example.testapp',
      });

      expect(resultMissingSimulator).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'simulatorUuid' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });

      const resultMissingBundle = await launchAppLogsSim.handler({
        simulatorUuid: 'test-uuid-123',
        bundleId: undefined,
      });

      expect(resultMissingBundle).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'bundleId' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });
  });
});
