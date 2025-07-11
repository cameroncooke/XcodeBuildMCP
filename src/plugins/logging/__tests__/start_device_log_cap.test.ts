/**
 * Tests for start_device_log_cap plugin
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import plugin from '../start_device_log_cap.ts';

// Mock logging utilities
vi.mock('../../utils/index.js', () => ({
  log: vi.fn(),
}));

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
}));

// Mock child_process
vi.mock('child_process', () => ({
  spawn: vi.fn(() => ({
    stdout: {
      on: vi.fn(),
      pipe: vi.fn(),
    },
    stderr: {
      on: vi.fn(),
      pipe: vi.fn(),
    },
    on: vi.fn(),
    kill: vi.fn(),
    killed: false,
    exitCode: null,
  })),
}));

// Mock file system
vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    readdir: vi.fn(() => []),
    stat: vi.fn(),
    unlink: vi.fn(),
  },
  createWriteStream: vi.fn(() => ({
    write: vi.fn(),
    end: vi.fn(),
  })),
}));

// Mock os
vi.mock('os', () => ({
  tmpdir: vi.fn(() => '/tmp'),
}));

// Mock path
vi.mock('path', () => ({
  join: vi.fn((...args) => args.join('/')),
}));

describe('start_device_log_cap plugin', () => {
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
      expect(plugin.name).toBe('start_device_log_cap');
    });

    it('should have correct description', () => {
      expect(plugin.description).toBe(
        'Starts capturing logs from a specified Apple device (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro) by launching the app with console output. Returns a session ID.',
      );
    });

    it('should have correct schema structure', () => {
      expect(plugin.schema).toHaveProperty('_def');
      expect(plugin.schema._def.shape()).toHaveProperty('deviceId');
      expect(plugin.schema._def.shape()).toHaveProperty('bundleId');
    });

    it('should have handler as a function', () => {
      expect(typeof plugin.handler).toBe('function');
    });
  });

  describe('Handler Functionality', () => {
    let mockFs, mockSpawn;

    beforeEach(async () => {
      // Get mocked modules
      const fsModule = await import('fs');
      const childProcessModule = await import('child_process');

      mockFs = {
        promises: fsModule.promises,
        createWriteStream: fsModule.createWriteStream,
      };
      mockSpawn = childProcessModule.spawn;
    });

    it('should start log capture successfully', async () => {
      const result = await plugin.handler({
        deviceId: '00008110-001A2C3D4E5F',
        bundleId: 'com.example.MyApp',
      });

      expect(result.content[0].text).toMatch(/✅ Device log capture started successfully/);
      expect(result.content[0].text).toMatch(/Session ID: [a-f0-9-]+/);
      expect(result.isError || false).toBe(false);
    });

    it('should include next steps in success response', async () => {
      const result = await plugin.handler({
        deviceId: '00008110-001A2C3D4E5F',
        bundleId: 'com.example.MyApp',
      });

      expect(result.content[0].text).toContain('Next Steps:');
      expect(result.content[0].text).toContain('Use stop_device_log_cap');
    });

    it('should handle directory creation failure', async () => {
      // Mock mkdir to fail
      mockFs.promises.mkdir.mockRejectedValue(new Error('Permission denied'));

      const result = await plugin.handler({
        deviceId: '00008110-001A2C3D4E5F',
        bundleId: 'com.example.MyApp',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to start device log capture: Permission denied',
          },
        ],
        isError: true,
      });
    });

    it('should handle file write failure', async () => {
      // Mock mkdir to succeed but writeFile to fail
      mockFs.promises.mkdir.mockResolvedValue(undefined);
      mockFs.promises.writeFile.mockRejectedValue(new Error('Disk full'));

      const result = await plugin.handler({
        deviceId: '00008110-001A2C3D4E5F',
        bundleId: 'com.example.MyApp',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to start device log capture: Disk full',
          },
        ],
        isError: true,
      });
    });

    it('should handle spawn process error', async () => {
      // Mock initial steps to succeed
      mockFs.promises.mkdir.mockResolvedValue(undefined);
      mockFs.promises.writeFile.mockResolvedValue(undefined);
      mockFs.createWriteStream.mockReturnValue({
        write: vi.fn(),
        end: vi.fn(),
      });

      // Mock spawn to throw error
      mockSpawn.mockImplementation(() => {
        throw new Error('Command not found');
      });

      const result = await plugin.handler({
        deviceId: '00008110-001A2C3D4E5F',
        bundleId: 'com.example.MyApp',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to start device log capture: Command not found',
          },
        ],
        isError: true,
      });
    });

    it('should handle string error objects', async () => {
      // Mock mkdir to fail with string error
      mockFs.promises.mkdir.mockRejectedValue('String error message');

      const result = await plugin.handler({
        deviceId: '00008110-001A2C3D4E5F',
        bundleId: 'com.example.MyApp',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to start device log capture: String error message',
          },
        ],
        isError: true,
      });
    });

    it('should handle createWriteStream failure', async () => {
      // Mock initial steps to succeed
      mockFs.promises.mkdir.mockResolvedValue(undefined);
      mockFs.promises.writeFile.mockResolvedValue(undefined);

      // Mock createWriteStream to fail
      mockFs.createWriteStream.mockImplementation(() => {
        throw new Error('Stream creation failed');
      });

      const result = await plugin.handler({
        deviceId: '00008110-001A2C3D4E5F',
        bundleId: 'com.example.MyApp',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to start device log capture: Stream creation failed',
          },
        ],
        isError: true,
      });
    });
  });
});
