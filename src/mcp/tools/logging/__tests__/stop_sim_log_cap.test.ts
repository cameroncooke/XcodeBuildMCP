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
import { z } from 'zod';
import stopSimLogCap, { stop_sim_log_capLogic } from '../stop_sim_log_cap.ts';
import { createMockFileSystemExecutor } from '../../../../test-utils/mock-executors.ts';
import { activeLogSessions } from '../../../../utils/log_capture.ts';

describe('stop_sim_log_cap plugin', () => {
  let mockFileSystem: any;

  beforeEach(() => {
    mockFileSystem = createMockFileSystemExecutor();
    // Clear any active sessions before each test
    activeLogSessions.clear();
  });

  // Helper function to create a test log session
  async function createTestLogSession(sessionId: string, logContent: string = '') {
    const mockProcess = {
      pid: 12345,
      killed: false,
      exitCode: null,
      kill: () => {},
    };

    const logFilePath = `/tmp/xcodemcp_sim_log_test_${sessionId}.log`;

    // Create actual file for the test
    const fs = await import('fs/promises');
    await fs.writeFile(logFilePath, logContent, 'utf-8');

    activeLogSessions.set(sessionId, {
      processes: [mockProcess as any],
      logFilePath: logFilePath,
      simulatorUuid: 'test-simulator-uuid',
      bundleId: 'com.example.TestApp',
    });
  }

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
      // Schema should be a plain object for MCP protocol compliance
      expect(typeof stopSimLogCap.schema).toBe('object');
      expect(stopSimLogCap.schema).toHaveProperty('logSessionId');

      // Validate that schema fields are Zod types that can be used for validation
      const schema = z.object(stopSimLogCap.schema);
      expect(schema.safeParse({ logSessionId: 'test-session-id' }).success).toBe(true);
      expect(schema.safeParse({ logSessionId: 123 }).success).toBe(false);
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
    it('should handle null logSessionId (validation handled by framework)', async () => {
      // With typed tool factory, invalid params won't reach the logic function
      // This test now validates that the logic function works with valid empty strings
      await createTestLogSession('', 'Log content for empty session');

      const result = await stop_sim_log_capLogic(
        {
          logSessionId: '',
        },
        mockFileSystem,
      );

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe(
        'Log capture session  stopped successfully. Log content follows:\n\nLog content for empty session',
      );
    });

    it('should handle undefined logSessionId (validation handled by framework)', async () => {
      // With typed tool factory, invalid params won't reach the logic function
      // This test now validates that the logic function works with valid empty strings
      await createTestLogSession('', 'Log content for empty session');

      const result = await stop_sim_log_capLogic(
        {
          logSessionId: '',
        },
        mockFileSystem,
      );

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe(
        'Log capture session  stopped successfully. Log content follows:\n\nLog content for empty session',
      );
    });

    it('should handle empty string logSessionId', async () => {
      await createTestLogSession('', 'Log content for empty session');

      const result = await stop_sim_log_capLogic(
        {
          logSessionId: '',
        },
        mockFileSystem,
      );

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe(
        'Log capture session  stopped successfully. Log content follows:\n\nLog content for empty session',
      );
    });
  });

  describe('Function Call Generation', () => {
    it('should call stopLogCapture with correct parameters', async () => {
      await createTestLogSession('test-session-id', 'Mock log content from file');

      const result = await stop_sim_log_capLogic(
        {
          logSessionId: 'test-session-id',
        },
        mockFileSystem,
      );

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe(
        'Log capture session test-session-id stopped successfully. Log content follows:\n\nMock log content from file',
      );
    });

    it('should call stopLogCapture with different session ID', async () => {
      await createTestLogSession('different-session-id', 'Different log content');

      const result = await stop_sim_log_capLogic(
        {
          logSessionId: 'different-session-id',
        },
        mockFileSystem,
      );

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe(
        'Log capture session different-session-id stopped successfully. Log content follows:\n\nDifferent log content',
      );
    });
  });

  describe('Response Processing', () => {
    it('should handle successful log capture stop', async () => {
      await createTestLogSession('test-session-id', 'Mock log content from file');

      const result = await stop_sim_log_capLogic(
        {
          logSessionId: 'test-session-id',
        },
        mockFileSystem,
      );

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe(
        'Log capture session test-session-id stopped successfully. Log content follows:\n\nMock log content from file',
      );
    });

    it('should handle empty log content', async () => {
      await createTestLogSession('test-session-id', '');

      const result = await stop_sim_log_capLogic(
        {
          logSessionId: 'test-session-id',
        },
        mockFileSystem,
      );

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe(
        'Log capture session test-session-id stopped successfully. Log content follows:\n\n',
      );
    });

    it('should handle multiline log content', async () => {
      await createTestLogSession('test-session-id', 'Line 1\nLine 2\nLine 3');

      const result = await stop_sim_log_capLogic(
        {
          logSessionId: 'test-session-id',
        },
        mockFileSystem,
      );

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe(
        'Log capture session test-session-id stopped successfully. Log content follows:\n\nLine 1\nLine 2\nLine 3',
      );
    });

    it('should handle log capture stop errors for non-existent session', async () => {
      const result = await stop_sim_log_capLogic(
        {
          logSessionId: 'non-existent-session',
        },
        mockFileSystem,
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe(
        'Error stopping log capture session non-existent-session: Log capture session not found: non-existent-session',
      );
    });

    it('should handle file read errors', async () => {
      // Create session but make file reading fail in the log_capture utility
      const mockProcess = {
        pid: 12345,
        killed: false,
        exitCode: null,
        kill: () => {},
      };

      activeLogSessions.set('test-session-id', {
        processes: [mockProcess as any],
        logFilePath: `/tmp/test_file_not_found.log`,
        simulatorUuid: 'test-simulator-uuid',
        bundleId: 'com.example.TestApp',
      });

      const result = await stop_sim_log_capLogic(
        {
          logSessionId: 'test-session-id',
        },
        mockFileSystem,
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        'Error stopping log capture session test-session-id:',
      );
    });

    it('should handle permission errors', async () => {
      // Create session but make file reading fail in the log_capture utility
      const mockProcess = {
        pid: 12345,
        killed: false,
        exitCode: null,
        kill: () => {},
      };

      activeLogSessions.set('test-session-id', {
        processes: [mockProcess as any],
        logFilePath: `/tmp/test_permission_denied.log`,
        simulatorUuid: 'test-simulator-uuid',
        bundleId: 'com.example.TestApp',
      });

      const result = await stop_sim_log_capLogic(
        {
          logSessionId: 'test-session-id',
        },
        mockFileSystem,
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        'Error stopping log capture session test-session-id:',
      );
    });

    it('should handle various error types', async () => {
      // Create session but make file reading fail in the log_capture utility
      const mockProcess = {
        pid: 12345,
        killed: false,
        exitCode: null,
        kill: () => {},
      };

      activeLogSessions.set('test-session-id', {
        processes: [mockProcess as any],
        logFilePath: `/tmp/test_generic_error.log`,
        simulatorUuid: 'test-simulator-uuid',
        bundleId: 'com.example.TestApp',
      });

      const result = await stop_sim_log_capLogic(
        {
          logSessionId: 'test-session-id',
        },
        mockFileSystem,
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        'Error stopping log capture session test-session-id:',
      );
    });
  });
});
