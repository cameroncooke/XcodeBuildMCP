/**
 * Tests for start_device_log_cap plugin
 * Following CLAUDE.md testing standards with pure dependency injection
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createMockExecutor, createMockFileSystemExecutor } from '../../../utils/command.js';
import plugin from '../start_device_log_cap.ts';

describe('start_device_log_cap plugin', () => {
  // Mock state tracking
  let commandCalls: Array<{
    command: string[];
    logPrefix?: string;
    useShell?: boolean;
    env?: Record<string, string>;
  }> = [];
  let mkdirCalls: string[] = [];
  let writeFileCalls: Array<{ path: string; content: string }> = [];
  let createWriteStreamCalls: Array<{ path: string; flags: string }> = [];
  let writeStreamWriteCalls: string[] = [];
  let mockWriteStream: any;

  beforeEach(() => {
    // Reset state
    commandCalls = [];
    mkdirCalls = [];
    writeFileCalls = [];
    createWriteStreamCalls = [];
    writeStreamWriteCalls = [];

    mockWriteStream = {
      write: (data: string) => {
        writeStreamWriteCalls.push(data);
      },
      flags: 'a',
    };
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
    it('should start log capture successfully', async () => {
      // Mock successful command execution
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'App launched successfully',
      });

      const mockFileSystemExecutor = createMockFileSystemExecutor({
        mkdir: async (path: string) => {
          mkdirCalls.push(path);
        },
        writeFile: async (path: string, content: string) => {
          writeFileCalls.push({ path, content });
        },
      });

      const mockCreateWriteStream = (path: string, options: { flags: string }) => {
        createWriteStreamCalls.push({ path, flags: options.flags });
        return mockWriteStream;
      };

      const result = await plugin.handler(
        {
          deviceId: '00008110-001A2C3D4E5F',
          bundleId: 'com.example.MyApp',
        },
        mockExecutor,
        mockFileSystemExecutor,
        mockCreateWriteStream,
      );

      expect(result.content[0].text).toMatch(/✅ Device log capture started successfully/);
      expect(result.content[0].text).toMatch(/Session ID: [a-f0-9-]{36}/);
      expect(result.isError || false).toBe(false);
    });

    it('should include next steps in success response', async () => {
      // Mock successful command execution
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'App launched successfully',
      });

      const mockFileSystemExecutor = createMockFileSystemExecutor({
        mkdir: async (path: string) => {
          mkdirCalls.push(path);
        },
        writeFile: async (path: string, content: string) => {
          writeFileCalls.push({ path, content });
        },
      });

      const mockCreateWriteStream = (path: string, options: { flags: string }) => {
        createWriteStreamCalls.push({ path, flags: options.flags });
        return mockWriteStream;
      };

      const result = await plugin.handler(
        {
          deviceId: '00008110-001A2C3D4E5F',
          bundleId: 'com.example.MyApp',
        },
        mockExecutor,
        mockFileSystemExecutor,
        mockCreateWriteStream,
      );

      expect(result.content[0].text).toContain('Next Steps:');
      expect(result.content[0].text).toContain('Use stop_device_log_cap');
    });

    it('should handle directory creation failure', async () => {
      // Mock mkdir to fail
      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'Command failed',
      });

      const mockFileSystemExecutor = createMockFileSystemExecutor({
        mkdir: async (path: string) => {
          mkdirCalls.push(path);
          throw new Error('Permission denied');
        },
      });

      const mockCreateWriteStream = (path: string, options: { flags: string }) => {
        createWriteStreamCalls.push({ path, flags: options.flags });
        return mockWriteStream;
      };

      const result = await plugin.handler(
        {
          deviceId: '00008110-001A2C3D4E5F',
          bundleId: 'com.example.MyApp',
        },
        mockExecutor,
        mockFileSystemExecutor,
        mockCreateWriteStream,
      );

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
      // Mock writeFile to fail
      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'Command failed',
      });

      const mockFileSystemExecutor = createMockFileSystemExecutor({
        mkdir: async (path: string) => {
          mkdirCalls.push(path);
        },
        writeFile: async (path: string, content: string) => {
          writeFileCalls.push({ path, content });
          throw new Error('Disk full');
        },
      });

      const mockCreateWriteStream = (path: string, options: { flags: string }) => {
        createWriteStreamCalls.push({ path, flags: options.flags });
        return mockWriteStream;
      };

      const result = await plugin.handler(
        {
          deviceId: '00008110-001A2C3D4E5F',
          bundleId: 'com.example.MyApp',
        },
        mockExecutor,
        mockFileSystemExecutor,
        mockCreateWriteStream,
      );

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
      // Mock spawn to throw error
      const mockExecutor = createMockExecutor(new Error('Command not found'));

      const mockFileSystemExecutor = createMockFileSystemExecutor({
        mkdir: async (path: string) => {
          mkdirCalls.push(path);
        },
        writeFile: async (path: string, content: string) => {
          writeFileCalls.push({ path, content });
        },
      });

      const mockCreateWriteStream = (path: string, options: { flags: string }) => {
        createWriteStreamCalls.push({ path, flags: options.flags });
        return mockWriteStream;
      };

      const result = await plugin.handler(
        {
          deviceId: '00008110-001A2C3D4E5F',
          bundleId: 'com.example.MyApp',
        },
        mockExecutor,
        mockFileSystemExecutor,
        mockCreateWriteStream,
      );

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
      const mockExecutor = createMockExecutor('String error message');

      const mockFileSystemExecutor = createMockFileSystemExecutor({
        mkdir: async (path: string) => {
          mkdirCalls.push(path);
        },
        writeFile: async (path: string, content: string) => {
          writeFileCalls.push({ path, content });
        },
      });

      const mockCreateWriteStream = (path: string, options: { flags: string }) => {
        createWriteStreamCalls.push({ path, flags: options.flags });
        return mockWriteStream;
      };

      const result = await plugin.handler(
        {
          deviceId: '00008110-001A2C3D4E5F',
          bundleId: 'com.example.MyApp',
        },
        mockExecutor,
        mockFileSystemExecutor,
        mockCreateWriteStream,
      );

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
      // Mock createWriteStream to fail
      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'Command failed',
      });

      const mockFileSystemExecutor = createMockFileSystemExecutor({
        mkdir: async (path: string) => {
          mkdirCalls.push(path);
        },
        writeFile: async (path: string, content: string) => {
          writeFileCalls.push({ path, content });
        },
      });

      const mockCreateWriteStream = (path: string, options: { flags: string }) => {
        createWriteStreamCalls.push({ path, flags: options.flags });
        throw new Error('Stream creation failed');
      };

      const result = await plugin.handler(
        {
          deviceId: '00008110-001A2C3D4E5F',
          bundleId: 'com.example.MyApp',
        },
        mockExecutor,
        mockFileSystemExecutor,
        mockCreateWriteStream,
      );

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
