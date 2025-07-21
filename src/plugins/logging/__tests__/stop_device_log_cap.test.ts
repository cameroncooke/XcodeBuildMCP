/**
 * Tests for stop_device_log_cap plugin
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import plugin, { stop_device_log_capLogic } from '../stop_device_log_cap.ts';
import { activeDeviceLogSessions } from '../start_device_log_cap.ts';
import { createMockFileSystemExecutor } from '../../../utils/command.js';

// Note: Logger is allowed to execute normally (integration testing pattern)

describe('stop_device_log_cap plugin', () => {
  beforeEach(() => {
    // Clear actual active sessions before each test
    activeDeviceLogSessions.clear();
  });

  describe('Plugin Structure', () => {
    it('should export an object with required properties', () => {
      expect(plugin).toHaveProperty('name');
      expect(plugin).toHaveProperty('description');
      expect(plugin).toHaveProperty('schema');
      expect(plugin).toHaveProperty('handler');
    });

    it('should have correct tool name', () => {
      expect(plugin.name).toBe('stop_device_log_cap');
    });

    it('should have correct description', () => {
      expect(plugin.description).toBe(
        'Stops an active Apple device log capture session and returns the captured logs.',
      );
    });

    it('should have correct schema structure', () => {
      // Schema should be a plain object for MCP protocol compliance
      expect(typeof plugin.schema).toBe('object');
      expect(plugin.schema).toHaveProperty('logSessionId');

      // Validate that schema fields are Zod types that can be used for validation
      const schema = z.object(plugin.schema);
      expect(schema.safeParse({ logSessionId: 'test-session-id' }).success).toBe(true);
      expect(schema.safeParse({ logSessionId: 123 }).success).toBe(false);
    });

    it('should have handler as a function', () => {
      expect(typeof plugin.handler).toBe('function');
    });
  });

  describe('Handler Functionality', () => {
    // Helper function to create a test process
    function createTestProcess(
      options: {
        killed?: boolean;
        exitCode?: number | null;
      } = {},
    ) {
      const testProcess = {
        killed: options.killed || false,
        exitCode: options.exitCode !== undefined ? options.exitCode : null,
        killCalls: [] as string[],
        kill: function (signal?: string) {
          this.killCalls.push(signal || 'SIGTERM');
          this.killed = true;
        },
      };

      return testProcess;
    }

    it('should handle stop log capture when session not found', async () => {
      const mockFileSystem = createMockFileSystemExecutor();

      const result = await stop_device_log_capLogic(
        {
          logSessionId: 'device-log-00008110-001A2C3D4E5F-com.example.MyApp',
        },
        mockFileSystem,
      );

      expect(result.content[0].text).toBe(
        'Failed to stop device log capture session device-log-00008110-001A2C3D4E5F-com.example.MyApp: Device log capture session not found: device-log-00008110-001A2C3D4E5F-com.example.MyApp',
      );
      expect(result.isError).toBe(true);
    });

    it('should handle successful log capture stop', async () => {
      const testSessionId = 'test-session-123';
      const testLogFilePath = '/tmp/xcodemcp_device_log_test-session-123.log';
      const testLogContent = 'Device log content here...';

      // Test active session
      const testProcess = createTestProcess({
        killed: false,
        exitCode: null,
      });

      activeDeviceLogSessions.set(testSessionId, {
        process: testProcess,
        logFilePath: testLogFilePath,
        deviceUuid: '00008110-001A2C3D4E5F',
        bundleId: 'com.example.MyApp',
      });

      // Configure test file system for successful operation
      const mockFileSystem = createMockFileSystemExecutor({
        existsSync: () => true,
        readFile: async () => testLogContent,
      });

      const result = await stop_device_log_capLogic(
        {
          logSessionId: testSessionId,
        },
        mockFileSystem,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `✅ Device log capture session stopped successfully\n\nSession ID: ${testSessionId}\n\n--- Captured Logs ---\n${testLogContent}`,
          },
        ],
      });
      expect(result.isError).toBeUndefined();
      expect(testProcess.killCalls).toEqual(['SIGTERM']);
      expect(activeDeviceLogSessions.has(testSessionId)).toBe(false);
    });

    it('should handle already killed process', async () => {
      const testSessionId = 'test-session-456';
      const testLogFilePath = '/tmp/xcodemcp_device_log_test-session-456.log';
      const testLogContent = 'Device log content...';

      // Test active session with already killed process
      const testProcess = createTestProcess({
        killed: true,
        exitCode: 0,
      });

      activeDeviceLogSessions.set(testSessionId, {
        process: testProcess,
        logFilePath: testLogFilePath,
        deviceUuid: '00008110-001A2C3D4E5F',
        bundleId: 'com.example.MyApp',
      });

      // Configure test file system for successful operation
      const mockFileSystem = createMockFileSystemExecutor({
        existsSync: () => true,
        readFile: async () => testLogContent,
      });

      const result = await stop_device_log_capLogic(
        {
          logSessionId: testSessionId,
        },
        mockFileSystem,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `✅ Device log capture session stopped successfully\n\nSession ID: ${testSessionId}\n\n--- Captured Logs ---\n${testLogContent}`,
          },
        ],
      });
      expect(testProcess.killCalls).toEqual([]); // Should not kill already killed process
    });

    it('should handle file access failure', async () => {
      const testSessionId = 'test-session-789';
      const testLogFilePath = '/tmp/xcodemcp_device_log_test-session-789.log';

      // Test active session
      const testProcess = createTestProcess({
        killed: false,
        exitCode: null,
      });

      activeDeviceLogSessions.set(testSessionId, {
        process: testProcess,
        logFilePath: testLogFilePath,
        deviceUuid: '00008110-001A2C3D4E5F',
        bundleId: 'com.example.MyApp',
      });

      // Configure test file system for access failure (file doesn't exist)
      const mockFileSystem = createMockFileSystemExecutor({
        existsSync: () => false,
      });

      const result = await stop_device_log_capLogic(
        {
          logSessionId: testSessionId,
        },
        mockFileSystem,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `Failed to stop device log capture session ${testSessionId}: Log file not found: ${testLogFilePath}`,
          },
        ],
        isError: true,
      });
      expect(activeDeviceLogSessions.has(testSessionId)).toBe(false); // Session still removed
    });

    it('should handle file read failure', async () => {
      const testSessionId = 'test-session-abc';
      const testLogFilePath = '/tmp/xcodemcp_device_log_test-session-abc.log';

      // Test active session
      const testProcess = createTestProcess({
        killed: false,
        exitCode: null,
      });

      activeDeviceLogSessions.set(testSessionId, {
        process: testProcess,
        logFilePath: testLogFilePath,
        deviceUuid: '00008110-001A2C3D4E5F',
        bundleId: 'com.example.MyApp',
      });

      // Configure test file system for successful access but failed read
      const mockFileSystem = createMockFileSystemExecutor({
        existsSync: () => true,
        readFile: async () => {
          throw new Error('Read permission denied');
        },
      });

      const result = await stop_device_log_capLogic(
        {
          logSessionId: testSessionId,
        },
        mockFileSystem,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `Failed to stop device log capture session ${testSessionId}: Read permission denied`,
          },
        ],
        isError: true,
      });
    });

    it('should handle string error objects', async () => {
      const testSessionId = 'test-session-def';
      const testLogFilePath = '/tmp/xcodemcp_device_log_test-session-def.log';

      // Test active session
      const testProcess = createTestProcess({
        killed: false,
        exitCode: null,
      });

      activeDeviceLogSessions.set(testSessionId, {
        process: testProcess,
        logFilePath: testLogFilePath,
        deviceUuid: '00008110-001A2C3D4E5F',
        bundleId: 'com.example.MyApp',
      });

      // Configure test file system for access failure with string error
      const mockFileSystem = createMockFileSystemExecutor({
        existsSync: () => true,
        readFile: async () => {
          throw 'String error message';
        },
      });

      const result = await stop_device_log_capLogic(
        {
          logSessionId: testSessionId,
        },
        mockFileSystem,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `Failed to stop device log capture session ${testSessionId}: String error message`,
          },
        ],
        isError: true,
      });
    });
  });
});
