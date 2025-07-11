/**
 * Tests for start_sim_log_cap plugin
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import plugin from '../start_sim_log_cap.ts';

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-123'),
}));

// Mock file system
vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    readdir: vi.fn(() => []),
    stat: vi.fn(),
    unlink: vi.fn(),
    access: vi.fn(),
    readFile: vi.fn(),
  },
  createWriteStream: vi.fn(() => ({
    write: vi.fn(),
    pipe: vi.fn(),
  })),
  constants: {
    R_OK: 4,
  },
}));

// Mock os
vi.mock('os', () => ({
  tmpdir: vi.fn(() => '/tmp'),
}));

// Mock child_process
vi.mock('child_process', () => ({
  spawn: vi.fn(() => ({
    stdout: {
      pipe: vi.fn(),
    },
    stderr: {
      pipe: vi.fn(),
    },
    on: vi.fn(),
    kill: vi.fn(),
    killed: false,
    exitCode: null,
  })),
}));

// Mock logger
vi.mock('../../utils/logger.js', () => ({
  log: vi.fn(),
}));

describe('start_sim_log_cap plugin', () => {
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
      expect(plugin.name).toBe('start_sim_log_cap');
    });

    it('should have correct description', () => {
      expect(plugin.description).toBe(
        'Starts capturing logs from a specified simulator. Returns a session ID. By default, captures only structured logs.',
      );
    });

    it('should have handler as a function', () => {
      expect(typeof plugin.handler).toBe('function');
    });

    it('should validate schema with valid parameters', () => {
      expect(plugin.schema.simulatorUuid.safeParse('test-uuid').success).toBe(true);
      expect(plugin.schema.bundleId.safeParse('com.example.app').success).toBe(true);
      expect(plugin.schema.captureConsole.safeParse(true).success).toBe(true);
      expect(plugin.schema.captureConsole.safeParse(false).success).toBe(true);
    });

    it('should reject invalid schema parameters', () => {
      expect(plugin.schema.simulatorUuid.safeParse(null).success).toBe(false);
      expect(plugin.schema.simulatorUuid.safeParse(undefined).success).toBe(false);
      expect(plugin.schema.bundleId.safeParse(null).success).toBe(false);
      expect(plugin.schema.bundleId.safeParse(undefined).success).toBe(false);
      expect(plugin.schema.captureConsole.safeParse('yes').success).toBe(false);
      expect(plugin.schema.captureConsole.safeParse(123).success).toBe(false);
    });
  });

  describe('Handler Functionality', () => {
    it('should return error when simulatorUuid validation fails', async () => {
      const result = await plugin.handler({
        simulatorUuid: null,
        bundleId: 'com.example.app',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'simulatorUuid' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should handle null bundleId parameter', async () => {
      // The plugin doesn't validate bundleId, it passes it to startLogCapture
      // This test verifies that null bundleId gets passed through (the actual validation happens in startLogCapture)
      const result = await plugin.handler({
        simulatorUuid: 'test-uuid',
        bundleId: null,
      });

      // Should still attempt to start log capture and succeed with the default mocked behavior
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe(
        "Log capture started successfully. Session ID: test-uuid-123.\n\nNote: Only structured logs are being captured.\n\nNext Steps:\n1.  Interact with your simulator and app.\n2.  Use 'stop_sim_log_cap' with session ID 'test-uuid-123' to stop capture and retrieve logs.",
      );
    });

    it('should return error when log capture fails', async () => {
      // Mock file system error
      const mockFs = await import('fs');
      vi.mocked(mockFs.promises.mkdir).mockRejectedValueOnce(new Error('Permission denied'));

      const result = await plugin.handler({
        simulatorUuid: 'test-uuid',
        bundleId: 'com.example.app',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('Error starting log capture: Permission denied');
    });

    it('should return success with session ID when log capture starts successfully', async () => {
      const result = await plugin.handler({
        simulatorUuid: 'test-uuid',
        bundleId: 'com.example.app',
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe(
        "Log capture started successfully. Session ID: test-uuid-123.\n\nNote: Only structured logs are being captured.\n\nNext Steps:\n1.  Interact with your simulator and app.\n2.  Use 'stop_sim_log_cap' with session ID 'test-uuid-123' to stop capture and retrieve logs.",
      );
    });

    it('should indicate console capture when captureConsole is true', async () => {
      const result = await plugin.handler({
        simulatorUuid: 'test-uuid',
        bundleId: 'com.example.app',
        captureConsole: true,
      });

      expect(result.content[0].text).toBe(
        "Log capture started successfully. Session ID: test-uuid-123.\n\nNote: Your app was relaunched to capture console output.\n\nNext Steps:\n1.  Interact with your simulator and app.\n2.  Use 'stop_sim_log_cap' with session ID 'test-uuid-123' to stop capture and retrieve logs.",
      );
    });

    it('should create correct spawn commands for console capture', async () => {
      const mockChildProcess = await import('child_process');

      await plugin.handler({
        simulatorUuid: 'test-uuid',
        bundleId: 'com.example.app',
        captureConsole: true,
      });

      // Should spawn both console capture and structured log capture
      expect(mockChildProcess.spawn).toHaveBeenCalledTimes(2);
      expect(mockChildProcess.spawn).toHaveBeenCalledWith('xcrun', [
        'simctl',
        'launch',
        '--console-pty',
        '--terminate-running-process',
        'test-uuid',
        'com.example.app',
      ]);
      expect(mockChildProcess.spawn).toHaveBeenCalledWith('xcrun', [
        'simctl',
        'spawn',
        'test-uuid',
        'log',
        'stream',
        '--level=debug',
        '--predicate',
        'subsystem == "com.example.app"',
      ]);
    });

    it('should create correct spawn commands for structured logs only', async () => {
      const mockChildProcess = await import('child_process');

      await plugin.handler({
        simulatorUuid: 'test-uuid',
        bundleId: 'com.example.app',
        captureConsole: false,
      });

      // Should only spawn structured log capture
      expect(mockChildProcess.spawn).toHaveBeenCalledTimes(1);
      expect(mockChildProcess.spawn).toHaveBeenCalledWith('xcrun', [
        'simctl',
        'spawn',
        'test-uuid',
        'log',
        'stream',
        '--level=debug',
        '--predicate',
        'subsystem == "com.example.app"',
      ]);
    });
  });
});
