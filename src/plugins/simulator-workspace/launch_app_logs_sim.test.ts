import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';
import launchAppLogsSim from './launch_app_logs_sim.ts';

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

vi.mock('../../utils/index.js', () => ({
  executeCommand: vi.fn(),
  log: vi.fn(),
  validateRequiredParam: vi.fn(),
  validateFileExists: vi.fn(),
  startLogCapture: vi.fn(),
  createTextResponse: vi.fn(),
  createErrorResponse: vi.fn(),
}));

describe('launch_app_logs_sim tool', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name field', () => {
      expect(launchAppLogsSim.name).toBe('launch_app_logs_sim');
    });

    it('should have correct description field', () => {
      expect(launchAppLogsSim.description).toBe(
        'Launches an app in an iOS simulator and captures its logs.',
      );
    });

    it('should have handler function', () => {
      expect(typeof launchAppLogsSim.handler).toBe('function');
    });

    it('should have correct schema validation', () => {
      const schema = z.object(launchAppLogsSim.schema);

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
    });
  });

  let mockValidateRequiredParam: MockedFunction<any>;
  let mockStartLogCapture: MockedFunction<any>;

  beforeEach(async () => {
    const { validateRequiredParam, startLogCapture } = await import('../../utils/index.js');
    mockValidateRequiredParam = validateRequiredParam as MockedFunction<any>;
    mockStartLogCapture = startLogCapture as MockedFunction<any>;

    mockValidateRequiredParam.mockReturnValue({
      isValid: true,
      errorResponse: null,
    });

    vi.clearAllMocks();
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should handle successful app launch with log capture', async () => {
      mockStartLogCapture.mockResolvedValue({
        sessionId: 'test-session-123',
        error: null,
      });

      const result = await launchAppLogsSim.handler({
        simulatorUuid: 'test-uuid-123',
        bundleId: 'com.example.testapp',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `App launched successfully in simulator test-uuid-123 with log capture enabled.\n\nLog capture session ID: test-session-123\n\nNext Steps:\n1. Interact with your app in the simulator.\n2. Use 'stop_and_get_simulator_log({ logSessionId: "test-session-123" })' to stop capture and retrieve logs.`,
          },
        ],
      });
    });

    it('should handle app launch with additional arguments', async () => {
      mockStartLogCapture.mockResolvedValue({
        sessionId: 'test-session-456',
        error: null,
      });

      const result = await launchAppLogsSim.handler({
        simulatorUuid: 'test-uuid-123',
        bundleId: 'com.example.testapp',
        args: ['--debug', '--verbose'],
      });

      expect(mockStartLogCapture).toHaveBeenCalledWith({
        simulatorUuid: 'test-uuid-123',
        bundleId: 'com.example.testapp',
        captureConsole: true,
      });
    });

    it('should handle log capture failure', async () => {
      mockStartLogCapture.mockResolvedValue({
        sessionId: null,
        error: 'Failed to start log capture',
      });

      const result = await launchAppLogsSim.handler({
        simulatorUuid: 'test-uuid-123',
        bundleId: 'com.example.testapp',
      });

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

    it('should handle validation failures for simulatorUuid', async () => {
      mockValidateRequiredParam.mockReturnValueOnce({
        isValid: false,
        errorResponse: {
          content: [{ type: 'text', text: 'simulatorUuid is required' }],
          isError: true,
        },
      });

      const result = await launchAppLogsSim.handler({
        simulatorUuid: '',
        bundleId: 'com.example.testapp',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'simulatorUuid is required' }],
        isError: true,
      });
    });

    it('should handle validation failures for bundleId', async () => {
      mockValidateRequiredParam
        .mockReturnValueOnce({
          isValid: true,
          errorResponse: null,
        })
        .mockReturnValueOnce({
          isValid: false,
          errorResponse: {
            content: [{ type: 'text', text: 'bundleId is required' }],
            isError: true,
          },
        });

      const result = await launchAppLogsSim.handler({
        simulatorUuid: 'test-uuid-123',
        bundleId: '',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'bundleId is required' }],
        isError: true,
      });
    });

    it('should pass correct parameters to startLogCapture', async () => {
      mockStartLogCapture.mockResolvedValue({
        sessionId: 'test-session-789',
        error: null,
      });

      await launchAppLogsSim.handler({
        simulatorUuid: 'uuid-456',
        bundleId: 'com.test.myapp',
      });

      expect(mockStartLogCapture).toHaveBeenCalledWith({
        simulatorUuid: 'uuid-456',
        bundleId: 'com.test.myapp',
        captureConsole: true,
      });
    });

    it('should include session ID and next steps in success message', async () => {
      mockStartLogCapture.mockResolvedValue({
        sessionId: 'session-abc-def',
        error: null,
      });

      const result = await launchAppLogsSim.handler({
        simulatorUuid: 'test-uuid-789',
        bundleId: 'com.example.testapp',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `App launched successfully in simulator test-uuid-789 with log capture enabled.\n\nLog capture session ID: session-abc-def\n\nNext Steps:\n1. Interact with your app in the simulator.\n2. Use 'stop_and_get_simulator_log({ logSessionId: "session-abc-def" })' to stop capture and retrieve logs.`,
          },
        ],
      });
    });
  });
});
