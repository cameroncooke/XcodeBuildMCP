/**
 * Tests for stop_device_log_cap plugin
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import plugin from '../stop_device_log_cap.ts';

// Mock logging utilities
vi.mock('../../utils/index.js', () => ({
  log: vi.fn(),
}));

// Mock file system
vi.mock('fs', () => ({
  promises: {
    access: vi.fn(),
    readFile: vi.fn(),
  },
  constants: {
    R_OK: 4,
  },
}));

describe('stop_device_log_cap plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      expect(plugin.schema).toHaveProperty('_def');
      expect(plugin.schema._def.shape()).toHaveProperty('logSessionId');
    });

    it('should have handler as a function', () => {
      expect(typeof plugin.handler).toBe('function');
    });
  });

  describe('Handler Functionality', () => {
    let mockFs, mockActiveDeviceLogSessions;

    beforeEach(async () => {
      // Get mocked modules
      const fsModule = await import('fs');

      mockFs = {
        promises: fsModule.promises,
        constants: fsModule.constants,
      };

      // Import and reset active sessions
      const startModule = await import('../start_device_log_cap.ts');
      mockActiveDeviceLogSessions = startModule.activeDeviceLogSessions;
      mockActiveDeviceLogSessions.clear();
    });

    it('should handle stop log capture when session not found', async () => {
      const result = await plugin.handler({
        logSessionId: 'device-log-00008110-001A2C3D4E5F-com.example.MyApp',
      });

      expect(result.content[0].text).toBe(
        'Failed to stop device log capture session device-log-00008110-001A2C3D4E5F-com.example.MyApp: Device log capture session not found: device-log-00008110-001A2C3D4E5F-com.example.MyApp',
      );
      expect(result.isError).toBe(true);
    });

    it('should handle successful log capture stop', async () => {
      const mockSessionId = 'test-session-123';
      const mockLogFilePath = '/tmp/xcodemcp_device_log_test-session-123.log';
      const mockLogContent = 'Device log content here...';

      // Mock active session
      const mockProcess = {
        killed: false,
        exitCode: null,
        kill: vi.fn(),
      };

      mockActiveDeviceLogSessions.set(mockSessionId, {
        process: mockProcess,
        logFilePath: mockLogFilePath,
        deviceUuid: '00008110-001A2C3D4E5F',
        bundleId: 'com.example.MyApp',
      });

      // Mock successful file access and read
      mockFs.promises.access.mockResolvedValue(undefined);
      mockFs.promises.readFile.mockResolvedValue(mockLogContent);

      const result = await plugin.handler({
        logSessionId: mockSessionId,
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `✅ Device log capture session stopped successfully\n\nSession ID: ${mockSessionId}\n\n--- Captured Logs ---\n${mockLogContent}`,
          },
        ],
      });
      expect(result.isError).toBeUndefined();
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
      expect(mockActiveDeviceLogSessions.has(mockSessionId)).toBe(false);
    });

    it('should handle already killed process', async () => {
      const mockSessionId = 'test-session-456';
      const mockLogFilePath = '/tmp/xcodemcp_device_log_test-session-456.log';
      const mockLogContent = 'Device log content...';

      // Mock active session with already killed process
      const mockProcess = {
        killed: true,
        exitCode: 0,
        kill: vi.fn(),
      };

      mockActiveDeviceLogSessions.set(mockSessionId, {
        process: mockProcess,
        logFilePath: mockLogFilePath,
        deviceUuid: '00008110-001A2C3D4E5F',
        bundleId: 'com.example.MyApp',
      });

      // Mock successful file access and read
      mockFs.promises.access.mockResolvedValue(undefined);
      mockFs.promises.readFile.mockResolvedValue(mockLogContent);

      const result = await plugin.handler({
        logSessionId: mockSessionId,
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `✅ Device log capture session stopped successfully\n\nSession ID: ${mockSessionId}\n\n--- Captured Logs ---\n${mockLogContent}`,
          },
        ],
      });
      expect(mockProcess.kill).not.toHaveBeenCalled(); // Should not kill already killed process
    });

    it('should handle file access failure', async () => {
      const mockSessionId = 'test-session-789';
      const mockLogFilePath = '/tmp/xcodemcp_device_log_test-session-789.log';

      // Mock active session
      const mockProcess = {
        killed: false,
        exitCode: null,
        kill: vi.fn(),
      };

      mockActiveDeviceLogSessions.set(mockSessionId, {
        process: mockProcess,
        logFilePath: mockLogFilePath,
        deviceUuid: '00008110-001A2C3D4E5F',
        bundleId: 'com.example.MyApp',
      });

      // Mock file access failure
      mockFs.promises.access.mockRejectedValue(new Error('File not found'));

      const result = await plugin.handler({
        logSessionId: mockSessionId,
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `Failed to stop device log capture session ${mockSessionId}: File not found`,
          },
        ],
        isError: true,
      });
      expect(mockActiveDeviceLogSessions.has(mockSessionId)).toBe(false); // Session still removed
    });

    it('should handle file read failure', async () => {
      const mockSessionId = 'test-session-abc';
      const mockLogFilePath = '/tmp/xcodemcp_device_log_test-session-abc.log';

      // Mock active session
      const mockProcess = {
        killed: false,
        exitCode: null,
        kill: vi.fn(),
      };

      mockActiveDeviceLogSessions.set(mockSessionId, {
        process: mockProcess,
        logFilePath: mockLogFilePath,
        deviceUuid: '00008110-001A2C3D4E5F',
        bundleId: 'com.example.MyApp',
      });

      // Mock successful access but failed read
      mockFs.promises.access.mockResolvedValue(undefined);
      mockFs.promises.readFile.mockRejectedValue(new Error('Read permission denied'));

      const result = await plugin.handler({
        logSessionId: mockSessionId,
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `Failed to stop device log capture session ${mockSessionId}: Read permission denied`,
          },
        ],
        isError: true,
      });
    });

    it('should handle string error objects', async () => {
      const mockSessionId = 'test-session-def';
      const mockLogFilePath = '/tmp/xcodemcp_device_log_test-session-def.log';

      // Mock active session
      const mockProcess = {
        killed: false,
        exitCode: null,
        kill: vi.fn(),
      };

      mockActiveDeviceLogSessions.set(mockSessionId, {
        process: mockProcess,
        logFilePath: mockLogFilePath,
        deviceUuid: '00008110-001A2C3D4E5F',
        bundleId: 'com.example.MyApp',
      });

      // Mock file access failure with string error
      mockFs.promises.access.mockRejectedValue('String error message');

      const result = await plugin.handler({
        logSessionId: mockSessionId,
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `Failed to stop device log capture session ${mockSessionId}: String error message`,
          },
        ],
        isError: true,
      });
    });
  });
});
