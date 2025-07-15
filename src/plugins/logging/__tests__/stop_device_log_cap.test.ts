/**
 * Tests for stop_device_log_cap plugin
 */
import { describe, it, expect, beforeEach } from 'vitest';
import plugin from '../stop_device_log_cap.ts';
import { activeDeviceLogSessions } from '../start_device_log_cap.ts';

// Note: Logger is allowed to execute normally (integration testing pattern)

// Test file system interface
interface TestFileSystem {
  promises: {
    access: (path: string, mode: number) => Promise<void>;
    readFile: (path: string, encoding: string) => Promise<string>;
  };
  constants: {
    R_OK: number;
  };
}

// Create test file system executor
function createTestFileSystemExecutor(): TestFileSystem {
  let accessCalls: any[] = [];
  let accessShouldThrow = false;
  let accessError: any = null;

  let readFileCalls: any[] = [];
  let readFileShouldThrow = false;
  let readFileError: any = null;
  let readFileContent = '';

  const testFs: TestFileSystem = {
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
  (testFs.promises.access as any).configure = function (shouldThrow: boolean, error: any) {
    accessShouldThrow = shouldThrow;
    accessError = error;
  };

  (testFs.promises.readFile as any).configure = function (
    shouldThrow: boolean,
    error: any,
    content: string,
  ) {
    readFileShouldThrow = shouldThrow;
    readFileError = error;
    readFileContent = content;
  };

  (testFs.promises.access as any).getCalls = () => accessCalls;
  (testFs.promises.readFile as any).getCalls = () => readFileCalls;

  return testFs;
}

describe('stop_device_log_cap plugin', () => {
  let testFileSystem: TestFileSystem;

  beforeEach(() => {
    testFileSystem = createTestFileSystemExecutor();

    // Reset test state
    (testFileSystem.promises.access as any).configure(false, null);
    (testFileSystem.promises.readFile as any).configure(false, null, '');

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
      const result = await plugin.handler(
        {
          logSessionId: 'device-log-00008110-001A2C3D4E5F-com.example.MyApp',
        },
        testFileSystem,
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
      (testFileSystem.promises.access as any).configure(false, null);
      (testFileSystem.promises.readFile as any).configure(false, null, testLogContent);

      const result = await plugin.handler(
        {
          logSessionId: testSessionId,
        },
        testFileSystem,
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
      (testFileSystem.promises.access as any).configure(false, null);
      (testFileSystem.promises.readFile as any).configure(false, null, testLogContent);

      const result = await plugin.handler(
        {
          logSessionId: testSessionId,
        },
        testFileSystem,
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

      // Configure test file system for access failure
      (testFileSystem.promises.access as any).configure(true, new Error('File not found'));

      const result = await plugin.handler(
        {
          logSessionId: testSessionId,
        },
        testFileSystem,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `Failed to stop device log capture session ${testSessionId}: File not found`,
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
      (testFileSystem.promises.access as any).configure(false, null);
      (testFileSystem.promises.readFile as any).configure(
        true,
        new Error('Read permission denied'),
        '',
      );

      const result = await plugin.handler(
        {
          logSessionId: testSessionId,
        },
        testFileSystem,
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
      (testFileSystem.promises.access as any).configure(true, 'String error message');

      const result = await plugin.handler(
        {
          logSessionId: testSessionId,
        },
        testFileSystem,
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
