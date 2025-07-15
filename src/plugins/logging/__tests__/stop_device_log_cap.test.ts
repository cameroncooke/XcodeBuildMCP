/**
 * Tests for stop_device_log_cap plugin
 */
import { describe, it, expect, beforeEach } from 'vitest';
import plugin from '../stop_device_log_cap.ts';
import { activeDeviceLogSessions } from '../start_device_log_cap.ts';

// Note: Logger is allowed to execute normally (integration testing pattern)

// Mock file system interface
interface MockFileSystem {
  promises: {
    access: (path: string, mode: number) => Promise<void>;
    readFile: (path: string, encoding: string) => Promise<string>;
  };
  constants: {
    R_OK: number;
  };
}

// Create mock file system executor
function createMockFileSystemExecutor(): MockFileSystem {
  let accessCalls: any[] = [];
  let accessShouldThrow = false;
  let accessError: any = null;

  let readFileCalls: any[] = [];
  let readFileShouldThrow = false;
  let readFileError: any = null;
  let readFileContent = '';

  const mockFs: MockFileSystem = {
    promises: {
      access: function (path: string, mode: number) {
        // Track calls manually
        accessCalls.push({ path, mode });

        if (accessShouldThrow) {
          return Promise.reject(accessError);
        }
        return Promise.resolve();
      },
      readFile: function (path: string, encoding: string) {
        // Track calls manually
        readFileCalls.push({ path, encoding });

        if (readFileShouldThrow) {
          return Promise.reject(readFileError);
        }
        return Promise.resolve(readFileContent || '');
      },
    },
    constants: {
      R_OK: 4,
    },
  };

  // Add configuration methods
  (mockFs.promises.access as any).configure = function (shouldThrow: boolean, error: any) {
    accessShouldThrow = shouldThrow;
    accessError = error;
  };

  (mockFs.promises.readFile as any).configure = function (
    shouldThrow: boolean,
    error: any,
    content: string,
  ) {
    readFileShouldThrow = shouldThrow;
    readFileError = error;
    readFileContent = content;
  };

  (mockFs.promises.access as any).getCalls = () => accessCalls;
  (mockFs.promises.readFile as any).getCalls = () => readFileCalls;

  return mockFs;
}

