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
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import stopSimLogCap from '../stop_sim_log_cap.ts';

// Mock file system
vi.mock('fs', () => ({
  promises: {
    access: vi.fn(),
    readFile: vi.fn(),
    readdir: vi.fn(() => []),
    stat: vi.fn(),
    unlink: vi.fn(),
  },
  constants: {
    R_OK: 4,
  },
}));

// Mock os
vi.mock('os', () => ({
  tmpdir: vi.fn(() => '/tmp'),
}));

// Mock logger
vi.mock('../../utils/logger.js', () => ({
  log: vi.fn(),
}));

describe('stop_sim_log_cap plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('plugin structure', () => {
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

  describe('handler functionality', () => {
    it('should return error when logSessionId validation fails', async () => {
      const result = await stopSimLogCap.handler({
        logSessionId: null,
      });

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

    it('should handle successful log capture stop', async () => {
      // Mock an active log session by importing and setting it up
      const logCapture = await import('../../../utils/log_capture.js');
      const mockProcess = {
        kill: vi.fn(() => true),
        killed: false,
        exitCode: null,
      };

      // Add a mock session to the active sessions
      logCapture.activeLogSessions.set('test-session-id', {
        processes: [mockProcess],
        logFilePath: '/tmp/test-log.log',
        simulatorUuid: 'test-uuid',
        bundleId: 'com.test.app',
      });

      const mockFs = await import('fs');
      vi.mocked(mockFs.promises.readFile).mockResolvedValueOnce('Mock log content from file');

      const result = await stopSimLogCap.handler({
        logSessionId: 'test-session-id',
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe(
        'Log capture session test-session-id stopped successfully. Log content follows:\n\nMock log content from file',
      );
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
    });

    it('should handle log capture stop errors for non-existent session', async () => {
      const result = await stopSimLogCap.handler({
        logSessionId: 'non-existent-session',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe(
        'Error stopping log capture session non-existent-session: Log capture session not found: non-existent-session',
      );
    });

    it('should handle file read errors', async () => {
      // Mock an active log session
      const logCapture = await import('../../../utils/log_capture.js');
      const mockProcess = {
        kill: vi.fn(() => true),
        killed: false,
        exitCode: null,
      };

      logCapture.activeLogSessions.set('test-session-id', {
        processes: [mockProcess],
        logFilePath: '/tmp/test-log.log',
        simulatorUuid: 'test-uuid',
        bundleId: 'com.test.app',
      });

      // Mock file read error
      const mockFs = await import('fs');
      vi.mocked(mockFs.promises.access).mockRejectedValueOnce(new Error('File not found'));

      const result = await stopSimLogCap.handler({
        logSessionId: 'test-session-id',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe(
        'Error stopping log capture session test-session-id: File not found',
      );
    });

    it('should handle already killed processes', async () => {
      // Mock an active log session with killed process
      const logCapture = await import('../../../utils/log_capture.js');
      const mockProcess = {
        kill: vi.fn(() => true),
        killed: true,
        exitCode: 0,
      };

      logCapture.activeLogSessions.set('test-session-id', {
        processes: [mockProcess],
        logFilePath: '/tmp/test-log.log',
        simulatorUuid: 'test-uuid',
        bundleId: 'com.test.app',
      });

      const mockFs = await import('fs');
      vi.mocked(mockFs.promises.readFile).mockResolvedValueOnce('Mock log content');

      const result = await stopSimLogCap.handler({
        logSessionId: 'test-session-id',
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe(
        'Log capture session test-session-id stopped successfully. Log content follows:\n\nMock log content',
      );
      // Should not call kill on already killed process
      expect(mockProcess.kill).not.toHaveBeenCalled();
    });
  });
});
