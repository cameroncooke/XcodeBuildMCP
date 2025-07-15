/**
 * stop_sim_log_cap Plugin Tests - Test coverage for stop_sim_log_cap plugin
 *
 * This test file provides complete coverage for the stop_sim_log_cap plugin:
 * - Plugin structure validation
 * - Handler functionality (stop log capture session and retrieve captured logs)
 * - Error handling for validation and log capture failures
 *
 * Tests follow the canonical testing patterns from CLAUDE.md with deterministic
 * response validation and comprehensive parameter testing.
 * Converted to pure dependency injection without vitest mocking.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import stopSimLogCap from '../stop_sim_log_cap.ts';

// Mock state tracking
let stopLogCaptureCalls: Array<{
  logSessionId: string;
}> = [];
let mockStopLogCaptureError: string | null = null;
let mockStopLogCaptureLogContent: string = '';

// Mock stopLogCapture function
const mockStopLogCapture = async (logSessionId: string) => {
  stopLogCaptureCalls.push({ logSessionId });

  if (mockStopLogCaptureError) {
    return { logContent: '', error: mockStopLogCaptureError };
  }

  return { logContent: mockStopLogCaptureLogContent };
};

describe('stop_sim_log_cap plugin', () => {
  beforeEach(() => {
    // Reset state
    stopLogCaptureCalls = [];
    mockStopLogCaptureError = null;
    mockStopLogCaptureLogContent = '';
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct plugin structure', () => {
      expect(stopSimLogCap).toHaveProperty('name');
      expect(stopSimLogCap).toHaveProperty('description');
      expect(stopSimLogCap).toHaveProperty('schema');
      expect(stopSimLogCap).toHaveProperty('handler');

      expect(stopSimLogCap.name).toBe('stop_sim_log_cap');
      expect(stopSimLogCap.description).toBe(
        'Stops an active simulator log capture session and returns the captured logs.',
      );
      expect(typeof stopSimLogCap.handler).toBe('function');
      expect(typeof stopSimLogCap.schema).toBe('object');
    });

    it('should have correct schema structure', () => {
      expect(stopSimLogCap.schema).toHaveProperty('logSessionId');
      expect(stopSimLogCap.schema.logSessionId).toHaveProperty('_def');
    });

    it('should validate schema with valid parameters', () => {
      expect(stopSimLogCap.schema.logSessionId.safeParse('test-session-id').success).toBe(true);
    });

    it('should reject invalid schema parameters', () => {
      expect(stopSimLogCap.schema.logSessionId.safeParse(null).success).toBe(false);
      expect(stopSimLogCap.schema.logSessionId.safeParse(undefined).success).toBe(false);
      expect(stopSimLogCap.schema.logSessionId.safeParse(123).success).toBe(false);
      expect(stopSimLogCap.schema.logSessionId.safeParse(true).success).toBe(false);
    });
  });

  describe('Input Validation', () => {
    it('should return error when logSessionId validation fails', async () => {
      const result = await stopSimLogCap.handler(
        {
          logSessionId: null,
        },
        mockStopLogCapture,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'logSessionId' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should return error when logSessionId is undefined', async () => {
      const result = await stopSimLogCap.handler(
        {
          logSessionId: undefined,
        },
        mockStopLogCapture,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'logSessionId' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should handle empty string logSessionId', async () => {
      mockStopLogCaptureLogContent = 'Log content for empty session';

      const result = await stopSimLogCap.handler(
        {
          logSessionId: '',
        },
        mockStopLogCapture,
      );

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe(
        'Log capture session  stopped successfully. Log content follows:\n\nLog content for empty session',
      );
    });
  });

  describe('Function Call Generation', () => {
    it('should call stopLogCapture with correct parameters', async () => {
      mockStopLogCaptureLogContent = 'Mock log content from file';

      await stopSimLogCap.handler(
        {
          logSessionId: 'test-session-id',
        },
        mockStopLogCapture,
      );

      expect(stopLogCaptureCalls).toHaveLength(1);
      expect(stopLogCaptureCalls[0]).toEqual({
        logSessionId: 'test-session-id',
      });
    });

    it('should call stopLogCapture with different session ID', async () => {
      mockStopLogCaptureLogContent = 'Different log content';

      await stopSimLogCap.handler(
        {
          logSessionId: 'different-session-id',
        },
        mockStopLogCapture,
      );

      expect(stopLogCaptureCalls).toHaveLength(1);
      expect(stopLogCaptureCalls[0]).toEqual({
        logSessionId: 'different-session-id',
      });
    });
  });

  describe('Response Processing', () => {
    it('should handle successful log capture stop', async () => {
      mockStopLogCaptureLogContent = 'Mock log content from file';

      const result = await stopSimLogCap.handler(
        {
          logSessionId: 'test-session-id',
        },
        mockStopLogCapture,
      );

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe(
        'Log capture session test-session-id stopped successfully. Log content follows:\n\nMock log content from file',
      );
    });

    it('should handle empty log content', async () => {
      mockStopLogCaptureLogContent = '';

      const result = await stopSimLogCap.handler(
        {
          logSessionId: 'test-session-id',
        },
        mockStopLogCapture,
      );

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe(
        'Log capture session test-session-id stopped successfully. Log content follows:\n\n',
      );
    });

    it('should handle multiline log content', async () => {
      mockStopLogCaptureLogContent = 'Line 1\nLine 2\nLine 3';

      const result = await stopSimLogCap.handler(
        {
          logSessionId: 'test-session-id',
        },
        mockStopLogCapture,
      );

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe(
        'Log capture session test-session-id stopped successfully. Log content follows:\n\nLine 1\nLine 2\nLine 3',
      );
    });

    it('should handle log capture stop errors for non-existent session', async () => {
      mockStopLogCaptureError = 'Log capture session not found: non-existent-session';

      const result = await stopSimLogCap.handler(
        {
          logSessionId: 'non-existent-session',
        },
        mockStopLogCapture,
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe(
        'Error stopping log capture session non-existent-session: Log capture session not found: non-existent-session',
      );
    });

    it('should handle file read errors', async () => {
      mockStopLogCaptureError = 'File not found';

      const result = await stopSimLogCap.handler(
        {
          logSessionId: 'test-session-id',
        },
        mockStopLogCapture,
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe(
        'Error stopping log capture session test-session-id: File not found',
      );
    });

    it('should handle permission errors', async () => {
      mockStopLogCaptureError = 'Permission denied';

      const result = await stopSimLogCap.handler(
        {
          logSessionId: 'test-session-id',
        },
        mockStopLogCapture,
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe(
        'Error stopping log capture session test-session-id: Permission denied',
      );
    });

    it('should handle various error types', async () => {
      mockStopLogCaptureError = 'Some generic error';

      const result = await stopSimLogCap.handler(
        {
          logSessionId: 'test-session-id',
        },
        mockStopLogCapture,
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe(
        'Error stopping log capture session test-session-id: Some generic error',
      );
    });
  });
});
