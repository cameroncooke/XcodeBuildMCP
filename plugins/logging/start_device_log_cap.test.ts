/**
 * Tests for start_device_log_cap plugin
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import plugin from './start_device_log_cap.js';

// Mock device log utilities
vi.mock('../../src/tools/device-log/index.js', async () => {
  const actual = await vi.importActual('../../src/tools/device-log/index.js');
  return {
    ...actual,
    startDeviceLogCapture: vi.fn().mockResolvedValue({ sessionId: 'mock-session' }),
  };
});

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
      expect(plugin.description).toBe('Starts capturing logs from a specified Apple device (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro) by launching the app with console output. Returns a session ID.');
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
  });
});