/**
 * Tests for stop_device_log_cap plugin
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import plugin from './stop_device_log_cap.ts';

// Mock device log utilities
vi.mock('../../src/tools/device-log/index.ts', async () => {
  const actual = await vi.importActual('../../src/tools/device-log/index.ts');
  return {
    ...actual,
    stopDeviceLogCapture: vi.fn().mockResolvedValue({ 
      logContent: 'Mock log content',
      error: undefined 
    }),
  };
});

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
      expect(plugin.description).toBe('Stops an active Apple device log capture session and returns the captured logs.');
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
    it('should handle stop log capture when session not found', async () => {
      const result = await plugin.handler({
        logSessionId: 'device-log-00008110-001A2C3D4E5F-com.example.MyApp',
      });

      expect(result.content[0].text).toBe(
        'Failed to stop device log capture session device-log-00008110-001A2C3D4E5F-com.example.MyApp: Device log capture session not found: device-log-00008110-001A2C3D4E5F-com.example.MyApp',
      );
      expect(result.isError).toBe(true);
    });
  });
});