describe('stop_device_log_cap plugin', () => {
  let mockFileSystem: MockFileSystem;

  beforeEach(() => {
    mockFileSystem = createMockFileSystemExecutor();

    // Reset mock state
    (mockFileSystem.promises.access as any).configure(false, null);
    (mockFileSystem.promises.readFile as any).configure(false, null, '');

    // Clear actual active sessions
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
      expect(plugin.schema).toHaveProperty('_def');
      expect(plugin.schema._def.shape()).toHaveProperty('logSessionId');
    });

    it('should have handler as a function', () => {
      expect(typeof plugin.handler).toBe('function');
    });
  });

  describe('Handler Functionality', () => {
    // Helper function to create a mock process
    function createMockProcess(
      options: {
        killed?: boolean;
        exitCode?: number | null;
      } = {},
    ) {
      const mockProcess = {
        killed: options.killed || false,
        exitCode: options.exitCode !== undefined ? options.exitCode : null,
        killCalls: [] as string[],
        kill: function (signal?: string) {
          this.killCalls.push(signal || 'SIGTERM');
          this.killed = true;
        },
      };

      return mockProcess;
    }

    it('should handle stop log capture when session not found', async () => {
      const result = await plugin.handler(
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
      const mockSessionId = 'test-session-123';
      const mockLogFilePath = '/tmp/xcodemcp_device_log_test-session-123.log';
      const mockLogContent = 'Device log content here...';

      // Mock active session
      const mockProcess = createMockProcess({
        killed: false,
        exitCode: null,
      });

      activeDeviceLogSessions.set(mockSessionId, {
        process: mockProcess,
        logFilePath: mockLogFilePath,
        deviceUuid: '00008110-001A2C3D4E5F',
        bundleId: 'com.example.MyApp',
      });

      // Configure mock file system for successful operation
      (mockFileSystem.promises.access as any).configure(false, null);
      (mockFileSystem.promises.readFile as any).configure(false, null, mockLogContent);

      const result = await plugin.handler(
        {
          logSessionId: mockSessionId,
        },
        mockFileSystem,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `✅ Device log capture session stopped successfully\n\nSession ID: ${mockSessionId}\n\n--- Captured Logs ---\n${mockLogContent}`,
          },
        ],
      });
      expect(result.isError).toBeUndefined();
      expect(mockProcess.killCalls).toEqual(['SIGTERM']);
      expect(activeDeviceLogSessions.has(mockSessionId)).toBe(false);
    });

    it('should handle already killed process', async () => {
      const mockSessionId = 'test-session-456';
      const mockLogFilePath = '/tmp/xcodemcp_device_log_test-session-456.log';
      const mockLogContent = 'Device log content...';

      // Mock active session with already killed process
      const mockProcess = createMockProcess({
        killed: true,
        exitCode: 0,
      });

      activeDeviceLogSessions.set(mockSessionId, {
        process: mockProcess,
        logFilePath: mockLogFilePath,
        deviceUuid: '00008110-001A2C3D4E5F',
        bundleId: 'com.example.MyApp',
      });

      // Configure mock file system for successful operation
      (mockFileSystem.promises.access as any).configure(false, null);
      (mockFileSystem.promises.readFile as any).configure(false, null, mockLogContent);

      const result = await plugin.handler(
        {
          logSessionId: mockSessionId,
        },
        mockFileSystem,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `✅ Device log capture session stopped successfully\n\nSession ID: ${mockSessionId}\n\n--- Captured Logs ---\n${mockLogContent}`,
          },
        ],
      });
      expect(mockProcess.killCalls).toEqual([]); // Should not kill already killed process
    });

    it('should handle file access failure', async () => {
      const mockSessionId = 'test-session-789';
      const mockLogFilePath = '/tmp/xcodemcp_device_log_test-session-789.log';

      // Mock active session
      const mockProcess = createMockProcess({
        killed: false,
        exitCode: null,
      });

      activeDeviceLogSessions.set(mockSessionId, {
        process: mockProcess,
        logFilePath: mockLogFilePath,
        deviceUuid: '00008110-001A2C3D4E5F',
        bundleId: 'com.example.MyApp',
      });

      // Configure mock file system for access failure
      (mockFileSystem.promises.access as any).configure(true, new Error('File not found'));

      const result = await plugin.handler(
        {
          logSessionId: mockSessionId,
        },
        mockFileSystem,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `Failed to stop device log capture session ${mockSessionId}: File not found`,
          },
        ],
        isError: true,
      });
      expect(activeDeviceLogSessions.has(mockSessionId)).toBe(false); // Session still removed
    });

    it('should handle file read failure', async () => {
      const mockSessionId = 'test-session-abc';
      const mockLogFilePath = '/tmp/xcodemcp_device_log_test-session-abc.log';

      // Mock active session
      const mockProcess = createMockProcess({
        killed: false,
        exitCode: null,
      });

      activeDeviceLogSessions.set(mockSessionId, {
        process: mockProcess,
        logFilePath: mockLogFilePath,
        deviceUuid: '00008110-001A2C3D4E5F',
        bundleId: 'com.example.MyApp',
      });

      // Configure mock file system for successful access but failed read
      (mockFileSystem.promises.access as any).configure(false, null);
      (mockFileSystem.promises.readFile as any).configure(
        true,
        new Error('Read permission denied'),
        '',
      );

      const result = await plugin.handler(
        {
          logSessionId: mockSessionId,
        },
        mockFileSystem,
      );

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
      const mockProcess = createMockProcess({
        killed: false,
        exitCode: null,
      });

      activeDeviceLogSessions.set(mockSessionId, {
        process: mockProcess,
        logFilePath: mockLogFilePath,
        deviceUuid: '00008110-001A2C3D4E5F',
        bundleId: 'com.example.MyApp',
      });

      // Configure mock file system for access failure with string error
      (mockFileSystem.promises.access as any).configure(true, 'String error message');

      const result = await plugin.handler(
        {
          logSessionId: mockSessionId,
        },
        mockFileSystem,
      );

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
