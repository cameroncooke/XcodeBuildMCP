/**
 * Tests for start_device_log_cap plugin
 * Following CLAUDE.md testing standards with pure dependency injection
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { createMockExecutor, createMockFileSystemExecutor } from '../../../utils/command.js';
import plugin, { start_device_log_capLogic } from '../start_device_log_cap.ts';

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

  // Reset state
  commandCalls = [];
  mkdirCalls = [];
  writeFileCalls = [];

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
      // Schema should be a plain object for MCP protocol compliance
      expect(typeof plugin.schema).toBe('object');
      expect(plugin.schema).toHaveProperty('deviceId');
      expect(plugin.schema).toHaveProperty('bundleId');

      // Validate that schema fields are Zod types that can be used for validation
      const schema = z.object(plugin.schema);
      expect(schema.safeParse({ deviceId: 'test-device', bundleId: 'com.test.app' }).success).toBe(
        true,
      );
      expect(schema.safeParse({ deviceId: 123, bundleId: 'com.test.app' }).success).toBe(false);
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

      const result = await start_device_log_capLogic(
        {
          deviceId: '00008110-001A2C3D4E5F',
          bundleId: 'com.example.MyApp',
        },
        mockExecutor,
        mockFileSystemExecutor,
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

      const result = await start_device_log_capLogic(
        {
          deviceId: '00008110-001A2C3D4E5F',
          bundleId: 'com.example.MyApp',
        },
        mockExecutor,
        mockFileSystemExecutor,
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

      const result = await start_device_log_capLogic(
        {
          deviceId: '00008110-001A2C3D4E5F',
          bundleId: 'com.example.MyApp',
        },
        mockExecutor,
        mockFileSystemExecutor,
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

      const result = await start_device_log_capLogic(
        {
          deviceId: '00008110-001A2C3D4E5F',
          bundleId: 'com.example.MyApp',
        },
        mockExecutor,
        mockFileSystemExecutor,
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

      const result = await start_device_log_capLogic(
        {
          deviceId: '00008110-001A2C3D4E5F',
          bundleId: 'com.example.MyApp',
        },
        mockExecutor,
        mockFileSystemExecutor,
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

      const result = await start_device_log_capLogic(
        {
          deviceId: '00008110-001A2C3D4E5F',
          bundleId: 'com.example.MyApp',
        },
        mockExecutor,
        mockFileSystemExecutor,
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
  });
});
